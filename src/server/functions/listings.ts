import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { inventoryBatches, listings, medicines } from '@/lib/schema'
import { writeAudit } from '../audit'
import { getRequestContext } from '../context'
import { AppError, toClientError } from '../errors'
import { CAPABILITIES, isAdminRole } from '@/lib/permissions'
import { requireAuth } from '../guards/require-auth'
import { requireAdmin } from '../guards/require-admin'
import { requireCapability } from '../guards/require-capability'
import { LISTING_TRANSITIONS, assertTransition } from '../transitions'
import {
  adminApproveListingSchema,
  adminPendingListingsSchema,
  adminRejectListingSchema,
  createListingSchema,
  listActiveListingsSchema,
  submitListingSchema,
  withdrawListingSchema,
} from '../validators/listings'

export const createListing = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => createListingSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()

      const [row] = await db
        .select({
          batch: inventoryBatches,
          medicine: medicines,
        })
        .from(inventoryBatches)
        .innerJoin(medicines, eq(medicines.id, inventoryBatches.medicineId))
        .where(eq(inventoryBatches.id, data.batchId))
        .limit(1)
      if (!row) throw new AppError('NOT_FOUND', 'Batch not found')

      // Capability is on the org that owns the batch — that's the seller org
      // for this listing. The guard verifies membership + verified org +
      // can_list_medicine in one shot (admins bypass).
      const { user } = await requireCapability(
        ctx,
        row.batch.organizationId,
        CAPABILITIES.CAN_LIST_MEDICINE,
      )

      // Defense-in-depth re-checks
      if (row.medicine.isControlled) {
        throw new AppError(
          'CONTROLLED_DRUG',
          'Controlled drugs cannot be listed',
        )
      }
      if (row.medicine.requiresColdChain) {
        throw new AppError(
          'COLD_CHAIN_DRUG',
          'Cold-chain drugs cannot be listed',
        )
      }
      if (row.batch.sealedStatus === 'opened') {
        throw new AppError(
          'OPENED_PACKAGE',
          'Opened batches cannot be listed',
        )
      }
      const today = new Date().toISOString().slice(0, 10)
      if (row.batch.expiryDate <= today) {
        throw new AppError('EXPIRED_MEDICINE', 'Batch is already expired')
      }
      if (data.quantityListed > row.batch.quantityOnHand) {
        throw new AppError(
          'QUANTITY_UNAVAILABLE',
          `Only ${row.batch.quantityOnHand} units available in batch`,
        )
      }

      const created = await db.transaction(async (tx) => {
        const [listing] = await tx
          .insert(listings)
          .values({
            batchId: data.batchId,
            sellerOrgId: row.batch.organizationId,
            quantityListed: data.quantityListed,
            quantityAvailable: data.quantityListed,
            pricePerUnitCents: data.pricePerUnitCents,
            currency: data.currency,
            photoUrls: data.photoUrls,
            notes: data.notes ?? null,
            pickupCity: data.pickupCity,
            pickupCountry: data.pickupCountry,
            status: 'draft',
            createdByUserId: user.id,
          })
          .returning()

        await writeAudit({
          ctx,
          tx,
          action: 'listing.created',
          entityType: 'listing',
          entityId: listing.id,
          after: listing as unknown as Record<string, unknown>,
          actorOrgIdOverride: row.batch.organizationId,
        })
        return listing
      })

      return { ok: true as const, listing: created }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const submitListing = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => submitListingSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()

      const result = await db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(listings)
          .where(eq(listings.id, data.listingId))
          .limit(1)
        if (!before) throw new AppError('NOT_FOUND', 'Listing not found')
        await requireCapability(
          ctx,
          before.sellerOrgId,
          CAPABILITIES.CAN_LIST_MEDICINE,
        )
        assertTransition(LISTING_TRANSITIONS, before.status, 'pending_admin')

        const updated = await tx
          .update(listings)
          .set({
            status: 'pending_admin',
            submittedAt: new Date(),
          })
          .where(
            and(
              eq(listings.id, data.listingId),
              eq(listings.status, 'draft'),
            ),
          )
          .returning()
        if (updated.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Listing status changed concurrently; refresh and try again',
          )
        }
        const after = updated[0]

        await writeAudit({
          ctx,
          tx,
          action: 'listing.submitted',
          entityType: 'listing',
          entityId: after.id,
          before: before as unknown as Record<string, unknown>,
          after: after as unknown as Record<string, unknown>,
          actorOrgIdOverride: before.sellerOrgId,
        })
        return after
      })

      return { ok: true as const, listing: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const withdrawListing = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => withdrawListingSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()

      const result = await db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(listings)
          .where(eq(listings.id, data.listingId))
          .limit(1)
        if (!before) throw new AppError('NOT_FOUND', 'Listing not found')
        await requireCapability(
          ctx,
          before.sellerOrgId,
          CAPABILITIES.CAN_LIST_MEDICINE,
        )
        assertTransition(LISTING_TRANSITIONS, before.status, 'withdrawn')

        if (before.quantityAvailable !== before.quantityListed) {
          throw new AppError(
            'CONFLICT',
            'Cannot withdraw a listing with in-flight transfer requests',
          )
        }

        const updated = await tx
          .update(listings)
          .set({ status: 'withdrawn' })
          .where(
            and(
              eq(listings.id, data.listingId),
              eq(listings.status, before.status),
            ),
          )
          .returning()
        if (updated.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Listing status changed concurrently; refresh and try again',
          )
        }
        const after = updated[0]

        await writeAudit({
          ctx,
          tx,
          action: 'listing.withdrawn',
          entityType: 'listing',
          entityId: after.id,
          before: before as unknown as Record<string, unknown>,
          after: after as unknown as Record<string, unknown>,
          actorOrgIdOverride: before.sellerOrgId,
        })
        return after
      })

      return { ok: true as const, listing: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const adminApproveListing = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => adminApproveListingSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const admin = requireAdmin(ctx)

      const result = await db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(listings)
          .where(eq(listings.id, data.listingId))
          .limit(1)
        if (!before) throw new AppError('NOT_FOUND', 'Listing not found')
        assertTransition(LISTING_TRANSITIONS, before.status, 'active')

        const updated = await tx
          .update(listings)
          .set({
            status: 'active',
            approvedAt: new Date(),
            approvedByUserId: admin.id,
            rejectionReason: null,
          })
          .where(
            and(
              eq(listings.id, data.listingId),
              eq(listings.status, 'pending_admin'),
            ),
          )
          .returning()
        if (updated.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Listing status changed concurrently; refresh and try again',
          )
        }
        const after = updated[0]

        await writeAudit({
          ctx,
          tx,
          action: 'listing.approved',
          entityType: 'listing',
          entityId: after.id,
          before: before as unknown as Record<string, unknown>,
          after: after as unknown as Record<string, unknown>,
          metadata: { notes: data.notes ?? null },
        })
        return after
      })

      return { ok: true as const, listing: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const adminRejectListing = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => adminRejectListingSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      requireAdmin(ctx)

      const result = await db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(listings)
          .where(eq(listings.id, data.listingId))
          .limit(1)
        if (!before) throw new AppError('NOT_FOUND', 'Listing not found')
        assertTransition(LISTING_TRANSITIONS, before.status, 'rejected')

        const updated = await tx
          .update(listings)
          .set({
            status: 'rejected',
            rejectionReason: data.reason,
          })
          .where(
            and(
              eq(listings.id, data.listingId),
              eq(listings.status, 'pending_admin'),
            ),
          )
          .returning()
        if (updated.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Listing status changed concurrently; refresh and try again',
          )
        }
        const after = updated[0]

        await writeAudit({
          ctx,
          tx,
          action: 'listing.rejected',
          entityType: 'listing',
          entityId: after.id,
          before: before as unknown as Record<string, unknown>,
          after: after as unknown as Record<string, unknown>,
          metadata: { reason: data.reason },
        })
        return after
      })

      return { ok: true as const, listing: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const listActiveListings = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => listActiveListingsSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const user = requireAuth(ctx)

      // Browsing the marketplace requires the caller's org to be enabled to
      // request medicine (verified + can_request_medicine). Admins bypass.
      if (!isAdminRole(user.role)) {
        if (!ctx.primaryOrg) {
          throw new AppError('FORBIDDEN', 'Join an organization first')
        }
        await requireCapability(
          ctx,
          ctx.primaryOrg.id,
          CAPABILITIES.CAN_REQUEST_MEDICINE,
        )
      }

      const where = and(
        eq(listings.status, 'active'),
        data.city ? eq(listings.pickupCity, data.city) : undefined,
      )
      const rows = await db
        .select()
        .from(listings)
        .where(where)
        .orderBy(desc(listings.approvedAt))
        .limit(data.limit)
      return { ok: true as const, items: rows }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const adminListPendingListings = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => adminPendingListingsSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      requireAdmin(ctx)

      const rows = await db
        .select()
        .from(listings)
        .where(eq(listings.status, 'pending_admin'))
        .orderBy(listings.submittedAt)
        .limit(data.limit)
      return { ok: true as const, items: rows }
    } catch (e) {
      throw toClientError(e)
    }
  })
