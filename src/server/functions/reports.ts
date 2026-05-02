import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  deliveries,
  inventoryBatches,
  listings,
  organizations,
  transferRequests,
} from '@/lib/schema'
import { isAdminRole } from '@/lib/permissions'
import { getRequestContext } from '../context'
import { toClientError } from '../errors'
import { requireAdmin } from '../guards/require-admin'
import { requireAuth } from '../guards/require-auth'
import { requireOrgMember } from '../guards/require-org'
import { orgScopeSchema } from '../validators/audit'

async function countWhere<T>(
  query: Promise<Array<{ value: T }>>,
): Promise<number> {
  const [{ value }] = await query
  return Number(value ?? 0)
}

/**
 * Admin reporting metrics. All counts are cheap COUNT queries (or one SUM)
 * issued in parallel. Numbers are computed live — there is no aggregation
 * table to maintain.
 *
 * Returned shape is intentionally flat so the dashboard can render each
 * metric in its own card without further reshaping.
 */
export const getAdminReportMetrics = createServerFn({
  method: 'GET',
  strict: { output: false },
}).handler(async () => {
  try {
    const ctx = await getRequestContext()
    requireAdmin(ctx)

    const [
      verifiedOrgs,
      pendingOrgs,
      rejectedOrgs,
      suspendedOrgs,
      activeListings,
      pendingListings,
      pendingTransfers,
      inFlightTransfers,
      completedTransfers,
      failedDeliveries,
      rescuedAndValue,
      donatedUnits,
    ] = await Promise.all([
      countWhere(
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(organizations)
          .where(eq(organizations.verificationStatus, 'verified')),
      ),
      countWhere(
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(organizations)
          .where(eq(organizations.verificationStatus, 'pending')),
      ),
      countWhere(
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(organizations)
          .where(eq(organizations.verificationStatus, 'rejected')),
      ),
      countWhere(
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(organizations)
          .where(eq(organizations.verificationStatus, 'suspended')),
      ),
      countWhere(
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(listings)
          .where(eq(listings.status, 'active')),
      ),
      countWhere(
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(listings)
          .where(eq(listings.status, 'pending_admin')),
      ),
      countWhere(
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(transferRequests)
          .where(
            inArray(transferRequests.status, [
              'pending_admin',
              'pending_seller',
            ]),
          ),
      ),
      countWhere(
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(transferRequests)
          .where(
            inArray(transferRequests.status, [
              'accepted',
              'awaiting_handoff',
              'dispatched',
            ]),
          ),
      ),
      countWhere(
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(transferRequests)
          .where(eq(transferRequests.status, 'completed')),
      ),
      countWhere(
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(deliveries)
          .where(eq(deliveries.status, 'failed')),
      ),
      // SUM rescued units + paid stock value in one pass.
      db
        .select({
          rescuedUnits: sql<number>`COALESCE(SUM(${deliveries.receivedQuantity})::int, 0)`,
          stockValueCents: sql<number>`COALESCE(SUM(${deliveries.receivedQuantity} * ${listings.pricePerUnitCents})::bigint, 0)`,
        })
        .from(deliveries)
        .innerJoin(
          transferRequests,
          eq(transferRequests.id, deliveries.transferRequestId),
        )
        .innerJoin(listings, eq(listings.id, transferRequests.listingId))
        .where(eq(deliveries.status, 'delivered')),
      // Units rescued where pricing was donation (price NULL).
      db
        .select({
          value: sql<number>`COALESCE(SUM(${deliveries.receivedQuantity})::int, 0)`,
        })
        .from(deliveries)
        .innerJoin(
          transferRequests,
          eq(transferRequests.id, deliveries.transferRequestId),
        )
        .innerJoin(listings, eq(listings.id, transferRequests.listingId))
        .where(
          and(
            eq(deliveries.status, 'delivered'),
            sql`${listings.pricePerUnitCents} IS NULL`,
          ),
        )
        .then((r) => Number(r[0]?.value ?? 0)),
    ])

    return {
      ok: true as const,
      organizations: {
        verified: verifiedOrgs,
        pending: pendingOrgs,
        rejected: rejectedOrgs,
        suspended: suspendedOrgs,
      },
      listings: {
        active: activeListings,
        pendingReview: pendingListings,
      },
      transfers: {
        pending: pendingTransfers,
        inFlight: inFlightTransfers,
        completed: completedTransfers,
      },
      deliveries: {
        failed: failedDeliveries,
      },
      impact: {
        unitsRescued: Number(rescuedAndValue[0]?.rescuedUnits ?? 0),
        stockValueSavedCents: Number(rescuedAndValue[0]?.stockValueCents ?? 0),
        donatedUnits,
      },
    }
  } catch (e) {
    throw toClientError(e)
  }
})

