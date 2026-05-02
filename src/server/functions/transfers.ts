import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/lib/db'
import {
  inventoryBatches,
  listings,
  medicines,
  organizationMembers,
  organizations,
  transferRequests,
} from '@/lib/schema'
import { writeAudit } from '../audit'
import { getRequestContext } from '../context'
import { AppError, toClientError } from '../errors'
import { CAPABILITIES, isAdminRole } from '@/lib/permissions'
import { requireAuth } from '../guards/require-auth'
import { requireAdmin } from '../guards/require-admin'
import { requireCapability } from '../guards/require-capability'
import { requireOrgMember } from '../guards/require-org'
import {
  LISTING_TRANSITIONS,
  TRANSFER_TRANSITIONS,
  assertTransition,
} from '../transitions'
import {
  adminApproveTransferSchema,
  adminListTransferRequestsSchema,
  adminRejectTransferSchema,
  cancelTransferSchema,
  getTransferRequestSchema,
  listMyTransferRequestsSchema,
  requestTransferSchema,
  sellerAcceptSchema,
  sellerDeclineSchema,
  type TransferRequestStatus,
} from '../validators/transfers'
import type { ListingExpiryWindow } from '../validators/listings'

/**
 * SQL fragment for an expiry-window filter against `inventoryBatches.expiryDate`.
 * Mirrors `expiryWindowFilter` in `functions/listings.ts`.
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
 * Transfer-request statuses that count as "still in flight" for the purpose
 * of duplicate-request prevention and the buyer-side existing-request hint
 * on the marketplace listing detail page.
 */
const ACTIVE_REQUEST_STATUSES: TransferRequestStatus[] = [
  'pending_admin',
  'pending_seller',
  'accepted',
  'awaiting_handoff',
  'dispatched',
]

const REQUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000

