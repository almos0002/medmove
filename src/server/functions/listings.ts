import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, ilike, isNotNull, isNull, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  inventoryBatches,
  listings,
  medicines,
  organizations,
} from '@/lib/schema'
import { writeAudit } from '../audit'
import { getRequestContext } from '../context'
import { AppError, toClientError } from '../errors'
import { CAPABILITIES, isAdminRole } from '@/lib/permissions'
import { requireAuth } from '../guards/require-auth'
import { requireAdmin } from '../guards/require-admin'
import { requireCapability } from '../guards/require-capability'
import { requireOrgMember } from '../guards/require-org'
import { LISTING_TRANSITIONS, assertTransition } from '../transitions'
import {
  adminApproveListingSchema,
  adminListAllListingsSchema,
  adminPendingListingsSchema,
  adminRejectListingSchema,
  createListingSchema,
  getListingSchema,
  listActiveListingsSchema,
  listMyListingsSchema,
  submitListingSchema,
  withdrawListingSchema,
  type ListingExpiryWindow,
  type ListingType,
} from '../validators/listings'

/**
 * SQL fragment for an expiry-window filter against `inventoryBatches.expiryDate`.
 * Mirrors `classifyExpiry` in `src/lib/expiry.ts` (30 / 90 day breakpoints).
 */
function expiryWindowFilter(window: ListingExpiryWindow) {
  switch (window) {
    case 'expired':
      return sql`${inventoryBatches.expiryDate} <= CURRENT_DATE`
    case 'critical':
      return sql`${inventoryBatches.expiryDate} > CURRENT_DATE AND ${inventoryBatches.expiryDate} <= CURRENT_DATE + INTERVAL '30 days'`
    case 'expiring_soon':
      return sql`${inventoryBatches.expiryDate} > CURRENT_DATE + INTERVAL '30 days' AND ${inventoryBatches.expiryDate} <= CURRENT_DATE + INTERVAL '90 days'`
    case 'safe':
      return sql`${inventoryBatches.expiryDate} > CURRENT_DATE + INTERVAL '90 days'`
  }
}

/**
 * SQL fragment for a listing-type filter. Donation = no price (null),
 * Sale = priced (>= 0).
 */
function listingTypeFilter(type: ListingType) {
  return type === 'donation'
    ? isNull(listings.pricePerUnitCents)
    : isNotNull(listings.pricePerUnitCents)
}

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

/**
 * Fetch a single listing with batch + medicine + sellerOrg joined. Used by
 * both the seller detail page and the admin detail page.
 *
 * Auth: any member of the seller org, or any admin. Buyer-side access to
 * active listings happens via marketplace browse, not here.
 */
export const getListing = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => getListingSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const actor = requireAuth(ctx)

      const [row] = await db
        .select({
          listing: listings,
          batch: inventoryBatches,
          medicine: medicines,
          sellerOrg: organizations,
        })
        .from(listings)
        .innerJoin(inventoryBatches, eq(inventoryBatches.id, listings.batchId))
        .innerJoin(medicines, eq(medicines.id, inventoryBatches.medicineId))
        .innerJoin(organizations, eq(organizations.id, listings.sellerOrgId))
        .where(eq(listings.id, data.id))
        .limit(1)
      if (!row) throw new AppError('NOT_FOUND', 'Listing not found')

      if (!isAdminRole(actor.role)) {
        await requireOrgMember(ctx, row.listing.sellerOrgId)
      }
      return { ok: true as const, ...row }
    } catch (e) {
      throw toClientError(e)
    }
  })

/**
 * List a single org's own listings, across all statuses. Mirrors
 * `listInventoryBatches`: read-only, so no capability check — viewing your
 * own pipeline shouldn't depend on the seller flag being currently on.
 */
export const listMyListings = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => listMyListingsSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const actor = requireAuth(ctx)
      if (!isAdminRole(actor.role)) {
        await requireOrgMember(ctx, data.organizationId)
      }

      const where = and(
        eq(listings.sellerOrgId, data.organizationId),
        data.status ? eq(listings.status, data.status) : undefined,
        data.medicineSearch
          ? or(
              ilike(medicines.name, `%${data.medicineSearch}%`),
              ilike(medicines.genericName, `%${data.medicineSearch}%`),
            )
          : undefined,
        data.listingType ? listingTypeFilter(data.listingType) : undefined,
        data.expiryWindow ? expiryWindowFilter(data.expiryWindow) : undefined,
      )

      const rows = await db
        .select({
          listing: listings,
          batch: inventoryBatches,
          medicine: medicines,
        })
        .from(listings)
        .innerJoin(inventoryBatches, eq(inventoryBatches.id, listings.batchId))
        .innerJoin(medicines, eq(medicines.id, inventoryBatches.medicineId))
        .where(where)
        .orderBy(desc(listings.updatedAt))
        .limit(data.limit)

      return { ok: true as const, items: rows, total: rows.length }
    } catch (e) {
      throw toClientError(e)
    }
  })

/**
 * Admin browse-all view of listings, with status / medicine / org filters.
 * Defaults to most-recently-submitted-first. Used by the admin queue page,
 * which can also surface non-pending listings for audit/support.
 */
export const adminListAllListings = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => adminListAllListingsSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      requireAdmin(ctx)

      const where = and(
        data.status ? eq(listings.status, data.status) : undefined,
        data.medicineSearch
          ? or(
              ilike(medicines.name, `%${data.medicineSearch}%`),
              ilike(medicines.genericName, `%${data.medicineSearch}%`),
            )
          : undefined,
        data.orgSearch
          ? ilike(organizations.name, `%${data.orgSearch}%`)
          : undefined,
        data.listingType ? listingTypeFilter(data.listingType) : undefined,
        data.expiryWindow ? expiryWindowFilter(data.expiryWindow) : undefined,
      )

      const rows = await db
        .select({
          listing: listings,
          batch: inventoryBatches,
          medicine: medicines,
          sellerOrg: organizations,
        })
        .from(listings)
        .innerJoin(inventoryBatches, eq(inventoryBatches.id, listings.batchId))
        .innerJoin(medicines, eq(medicines.id, inventoryBatches.medicineId))
        .innerJoin(organizations, eq(organizations.id, listings.sellerOrgId))
        .where(where)
        .orderBy(
          desc(listings.submittedAt),
          desc(listings.updatedAt),
        )
        .limit(data.limit)

      return { ok: true as const, items: rows, total: rows.length }
    } catch (e) {
      throw toClientError(e)
    }
  })