/**
 * Org-scoped report metrics. Visible to any org member of the requested org
 * (admins may also view any org). Mirrors the admin dashboard but counts
 * are filtered to where the org is the seller (listings/deliveries) or the
 * requester (transfer requests).
 */
export const getOrgReportMetrics = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => orgScopeSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const actor = requireAuth(ctx)
      if (!isAdminRole(actor.role)) {
        await requireOrgMember(ctx, data.organizationId)
      }

      const [
        myActiveListings,
        myPendingListings,
        myInventoryBatches,
        myOutgoingPending,
        myIncomingPending,
        myCompletedAsSeller,
        myCompletedAsBuyer,
        myFailedDeliveries,
        rescuedAndValue,
      ] = await Promise.all([
        countWhere(
          db
            .select({ value: sql<number>`count(*)::int` })
            .from(listings)
            .where(
              and(
                eq(listings.sellerOrgId, data.organizationId),
                eq(listings.status, 'active'),
              ),
            ),
        ),
        countWhere(
          db
            .select({ value: sql<number>`count(*)::int` })
            .from(listings)
            .where(
              and(
                eq(listings.sellerOrgId, data.organizationId),
                eq(listings.status, 'pending_admin'),
              ),
            ),
        ),
        countWhere(
          db
            .select({ value: sql<number>`count(*)::int` })
            .from(inventoryBatches)
            .where(eq(inventoryBatches.organizationId, data.organizationId)),
        ),
        // Pending requests against my listings (I'm the seller deciding).
        countWhere(
          db
            .select({ value: sql<number>`count(*)::int` })
            .from(transferRequests)
            .innerJoin(
              listings,
              eq(listings.id, transferRequests.listingId),
            )
            .where(
              and(
                eq(listings.sellerOrgId, data.organizationId),
                inArray(transferRequests.status, [
                  'pending_admin',
                  'pending_seller',
                ]),
              ),
            ),
        ),
        // Pending requests I made (I'm the buyer waiting).
        countWhere(
          db
            .select({ value: sql<number>`count(*)::int` })
            .from(transferRequests)
            .where(
              and(
                eq(transferRequests.requesterOrgId, data.organizationId),
                inArray(transferRequests.status, [
                  'pending_admin',
                  'pending_seller',
                ]),
              ),
            ),
        ),
        countWhere(
          db
            .select({ value: sql<number>`count(*)::int` })
            .from(transferRequests)
            .innerJoin(
              listings,
              eq(listings.id, transferRequests.listingId),
            )
            .where(
              and(
                eq(listings.sellerOrgId, data.organizationId),
                eq(transferRequests.status, 'completed'),
              ),
            ),
        ),
        countWhere(
          db
            .select({ value: sql<number>`count(*)::int` })
            .from(transferRequests)
            .where(
              and(
                eq(transferRequests.requesterOrgId, data.organizationId),
                eq(transferRequests.status, 'completed'),
              ),
            ),
        ),
        countWhere(
          db
            .select({ value: sql<number>`count(*)::int` })
            .from(deliveries)
            .innerJoin(
              transferRequests,
              eq(transferRequests.id, deliveries.transferRequestId),
            )
            .innerJoin(
              listings,
              eq(listings.id, transferRequests.listingId),
            )
            .where(
              and(
                eq(deliveries.status, 'failed'),
                sql`(${listings.sellerOrgId} = ${data.organizationId} OR ${transferRequests.requesterOrgId} = ${data.organizationId})`,
              ),
            ),
        ),
        db
          .select({
            rescuedUnits: sql<number>`COALESCE(SUM(${deliveries.receivedQuantity})::int, 0)`,
            stockValueCents: sql<number>`COALESCE(SUM(${deliveries.receivedQuantity} * ${listings.pricePerUnitCents})::bigint, 0)`,
          })
          .from(deliveries)
          .innerJoin(
            transferRequests,
            eq(transferRequests.id, deliveries.transferRequestId),
          )
          .innerJoin(listings, eq(listings.id, transferRequests.listingId))
          .where(
            and(
              eq(deliveries.status, 'delivered'),
              eq(listings.sellerOrgId, data.organizationId),
            ),
          ),
      ])

      return {
        ok: true as const,
        organizationId: data.organizationId,
        listings: {
          active: myActiveListings,
          pendingReview: myPendingListings,
        },
        inventory: {
          batches: myInventoryBatches,
        },
        transfers: {
          pendingAsSeller: myOutgoingPending,
          pendingAsBuyer: myIncomingPending,
          completedAsSeller: myCompletedAsSeller,
          completedAsBuyer: myCompletedAsBuyer,
        },
        deliveries: {
          failed: myFailedDeliveries,
        },
        impact: {
          unitsRescued: Number(rescuedAndValue[0]?.rescuedUnits ?? 0),
          stockValueSavedCents: Number(
            rescuedAndValue[0]?.stockValueCents ?? 0,
          ),
        },
      }
    } catch (e) {
      throw toClientError(e)
    }
  })
