import { createServerFn } from '@tanstack/react-start'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { inventoryBatches, listings, transferRequests } from '@/lib/schema'
import { writeAudit } from '../audit'
import { getRequestContext } from '../context'
import { AppError, toClientError } from '../errors'
import { requireRole } from '../guards/require-role'
import { requireVerifiedOrg } from '../guards/require-verified-org'
import {
  LISTING_TRANSITIONS,
  TRANSFER_TRANSITIONS,
  assertTransition,
} from '../transitions'
import {
  adminApproveTransferSchema,
  adminRejectTransferSchema,
  cancelTransferSchema,
  requestTransferSchema,
  sellerAcceptSchema,
  sellerDeclineSchema,
} from '../validators/transfers'

const REQUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000

export const requestTransfer = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => requestTransferSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      requireRole(ctx, 'hospital_ngo')
      const { user, org: requesterOrg } = await requireVerifiedOrg(
        ctx,
        data.requesterOrgId,
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

        const [req] = await tx
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
      const admin = requireRole(ctx, 'admin')

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
      const admin = requireRole(ctx, 'admin')

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
      requireRole(ctx, 'pharmacy')

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

        const { user } = await requireVerifiedOrg(ctx, listing.sellerOrgId)
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
      requireRole(ctx, 'pharmacy')

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

        const { user } = await requireVerifiedOrg(ctx, listing.sellerOrgId)
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
      const user = requireRole(ctx, 'hospital_ngo', 'admin')

      const result = await db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(transferRequests)
          .where(eq(transferRequests.id, data.transferRequestId))
          .limit(1)
        if (!before)
          throw new AppError('NOT_FOUND', 'Transfer request not found')

        if (user.role !== 'admin') {
          await requireVerifiedOrg(ctx, before.requesterOrgId)
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