export const requestTransfer = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => requestTransferSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      // Requesting medicine requires the requester org to be enabled for it.
      const { user, org: requesterOrg } = await requireCapability(
        ctx,
        data.requesterOrgId,
        CAPABILITIES.CAN_REQUEST_MEDICINE,
      )

      const result = await db.transaction(async (tx) => {
        const [listing] = await tx
          .select()
          .from(listings)
          .where(eq(listings.id, data.listingId))
          .limit(1)
        if (!listing) throw new AppError('NOT_FOUND', 'Listing not found')
        if (listing.status !== 'active') {
          throw new AppError(
            'CONFLICT',
            `Listing is not available (status: ${listing.status})`,
          )
        }
        if (listing.sellerOrgId === requesterOrg.id) {
          throw new AppError('FORBIDDEN', 'Cannot request your own listing')
        }
        if (data.quantityRequested > listing.quantityAvailable) {
          throw new AppError(
            'QUANTITY_UNAVAILABLE',
            `Only ${listing.quantityAvailable} units currently available`,
          )
        }

        // Block duplicate active requests from the same org against the same
        // listing — keeps the buyer surface clean and prevents accidental
        // double-submits when the form is re-submitted.
        const dup = await tx
          .select({ id: transferRequests.id })
          .from(transferRequests)
          .where(
            and(
              eq(transferRequests.listingId, data.listingId),
              eq(transferRequests.requesterOrgId, requesterOrg.id),
              inArray(
                transferRequests.status,
                ACTIVE_REQUEST_STATUSES,
              ),
            ),
          )
          .limit(1)
        if (dup.length > 0) {
          throw new AppError(
            'CONFLICT',
            'You already have an active transfer request for this listing',
          )
        }

        let req
        try {
          ;[req] = await tx
            .insert(transferRequests)
            .values({
              listingId: data.listingId,
              requesterOrgId: requesterOrg.id,
              requesterUserId: user.id,
              quantityRequested: data.quantityRequested,
              intendedUse: data.intendedUse,
              status: 'pending_admin',
              expiresAt: new Date(Date.now() + REQUEST_TTL_MS),
            })
            .returning()
        } catch (insertErr) {
          // Race-safe backstop: the partial unique index
          // `transfer_requests_active_uq` will fire if two concurrent
          // submits both passed the SELECT above. Surface the same friendly
          // CONFLICT we use for the synchronous duplicate check.
          if (
            insertErr &&
            typeof insertErr === 'object' &&
            'code' in insertErr &&
            (insertErr as { code?: string }).code === '23505' &&
            'constraint' in insertErr &&
            (insertErr as { constraint?: string }).constraint ===
              'transfer_requests_active_uq'
          ) {
            throw new AppError(
              'CONFLICT',
              'You already have an active transfer request for this listing',
            )
          }
          throw insertErr
        }

        await writeAudit({
          ctx,
          tx,
          action: 'transfer_request.created',
          entityType: 'transfer_request',
          entityId: req.id,
          after: req as unknown as Record<string, unknown>,
          actorOrgIdOverride: requesterOrg.id,
        })
        return req
      })

      return { ok: true as const, request: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const adminApproveTransfer = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => adminApproveTransferSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const admin = requireAdmin(ctx)

      const result = await db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(transferRequests)
          .where(eq(transferRequests.id, data.transferRequestId))
          .limit(1)
        if (!before)
          throw new AppError('NOT_FOUND', 'Transfer request not found')
        assertTransition(
          TRANSFER_TRANSITIONS,
          before.status,
          'pending_seller',
        )

        const updated = await tx
          .update(transferRequests)
          .set({
            status: 'pending_seller',
            adminReviewedByUserId: admin.id,
            adminReviewedAt: new Date(),
            adminReviewNotes: data.notes ?? null,
          })
          .where(
            and(
              eq(transferRequests.id, data.transferRequestId),
              eq(transferRequests.status, 'pending_admin'),
            ),
          )
          .returning()
        if (updated.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Transfer request status changed concurrently; refresh and try again',
          )
        }
        const after = updated[0]

        await writeAudit({
          ctx,
          tx,
          action: 'transfer_request.admin_approved',
          entityType: 'transfer_request',
          entityId: after.id,
          before: before as unknown as Record<string, unknown>,
          after: after as unknown as Record<string, unknown>,
        })
        return after
      })
      return { ok: true as const, request: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const adminRejectTransfer = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => adminRejectTransferSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const admin = requireAdmin(ctx)

      const result = await db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(transferRequests)
          .where(eq(transferRequests.id, data.transferRequestId))
          .limit(1)
        if (!before)
          throw new AppError('NOT_FOUND', 'Transfer request not found')
        assertTransition(TRANSFER_TRANSITIONS, before.status, 'rejected')

        const updated = await tx
          .update(transferRequests)
          .set({
            status: 'rejected',
            adminReviewedByUserId: admin.id,
            adminReviewedAt: new Date(),
            adminReviewNotes: data.reason,
          })
          .where(
            and(
              eq(transferRequests.id, data.transferRequestId),
              eq(transferRequests.status, 'pending_admin'),
            ),
          )
          .returning()
        if (updated.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Transfer request status changed concurrently; refresh and try again',
          )
        }
        const after = updated[0]

        await writeAudit({
          ctx,
          tx,
          action: 'transfer_request.admin_rejected',
          entityType: 'transfer_request',
          entityId: after.id,
          before: before as unknown as Record<string, unknown>,
          after: after as unknown as Record<string, unknown>,
          metadata: { reason: data.reason },
        })
        return after
      })
      return { ok: true as const, request: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const sellerAcceptTransfer = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => sellerAcceptSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()

      const result = await db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(transferRequests)
          .where(eq(transferRequests.id, data.transferRequestId))
          .limit(1)
        if (!before)
          throw new AppError('NOT_FOUND', 'Transfer request not found')

        const [row] = await tx
          .select({
            listing: listings,
            batch: inventoryBatches,
          })
          .from(listings)
          .innerJoin(
            inventoryBatches,
            eq(inventoryBatches.id, listings.batchId),
          )
          .where(eq(listings.id, before.listingId))
          .limit(1)
        if (!row) throw new AppError('NOT_FOUND', 'Listing missing')
        const { listing, batch } = row

        // Accepting on behalf of the seller org requires can_list_medicine.
        const { user } = await requireCapability(
          ctx,
          listing.sellerOrgId,
          CAPABILITIES.CAN_LIST_MEDICINE,
        )
        assertTransition(TRANSFER_TRANSITIONS, before.status, 'accepted')

        // MVP safety re-check at execution time (the wall clock advances).
        const today = new Date().toISOString().slice(0, 10)
        if (batch.expiryDate <= today) {
          throw new AppError(
            'EXPIRED_MEDICINE',
            'Batch has expired since the request was created',
          )
        }
        if (batch.sealedStatus === 'opened') {
          throw new AppError(
            'OPENED_PACKAGE',
            'Batch is no longer sealed; cannot accept transfer',
          )
        }

        // Race-safe atomic decrement: guard by listing.status AND sufficient qty.
        const decremented = await tx
          .update(listings)
          .set({
            quantityAvailable: sql`${listings.quantityAvailable} - ${before.quantityRequested}`,
          })
          .where(
            and(
              eq(listings.id, listing.id),
              eq(listings.status, 'active'),
              sql`${listings.quantityAvailable} >= ${before.quantityRequested}`,
            ),
          )
          .returning()
        if (decremented.length === 0) {
          throw new AppError(
            'QUANTITY_UNAVAILABLE',
            'Listing changed concurrently or insufficient quantity; refresh and try again',
          )
        }
        const updatedListing = decremented[0]

        // Atomic flip to sold_out (idempotent within this transaction).
        let flippedToSoldOut = false
        if (updatedListing.quantityAvailable === 0) {
          assertTransition(
            LISTING_TRANSITIONS,
            updatedListing.status,
            'sold_out',
          )
          const flipped = await tx
            .update(listings)
            .set({ status: 'sold_out' })
            .where(
              and(
                eq(listings.id, updatedListing.id),
                eq(listings.status, 'active'),
              ),
            )
            .returning()
          if (flipped.length === 0) {
            throw new AppError(
              'CONFLICT',
              'Listing status changed concurrently during sold-out flip',
            )
          }
          flippedToSoldOut = true
        }

        // Atomic guarded transition on the transfer request itself.
        const updatedReq = await tx
          .update(transferRequests)
          .set({
            status: 'accepted',
            sellerReviewedByUserId: user.id,
            sellerReviewedAt: new Date(),
            sellerReviewNotes: data.notes ?? null,
          })
          .where(
            and(
              eq(transferRequests.id, data.transferRequestId),
              eq(transferRequests.status, 'pending_seller'),
            ),
          )
          .returning()
        if (updatedReq.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Transfer request status changed concurrently; refresh and try again',
          )
        }
        const after = updatedReq[0]

        await writeAudit({
          ctx,
          tx,
          action: 'transfer_request.seller_accepted',
          entityType: 'transfer_request',
          entityId: after.id,
          before: before as unknown as Record<string, unknown>,
          after: after as unknown as Record<string, unknown>,
          actorOrgIdOverride: listing.sellerOrgId,
        })
        await writeAudit({
          ctx,
          tx,
          action: 'listing.quantity_decremented',
          entityType: 'listing',
          entityId: listing.id,
          metadata: {
            delta: -before.quantityRequested,
            reason: 'transfer_accepted',
            transferRequestId: after.id,
          },
          actorOrgIdOverride: listing.sellerOrgId,
        })
        if (flippedToSoldOut) {
          await writeAudit({
            ctx,
            tx,
            action: 'listing.sold_out',
            entityType: 'listing',
            entityId: listing.id,
            before: { status: 'active' } as Record<string, unknown>,
            after: { status: 'sold_out' } as Record<string, unknown>,
            metadata: { reason: 'quantity_exhausted' },
            actorOrgIdOverride: listing.sellerOrgId,
          })
        }
        return after
      })

      return { ok: true as const, request: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const sellerDeclineTransfer = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => sellerDeclineSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()

      const result = await db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(transferRequests)
          .where(eq(transferRequests.id, data.transferRequestId))
          .limit(1)
        if (!before)
          throw new AppError('NOT_FOUND', 'Transfer request not found')

        const [listing] = await tx
          .select()
          .from(listings)
          .where(eq(listings.id, before.listingId))
          .limit(1)
        if (!listing) throw new AppError('NOT_FOUND', 'Listing missing')

        const { user } = await requireCapability(
          ctx,
          listing.sellerOrgId,
          CAPABILITIES.CAN_LIST_MEDICINE,
        )
        assertTransition(TRANSFER_TRANSITIONS, before.status, 'declined')

        const updated = await tx
          .update(transferRequests)
          .set({
            status: 'declined',
            sellerReviewedByUserId: user.id,
            sellerReviewedAt: new Date(),
            sellerReviewNotes: data.reason,
          })
          .where(
            and(
              eq(transferRequests.id, data.transferRequestId),
              eq(transferRequests.status, 'pending_seller'),
            ),
          )
          .returning()
        if (updated.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Transfer request status changed concurrently; refresh and try again',
          )
        }
        const after = updated[0]

        await writeAudit({
          ctx,
          tx,
          action: 'transfer_request.seller_declined',
          entityType: 'transfer_request',
          entityId: after.id,
          before: before as unknown as Record<string, unknown>,
          after: after as unknown as Record<string, unknown>,
          actorOrgIdOverride: listing.sellerOrgId,
          metadata: { reason: data.reason },
        })
        return after
      })

      return { ok: true as const, request: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const cancelTransfer = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => cancelTransferSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const user = requireAuth(ctx)

      const result = await db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(transferRequests)
          .where(eq(transferRequests.id, data.transferRequestId))
          .limit(1)
        if (!before)
          throw new AppError('NOT_FOUND', 'Transfer request not found')

        // Cancellation authorisation: admins always; otherwise the caller
        // must be a member of the requester org (capability check is not
        // required for cancellation — once a request is created, the org
        // should always be able to retract it even if its capability has
        // since been disabled).
        if (!isAdminRole(user.role)) {
          await requireOrgMember(ctx, before.requesterOrgId)
        }

        const cancellableFrom = [
          'pending_admin',
          'pending_seller',
          'accepted',
          'awaiting_handoff',
        ]
        if (!cancellableFrom.includes(before.status)) {
          throw new AppError(
            'INVALID_TRANSITION',
            `Cannot cancel a transfer in status '${before.status}'`,
          )
        }
        assertTransition(TRANSFER_TRANSITIONS, before.status, 'cancelled')

        const wasReserving = ['accepted', 'awaiting_handoff'].includes(
          before.status,
        )

        // Atomic guarded request transition (prevents double-cancel).
        const updated = await tx
          .update(transferRequests)
          .set({
            status: 'cancelled',
            cancellationReason: data.reason,
          })
          .where(
            and(
              eq(transferRequests.id, data.transferRequestId),
              eq(transferRequests.status, before.status),
            ),
          )
          .returning()
        if (updated.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Transfer request status changed concurrently; refresh and try again',
          )
        }
        const after = updated[0]

        let qtyRestoredAt: Date | null = null
        let listingRebumped = false
        if (wasReserving) {
          // Restore reserved quantity to the listing.
          await tx
            .update(listings)
            .set({
              quantityAvailable: sql`${listings.quantityAvailable} + ${before.quantityRequested}`,
            })
            .where(eq(listings.id, before.listingId))
          qtyRestoredAt = new Date()

          // Atomically re-open if it was sold_out (guarded transition for symmetry
          // with the rest of the lifecycle).
          const [postBump] = await tx
            .select({ status: listings.status })
            .from(listings)
            .where(eq(listings.id, before.listingId))
            .limit(1)
          if (postBump?.status === 'sold_out') {
            assertTransition(LISTING_TRANSITIONS, 'sold_out', 'active')
            const rebumped = await tx
              .update(listings)
              .set({ status: 'active' })
              .where(
                and(
                  eq(listings.id, before.listingId),
                  eq(listings.status, 'sold_out'),
                  sql`${listings.quantityAvailable} > 0`,
                ),
              )
              .returning()
            listingRebumped = rebumped.length > 0
          }
        }

        await writeAudit({
          ctx,
          tx,
          action: 'transfer_request.cancelled',
          entityType: 'transfer_request',
          entityId: after.id,
          before: before as unknown as Record<string, unknown>,
          after: after as unknown as Record<string, unknown>,
          metadata: { reason: data.reason, byRole: user.role },
        })
        if (qtyRestoredAt) {
          await writeAudit({
            ctx,
            tx,
            action: 'listing.quantity_restored',
            entityType: 'listing',
            entityId: before.listingId,
            metadata: {
              delta: before.quantityRequested,
              reason: 'transfer_cancelled',
              transferRequestId: after.id,
            },
          })
        }
        if (listingRebumped) {
          await writeAudit({
            ctx,
            tx,
            action: 'listing.reopened',
            entityType: 'listing',
            entityId: before.listingId,
            before: { status: 'sold_out' } as Record<string, unknown>,
            after: { status: 'active' } as Record<string, unknown>,
            metadata: { reason: 'quantity_restored_after_cancel' },
          })
        }
        return after
      })

      return { ok: true as const, request: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

/**
 * Fetch a single transfer request with listing + batch + medicine + both
 * organizations joined. Visible to admins, members of the requester org, and
 * members of the seller org. Used by both org and admin detail pages.
 */
export const getTransferRequest = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => getTransferRequestSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const actor = requireAuth(ctx)

      const requesterOrgT = alias(organizations, 'requester_org')
      const sellerOrgT = alias(organizations, 'seller_org')

      const [row] = await db
        .select({
          request: transferRequests,
          listing: listings,
          batch: inventoryBatches,
          medicine: medicines,
          requesterOrg: requesterOrgT,
          sellerOrg: sellerOrgT,
        })
        .from(transferRequests)
        .innerJoin(listings, eq(listings.id, transferRequests.listingId))
        .innerJoin(
          inventoryBatches,
          eq(inventoryBatches.id, listings.batchId),
        )
        .innerJoin(medicines, eq(medicines.id, inventoryBatches.medicineId))
        .innerJoin(
          requesterOrgT,
          eq(requesterOrgT.id, transferRequests.requesterOrgId),
        )
        .innerJoin(sellerOrgT, eq(sellerOrgT.id, listings.sellerOrgId))
        .where(eq(transferRequests.id, data.id))
        .limit(1)
      if (!row) throw new AppError('NOT_FOUND', 'Transfer request not found')

      if (!isAdminRole(actor.role)) {
        // Single membership query checking either org in one round-trip.
        const memberships = await db
          .select({ orgId: organizationMembers.organizationId })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.userId, actor.id),
              inArray(organizationMembers.organizationId, [
                row.request.requesterOrgId,
                row.listing.sellerOrgId,
              ]),
            ),
          )
          .limit(1)
        if (memberships.length === 0) {
          throw new AppError(
            'FORBIDDEN',
            'Not allowed to view this transfer request',
          )
        }
      }
      return { ok: true as const, ...row }
    } catch (e) {
      throw toClientError(e)
    }
  })

/**
 * List the caller org's outgoing transfer requests, with status / medicine /
 * expiry filters. Read-only — like `listMyListings`, no capability gate.
 */
export const listMyTransferRequests = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => listMyTransferRequestsSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const actor = requireAuth(ctx)
      if (!isAdminRole(actor.role)) {
        await requireOrgMember(ctx, data.organizationId)
      }

      const where = and(
        eq(transferRequests.requesterOrgId, data.organizationId),
        data.status ? eq(transferRequests.status, data.status) : undefined,
        data.medicineSearch
          ? or(
              ilike(medicines.name, `%${data.medicineSearch}%`),
              ilike(medicines.genericName, `%${data.medicineSearch}%`),
            )
          : undefined,
        data.expiryWindow ? expiryWindowFilter(data.expiryWindow) : undefined,
      )

      const rows = await db
        .select({
          request: transferRequests,
          listing: listings,
          batch: inventoryBatches,
          medicine: medicines,
          sellerOrg: organizations,
        })
        .from(transferRequests)
        .innerJoin(listings, eq(listings.id, transferRequests.listingId))
        .innerJoin(
          inventoryBatches,
          eq(inventoryBatches.id, listings.batchId),
        )
        .innerJoin(medicines, eq(medicines.id, inventoryBatches.medicineId))
        .innerJoin(organizations, eq(organizations.id, listings.sellerOrgId))
        .where(where)
        .orderBy(desc(transferRequests.createdAt))
        .limit(data.limit)

      return { ok: true as const, items: rows, total: rows.length }
    } catch (e) {
      throw toClientError(e)
    }
  })

/**
 * Admin-wide queue of transfer requests, with optional status / medicine /
 * requester / seller / expiry filters. Defaults to most-recently-submitted
 * first. Used by `/admin/requests` (which defaults the status filter to
 * `pending_admin`).
 */
export const adminListTransferRequests = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => adminListTransferRequestsSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      requireAdmin(ctx)

      const requesterOrgT = alias(organizations, 'requester_org')
      const sellerOrgT = alias(organizations, 'seller_org')

      const where = and(
        data.status ? eq(transferRequests.status, data.status) : undefined,
        data.medicineSearch
          ? or(
              ilike(medicines.name, `%${data.medicineSearch}%`),
              ilike(medicines.genericName, `%${data.medicineSearch}%`),
            )
          : undefined,
        data.requesterOrgSearch
          ? ilike(requesterOrgT.name, `%${data.requesterOrgSearch}%`)
          : undefined,
        data.sellerOrgSearch
          ? ilike(sellerOrgT.name, `%${data.sellerOrgSearch}%`)
          : undefined,
        data.expiryWindow ? expiryWindowFilter(data.expiryWindow) : undefined,
      )

      const rows = await db
        .select({
          request: transferRequests,
          listing: listings,
          batch: inventoryBatches,
          medicine: medicines,
          requesterOrg: requesterOrgT,
          sellerOrg: sellerOrgT,
        })
        .from(transferRequests)
        .innerJoin(listings, eq(listings.id, transferRequests.listingId))
        .innerJoin(
          inventoryBatches,
          eq(inventoryBatches.id, listings.batchId),
        )
        .innerJoin(medicines, eq(medicines.id, inventoryBatches.medicineId))
        .innerJoin(
          requesterOrgT,
          eq(requesterOrgT.id, transferRequests.requesterOrgId),
        )
        .innerJoin(sellerOrgT, eq(sellerOrgT.id, listings.sellerOrgId))
        .where(where)
        .orderBy(desc(transferRequests.createdAt))
        .limit(data.limit)

      return { ok: true as const, items: rows, total: rows.length }
    } catch (e) {
      throw toClientError(e)
    }
  })
