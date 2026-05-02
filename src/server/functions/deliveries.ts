import { createServerFn } from '@tanstack/react-start'
import {
  alias,
} from 'drizzle-orm/pg-core'
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  deliveries,
  inventoryBatches,
  listings,
  medicines,
  organizationMembers,
  organizations,
  transferRequests,
} from '@/lib/schema'
import { user as userTable } from '@/lib/auth-schema'
import {
  CAPABILITIES,
  ORG_TYPES,
  ROLES,
  hasCapability,
  isAdminRole,
} from '@/lib/permissions'
import { writeAudit } from '../audit'
import {
  createForOrg,
  dispatchNotificationsAfterCommit,
} from '../notifications'
import type { NotificationRow } from '../notifications'
import { getRequestContext } from '../context'
import { AppError, toClientError } from '../errors'
import { requireAuth } from '../guards/require-auth'
import { requireAdmin } from '../guards/require-admin'
import { requireCapability } from '../guards/require-capability'
import { requireOrgMember } from '../guards/require-org'
import {
  DELIVERY_TRANSITIONS,
  LISTING_TRANSITIONS,
  TRANSFER_TRANSITIONS,
  assertTransition,
} from '../transitions'
import {
  adminCreateDeliverySchema,
  adminListDeliveriesSchema,
  assignDeliveryLogisticsSchema,
  cancelDeliverySchema,
  confirmDeliverySchema,
  disputeDeliverySchema,
  getDeliverySchema,
  listAssignedDeliveriesSchema,
  listLogisticsCandidatesSchema,
  listOrgDeliveriesSchema,
  markDeliveryFailedSchema,
  markInTransitSchema,
  markPickedUpSchema,
  schedulePickupSchema,
} from '../validators/deliveries'

// ─── Aliases for joined reads ──────────────────────────────────────────────
const sellerOrgAlias = alias(organizations, 'seller_org')
const requesterOrgAlias = alias(organizations, 'requester_org')
const logisticsOrgAlias = alias(organizations, 'logistics_org')
const logisticsUserAlias = alias(userTable, 'logistics_user')

/**
 * Standard joined SELECT — used by `getDelivery` and the list endpoints. The
 * shape mirrors `transferRequests.getTransferRequest` so the UI can lean on
 * the same field names.
 */
function selectDeliveryJoinedColumns() {
  return {
    delivery: deliveries,
    request: transferRequests,
    listing: listings,
    batch: inventoryBatches,
    medicine: medicines,
    sellerOrg: {
      id: sellerOrgAlias.id,
      name: sellerOrgAlias.name,
      type: sellerOrgAlias.type,
    },
    requesterOrg: {
      id: requesterOrgAlias.id,
      name: requesterOrgAlias.name,
      type: requesterOrgAlias.type,
    },
    logisticsOrg: {
      id: logisticsOrgAlias.id,
      name: logisticsOrgAlias.name,
      type: logisticsOrgAlias.type,
    },
    logisticsUser: {
      id: logisticsUserAlias.id,
      email: logisticsUserAlias.email,
      name: logisticsUserAlias.name,
    },
  }
}

function deliveryJoinedQuery() {
  return db
    .select(selectDeliveryJoinedColumns())
    .from(deliveries)
    .innerJoin(
      transferRequests,
      eq(transferRequests.id, deliveries.transferRequestId),
    )
    .innerJoin(listings, eq(listings.id, transferRequests.listingId))
    .innerJoin(inventoryBatches, eq(inventoryBatches.id, listings.batchId))
    .innerJoin(medicines, eq(medicines.id, inventoryBatches.medicineId))
    .innerJoin(sellerOrgAlias, eq(sellerOrgAlias.id, listings.sellerOrgId))
    .innerJoin(
      requesterOrgAlias,
      eq(requesterOrgAlias.id, transferRequests.requesterOrgId),
    )
    .leftJoin(
      logisticsOrgAlias,
      eq(logisticsOrgAlias.id, deliveries.assignedLogisticsOrgId),
    )
    .leftJoin(
      logisticsUserAlias,
      eq(logisticsUserAlias.id, deliveries.assignedLogisticsUserId),
    )
}

// ─── Internal authorization helpers ────────────────────────────────────────
type DeliveryRow = typeof deliveries.$inferSelect
type RequestRow = typeof transferRequests.$inferSelect

/**
 * Allows admin OR the per-row assigned logistics user (whose role must still
 * be LOGISTICS_STAFF and, if a logistics org is recorded, who must still be
 * a member of it). Other org-level capability fall-throughs are intentionally
 * omitted — Step 10 routes courier actions exclusively through the per-row
 * assignment to keep authorization auditable.
 */
async function requireDeliveryCourier(
  delivery: DeliveryRow,
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
) {
  const ctx = await getRequestContext()
  const actor = requireAuth(ctx)
  if (isAdminRole(actor.role)) return { ctx, actor }

  if (
    actor.role !== ROLES.LOGISTICS_STAFF ||
    !delivery.assignedLogisticsUserId ||
    delivery.assignedLogisticsUserId !== actor.id
  ) {
    throw new AppError(
      'FORBIDDEN',
      'Only the assigned logistics_staff user or an admin can perform this action',
    )
  }
  if (delivery.assignedLogisticsOrgId) {
    const [stillMember] = await tx
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, actor.id),
          eq(
            organizationMembers.organizationId,
            delivery.assignedLogisticsOrgId,
          ),
        ),
      )
      .limit(1)
    if (!stillMember) {
      throw new AppError(
        'FORBIDDEN',
        'You are no longer a member of the assigned logistics organisation',
      )
    }
  }
  return { ctx, actor }
}

// ──────────────────────────────────────────────────────────────────────────
// adminCreateDelivery — admin promotes an `accepted` request to a delivery.
// ──────────────────────────────────────────────────────────────────────────
export const adminCreateDelivery = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => adminCreateDeliverySchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const admin = requireAdmin(ctx)

      const notifs: NotificationRow[] = []
      const result = await db.transaction(async (tx) => {
        const [request] = await tx
          .select()
          .from(transferRequests)
          .where(eq(transferRequests.id, data.transferRequestId))
          .limit(1)
        if (!request)
          throw new AppError('NOT_FOUND', 'Transfer request not found')

        const [listing] = await tx
          .select()
          .from(listings)
          .where(eq(listings.id, request.listingId))
          .limit(1)
        if (!listing) throw new AppError('NOT_FOUND', 'Listing missing')

        if (request.status !== 'accepted') {
          throw new AppError(
            'INVALID_TRANSITION',
            `Cannot create delivery for request in status '${request.status}'`,
          )
        }
        assertTransition(
          TRANSFER_TRANSITIONS,
          request.status,
          'awaiting_handoff',
        )

        // Already-created guard — exactly one delivery per request.
        const [existing] = await tx
          .select({ id: deliveries.id })
          .from(deliveries)
          .where(eq(deliveries.transferRequestId, request.id))
          .limit(1)
        if (existing) {
          throw new AppError(
            'CONFLICT',
            'A delivery already exists for this transfer request',
          )
        }

        // Atomic guarded transition prevents two concurrent creates.
        const updatedReqRows = await tx
          .update(transferRequests)
          .set({ status: 'awaiting_handoff' })
          .where(
            and(
              eq(transferRequests.id, request.id),
              eq(transferRequests.status, 'accepted'),
            ),
          )
          .returning()
        if (updatedReqRows.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Transfer request status changed concurrently; refresh and try again',
          )
        }
        const updatedReq = updatedReqRows[0]

        const [delivery] = await tx
          .insert(deliveries)
          .values({
            transferRequestId: request.id,
            dispatchMethod: data.dispatchMethod,
            pickupAddress: data.pickupAddress,
            dropoffAddress: data.dropoffAddress,
            sellerContactName: data.sellerContactName,
            sellerContactPhone: data.sellerContactPhone,
            buyerContactName: data.buyerContactName,
            buyerContactPhone: data.buyerContactPhone,
            courierReference: data.courierReference ?? null,
            dispatchNotes: data.dispatchNotes ?? null,
            status: 'pending',
          })
          .returning()

        await writeAudit({
          ctx,
          tx,
          action: 'delivery.created',
          entityType: 'delivery',
          entityId: delivery.id,
          after: delivery as unknown as Record<string, unknown>,
          metadata: { byAdminId: admin.id },
        })
        await writeAudit({
          ctx,
          tx,
          action: 'transfer_request.awaiting_handoff',
          entityType: 'transfer_request',
          entityId: updatedReq.id,
          before: request as unknown as Record<string, unknown>,
          after: updatedReq as unknown as Record<string, unknown>,
        })
        const sellerN = await createForOrg({
          tx,
          orgId: listing.sellerOrgId,
          type: 'delivery.created',
          severity: 'info',
          title: 'Delivery created — handoff pending',
          body: 'Admin scheduled this transfer for delivery. Prepare the batch for pickup.',
          entityType: 'delivery',
          entityId: delivery.id,
          link: `/org/deliveries/${delivery.id}`,
          metadata: { byAdminId: admin.id },
        })
        notifs.push(...sellerN)
        const buyerN = await createForOrg({
          tx,
          orgId: request.requesterOrgId,
          type: 'delivery.created',
          severity: 'info',
          title: 'Delivery created for your transfer request',
          body: 'Awaiting pickup scheduling. You can track progress on the delivery page.',
          entityType: 'delivery',
          entityId: delivery.id,
          link: `/org/deliveries/${delivery.id}`,
          metadata: { byAdminId: admin.id },
        })
        notifs.push(...buyerN)
        return { delivery, request: updatedReq }
      })

      void dispatchNotificationsAfterCommit(notifs)
      return { ok: true as const, ...result }
    } catch (e) {
      throw toClientError(e)
    }
  })

// ──────────────────────────────────────────────────────────────────────────
// adminAssignDeliveryLogistics — admin assigns courier user/org.
// Allowed while the delivery is still pre-pickup (pending / pickup_scheduled).
// ──────────────────────────────────────────────────────────────────────────
const ASSIGNABLE_STATUSES = ['pending', 'pickup_scheduled'] as const

export const adminAssignDeliveryLogistics = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => assignDeliveryLogisticsSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const admin = requireAdmin(ctx)

      const notifs: NotificationRow[] = []
      const result = await db.transaction(async (tx) => {
        const [delivery] = await tx
          .select()
          .from(deliveries)
          .where(eq(deliveries.id, data.deliveryId))
          .limit(1)
        if (!delivery) throw new AppError('NOT_FOUND', 'Delivery not found')
        if (
          !(ASSIGNABLE_STATUSES as ReadonlyArray<string>).includes(
            delivery.status,
          )
        ) {
          throw new AppError(
            'INVALID_TRANSITION',
            `Cannot reassign a delivery in status '${delivery.status}'`,
          )
        }

        const [target] = await tx
          .select({ id: userTable.id, role: userTable.role })
          .from(userTable)
          .where(eq(userTable.id, data.logisticsUserId))
          .limit(1)
        if (!target) throw new AppError('NOT_FOUND', 'Target user not found')
        if (target.role !== ROLES.LOGISTICS_STAFF) {
          throw new AppError(
            'FORBIDDEN',
            'Target user is not a logistics_staff user',
          )
        }

        const [org] = await tx
          .select()
          .from(organizations)
          .where(eq(organizations.id, data.logisticsOrgId))
          .limit(1)
        if (!org) throw new AppError('NOT_FOUND', 'Delivery org not found')
        if (
          org.type !== ORG_TYPES.LOGISTICS_PARTNER &&
          org.type !== ORG_TYPES.DISTRIBUTOR
        ) {
          throw new AppError(
            'CONFLICT',
            "Assigned org must be a 'logistics_partner' or 'distributor'",
          )
        }
        if (org.verificationStatus !== 'verified') {
          throw new AppError(
            'ORG_NOT_VERIFIED',
            'Delivery org is not verified',
          )
        }
        if (!hasCapability(org, CAPABILITIES.CAN_DELIVER_MEDICINE)) {
          throw new AppError(
            'FORBIDDEN',
            "Assigned org does not have the 'can_deliver_medicine' capability",
          )
        }

        const [membership] = await tx
          .select({ id: organizationMembers.id })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.userId, data.logisticsUserId),
              eq(organizationMembers.organizationId, data.logisticsOrgId),
            ),
          )
          .limit(1)
        if (!membership) {
          throw new AppError(
            'FORBIDDEN',
            'Target user is not a member of the assigned delivery org',
          )
        }

        const updated = await tx
          .update(deliveries)
          .set({
            assignedLogisticsUserId: data.logisticsUserId,
            assignedLogisticsOrgId: data.logisticsOrgId,
            assignedAt: new Date(),
            assignedByUserId: admin.id,
          })
          .where(
            and(
              eq(deliveries.id, data.deliveryId),
              inArray(deliveries.status, [...ASSIGNABLE_STATUSES]),
            ),
          )
          .returning()
        if (updated.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Delivery status changed concurrently; refresh and try again',
          )
        }
        const after = updated[0]

        await writeAudit({
          ctx,
          tx,
          action: 'delivery.logistics_assigned',
          entityType: 'delivery',
          entityId: after.id,
          before: delivery as unknown as Record<string, unknown>,
          after: after as unknown as Record<string, unknown>,
          metadata: {
            logisticsUserId: data.logisticsUserId,
            logisticsOrgId: data.logisticsOrgId,
            notes: data.notes ?? null,
          },
        })
        const n = await createForOrg({
          tx,
          orgId: data.logisticsOrgId,
          type: 'delivery.logistics_assigned',
          severity: 'info',
          title: 'New delivery assigned to your team',
          body: 'A MedMove admin assigned a delivery to your organisation.',
          entityType: 'delivery',
          entityId: after.id,
          link: `/logistics/${after.id}`,
          metadata: {
            logisticsUserId: data.logisticsUserId,
            byAdminId: admin.id,
          },
        })
        notifs.push(...n)
        return after
      })
      void dispatchNotificationsAfterCommit(notifs)
      return { ok: true as const, delivery: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

// ──────────────────────────────────────────────────────────────────────────
// schedulePickup — admin sets a pickup window. pending → pickup_scheduled.
// ──────────────────────────────────────────────────────────────────────────
export const schedulePickup = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => schedulePickupSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const admin = requireAdmin(ctx)

      const notifs: NotificationRow[] = []
      const result = await db.transaction(async (tx) => {
        const [delivery] = await tx
          .select()
          .from(deliveries)
          .where(eq(deliveries.id, data.deliveryId))
          .limit(1)
        if (!delivery) throw new AppError('NOT_FOUND', 'Delivery not found')
        const [parties] = await tx
          .select({
            requesterOrgId: transferRequests.requesterOrgId,
            sellerOrgId: listings.sellerOrgId,
          })
          .from(transferRequests)
          .innerJoin(listings, eq(listings.id, transferRequests.listingId))
          .where(eq(transferRequests.id, delivery.transferRequestId))
          .limit(1)
        if (!parties)
          throw new AppError('NOT_FOUND', 'Delivery parties missing')
        assertTransition(
          DELIVERY_TRANSITIONS,
          delivery.status,
          'pickup_scheduled',
        )

        const updated = await tx
          .update(deliveries)
          .set({
            status: 'pickup_scheduled',
            pickupScheduledAt: data.pickupScheduledAt,
            pickupScheduledByUserId: admin.id,
            dispatchNotes: data.notes ?? delivery.dispatchNotes,
          })
          .where(
            and(
              eq(deliveries.id, delivery.id),
              eq(deliveries.status, 'pending'),
            ),
          )
          .returning()
        if (updated.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Delivery status changed concurrently; refresh and try again',
          )
        }
        const after = updated[0]

        await writeAudit({
          ctx,
          tx,
          action: 'delivery.pickup_scheduled',
          entityType: 'delivery',
          entityId: after.id,
          before: delivery as unknown as Record<string, unknown>,
          after: after as unknown as Record<string, unknown>,
          metadata: {
            pickupScheduledAt: data.pickupScheduledAt.toISOString(),
            notes: data.notes ?? null,
          },
        })
        const n = await createForOrg({
          tx,
          orgId: parties.sellerOrgId,
          type: 'delivery.pickup_scheduled',
          severity: 'info',
          title: 'Pickup scheduled',
          body: `Pickup is scheduled for ${data.pickupScheduledAt.toISOString()}. Have the batch ready.`,
          entityType: 'delivery',
          entityId: after.id,
          link: `/org/deliveries/${after.id}`,
          metadata: { byAdminId: admin.id },
        })
        notifs.push(...n)
        return after
      })

      void dispatchNotificationsAfterCommit(notifs)
      return { ok: true as const, delivery: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

// ──────────────────────────────────────────────────────────────────────────
// markPickedUp — admin or assigned courier; pickup_scheduled → picked_up.
// ──────────────────────────────────────────────────────────────────────────
export const markPickedUp = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => markPickedUpSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const result = await db.transaction(async (tx) => {
        const [delivery] = await tx
          .select()
          .from(deliveries)
          .where(eq(deliveries.id, data.deliveryId))
          .limit(1)
        if (!delivery) throw new AppError('NOT_FOUND', 'Delivery not found')

        const { ctx, actor } = await requireDeliveryCourier(delivery, tx)
        assertTransition(DELIVERY_TRANSITIONS, delivery.status, 'picked_up')

        const updated = await tx
          .update(deliveries)
          .set({
            status: 'picked_up',
            pickedUpAt: new Date(),
            pickedUpByUserId: actor.id,
            dispatchNotes: data.notes ?? delivery.dispatchNotes,
          })
          .where(
            and(
              eq(deliveries.id, delivery.id),
              eq(deliveries.status, 'pickup_scheduled'),
            ),
          )
          .returning()
        if (updated.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Delivery status changed concurrently; refresh and try again',
          )
        }
        const after = updated[0]

        await writeAudit({
          ctx,
          tx,
          action: 'delivery.picked_up',
          entityType: 'delivery',
          entityId: after.id,
          before: delivery as unknown as Record<string, unknown>,
          after: after as unknown as Record<string, unknown>,
          metadata: { notes: data.notes ?? null },
        })
        return after
      })

      return { ok: true as const, delivery: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

// ──────────────────────────────────────────────────────────────────────────
// markInTransit — admin or assigned courier; picked_up → in_transit.
// Also moves the underlying request awaiting_handoff → dispatched.
// ──────────────────────────────────────────────────────────────────────────
export const markInTransit = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => markInTransitSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const notifs: NotificationRow[] = []
      const result = await db.transaction(async (tx) => {
        const [delivery] = await tx
          .select()
          .from(deliveries)
          .where(eq(deliveries.id, data.deliveryId))
          .limit(1)
        if (!delivery) throw new AppError('NOT_FOUND', 'Delivery not found')

        const [request] = await tx
          .select()
          .from(transferRequests)
          .where(eq(transferRequests.id, delivery.transferRequestId))
          .limit(1)
        if (!request)
          throw new AppError('NOT_FOUND', 'Transfer request missing')

        const { ctx, actor } = await requireDeliveryCourier(delivery, tx)
        assertTransition(DELIVERY_TRANSITIONS, delivery.status, 'in_transit')
        assertTransition(TRANSFER_TRANSITIONS, request.status, 'dispatched')

        const updatedDeliveryRows = await tx
          .update(deliveries)
          .set({
            status: 'in_transit',
            dispatchedAt: new Date(),
            dispatchedByUserId: actor.id,
            courierReference:
              data.courierReference ?? delivery.courierReference,
            dispatchNotes: data.dispatchNotes ?? delivery.dispatchNotes,
          })
          .where(
            and(
              eq(deliveries.id, delivery.id),
              eq(deliveries.status, 'picked_up'),
            ),
          )
          .returning()
        if (updatedDeliveryRows.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Delivery status changed concurrently; refresh and try again',
          )
        }
        const updatedDelivery = updatedDeliveryRows[0]

        const updatedRequestRows = await tx
          .update(transferRequests)
          .set({ status: 'dispatched' })
          .where(
            and(
              eq(transferRequests.id, request.id),
              eq(transferRequests.status, 'awaiting_handoff'),
            ),
          )
          .returning()
        if (updatedRequestRows.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Transfer request status changed concurrently; refresh and try again',
          )
        }
        const updatedRequest = updatedRequestRows[0]

        await writeAudit({
          ctx,
          tx,
          action: 'delivery.in_transit',
          entityType: 'delivery',
          entityId: updatedDelivery.id,
          before: delivery as unknown as Record<string, unknown>,
          after: updatedDelivery as unknown as Record<string, unknown>,
        })
        await writeAudit({
          ctx,
          tx,
          action: 'transfer_request.dispatched',
          entityType: 'transfer_request',
          entityId: updatedRequest.id,
          before: request as unknown as Record<string, unknown>,
          after: updatedRequest as unknown as Record<string, unknown>,
        })
        const n = await createForOrg({
          tx,
          orgId: request.requesterOrgId,
          type: 'delivery.in_transit',
          severity: 'info',
          title: 'Your delivery is in transit',
          body: updatedDelivery.courierReference
            ? `Tracking reference: ${updatedDelivery.courierReference}`
            : 'A courier has picked up the batch and is on the way.',
          entityType: 'delivery',
          entityId: updatedDelivery.id,
          link: `/org/deliveries/${updatedDelivery.id}`,
        })
        notifs.push(...n)
        return { delivery: updatedDelivery, request: updatedRequest }
      })

      void dispatchNotificationsAfterCommit(notifs)
      return { ok: true as const, ...result }
    } catch (e) {
      throw toClientError(e)
    }
  })

// ──────────────────────────────────────────────────────────────────────────
// confirmDelivery — receiver attests receipt; in_transit → delivered.
// Receiver must enter receivedQuantity equal to request.quantityRequested
// (partial receipts are out of scope; mismatches must be raised via dispute).
// Decrements physical batch stock.
// ──────────────────────────────────────────────────────────────────────────
export const confirmDelivery = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => confirmDeliverySchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()

      const notifs: NotificationRow[] = []
      const result = await db.transaction(async (tx) => {
        const [delivery] = await tx
          .select()
          .from(deliveries)
          .where(eq(deliveries.id, data.deliveryId))
          .limit(1)
        if (!delivery) throw new AppError('NOT_FOUND', 'Delivery not found')

        const [request] = await tx
          .select()
          .from(transferRequests)
          .where(eq(transferRequests.id, delivery.transferRequestId))
          .limit(1)
        if (!request)
          throw new AppError('NOT_FOUND', 'Transfer request missing')

        const { user } = await requireCapability(
          ctx,
          request.requesterOrgId,
          CAPABILITIES.CAN_REQUEST_MEDICINE,
        )
        assertTransition(DELIVERY_TRANSITIONS, delivery.status, 'delivered')
        assertTransition(TRANSFER_TRANSITIONS, request.status, 'completed')

        const [sellerRow] = await tx
          .select({ sellerOrgId: listings.sellerOrgId })
          .from(listings)
          .where(eq(listings.id, request.listingId))
          .limit(1)
        if (!sellerRow)
          throw new AppError('NOT_FOUND', 'Listing missing')

        if (data.receivedQuantity !== request.quantityRequested) {
          throw new AppError(
            'CONFLICT',
            `Received quantity (${data.receivedQuantity}) must equal the requested quantity (${request.quantityRequested}). Raise a dispute if the shipment differs.`,
          )
        }

        const [batchRow] = await tx
          .select({
            batchId: listings.batchId,
            expiryDate: inventoryBatches.expiryDate,
            sealedStatus: inventoryBatches.sealedStatus,
          })
          .from(listings)
          .innerJoin(
            inventoryBatches,
            eq(inventoryBatches.id, listings.batchId),
          )
          .where(eq(listings.id, request.listingId))
          .limit(1)
        if (!batchRow) throw new AppError('NOT_FOUND', 'Listing batch missing')
        const today = new Date().toISOString().slice(0, 10)
        if (batchRow.expiryDate <= today) {
          throw new AppError(
            'EXPIRED_MEDICINE',
            'Batch has expired before delivery could be confirmed',
          )
        }
        if (batchRow.sealedStatus === 'opened') {
          throw new AppError(
            'OPENED_PACKAGE',
            'Batch is no longer sealed; cannot confirm delivery',
          )
        }

        const updatedDeliveryRows = await tx
          .update(deliveries)
          .set({
            status: 'delivered',
            receivedAt: new Date(),
            receivedByUserId: user.id,
            receivedQuantity: data.receivedQuantity,
            receiptNotes: data.receiptNotes ?? null,
          })
          .where(
            and(
              eq(deliveries.id, delivery.id),
              eq(deliveries.status, 'in_transit'),
            ),
          )
          .returning()
        if (updatedDeliveryRows.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Delivery status changed concurrently; refresh and try again',
          )
        }
        const updatedDelivery = updatedDeliveryRows[0]

        const updatedRequestRows = await tx
          .update(transferRequests)
          .set({
            status: 'completed',
            completedAt: new Date(),
          })
          .where(
            and(
              eq(transferRequests.id, request.id),
              eq(transferRequests.status, 'dispatched'),
            ),
          )
          .returning()
        if (updatedRequestRows.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Transfer request status changed concurrently; refresh and try again',
          )
        }
        const updatedRequest = updatedRequestRows[0]

        const decremented = await tx
          .update(inventoryBatches)
          .set({
            quantityOnHand: sql`${inventoryBatches.quantityOnHand} - ${request.quantityRequested}`,
          })
          .where(
            and(
              eq(inventoryBatches.id, batchRow.batchId),
              sql`${inventoryBatches.quantityOnHand} >= ${request.quantityRequested}`,
            ),
          )
          .returning()
        if (decremented.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Inventory inconsistency detected; aborting',
          )
        }

        await writeAudit({
          ctx,
          tx,
          action: 'delivery.confirmed',
          entityType: 'delivery',
          entityId: updatedDelivery.id,
          before: delivery as unknown as Record<string, unknown>,
          after: updatedDelivery as unknown as Record<string, unknown>,
          actorOrgIdOverride: request.requesterOrgId,
          metadata: { receivedQuantity: data.receivedQuantity },
        })
        await writeAudit({
          ctx,
          tx,
          action: 'transfer_request.completed',
          entityType: 'transfer_request',
          entityId: updatedRequest.id,
          before: request as unknown as Record<string, unknown>,
          after: updatedRequest as unknown as Record<string, unknown>,
          actorOrgIdOverride: request.requesterOrgId,
        })
        await writeAudit({
          ctx,
          tx,
          action: 'inventory_batch.decremented',
          entityType: 'inventory_batch',
          entityId: batchRow.batchId,
          metadata: {
            delta: -request.quantityRequested,
            reason: 'delivery_confirmed',
            transferRequestId: updatedRequest.id,
          },
        })
        const n = await createForOrg({
          tx,
          orgId: sellerRow.sellerOrgId,
          type: 'delivery.delivered',
          severity: 'success',
          title: 'Delivery confirmed by receiver',
          body: `${data.receivedQuantity} units received and signed for.`,
          entityType: 'delivery',
          entityId: updatedDelivery.id,
          link: `/org/deliveries/${updatedDelivery.id}`,
        })
        notifs.push(...n)
        return { delivery: updatedDelivery, request: updatedRequest }
      })

      void dispatchNotificationsAfterCommit(notifs)
      return { ok: true as const, ...result }
    } catch (e) {
      throw toClientError(e)
    }
  })

// ──────────────────────────────────────────────────────────────────────────
// markDeliveryFailed — admin or assigned courier; picked_up | in_transit
// → failed. Does not auto-cancel the underlying transfer request — admins
// can choose whether to cancel it (which restores the listing reservation).
// ──────────────────────────────────────────────────────────────────────────
const FAILABLE_STATUSES = ['picked_up', 'in_transit'] as const

export const markDeliveryFailed = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => markDeliveryFailedSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const notifs: NotificationRow[] = []
      const result = await db.transaction(async (tx) => {
        const [delivery] = await tx
          .select()
          .from(deliveries)
          .where(eq(deliveries.id, data.deliveryId))
          .limit(1)
        if (!delivery) throw new AppError('NOT_FOUND', 'Delivery not found')

        const [parties] = await tx
          .select({
            requesterOrgId: transferRequests.requesterOrgId,
            sellerOrgId: listings.sellerOrgId,
          })
          .from(transferRequests)
          .innerJoin(listings, eq(listings.id, transferRequests.listingId))
          .where(eq(transferRequests.id, delivery.transferRequestId))
          .limit(1)
        if (!parties)
          throw new AppError('NOT_FOUND', 'Delivery parties missing')

        const { ctx, actor } = await requireDeliveryCourier(delivery, tx)
        if (
          !(FAILABLE_STATUSES as ReadonlyArray<string>).includes(
            delivery.status,
          )
        ) {
          throw new AppError(
            'INVALID_TRANSITION',
            `Cannot mark a delivery in status '${delivery.status}' as failed`,
          )
        }
        assertTransition(DELIVERY_TRANSITIONS, delivery.status, 'failed')

        const updated = await tx
          .update(deliveries)
          .set({
            status: 'failed',
            failedAt: new Date(),
            failedByUserId: actor.id,
            failureReason: data.reason,
          })
          .where(
            and(
              eq(deliveries.id, delivery.id),
              inArray(deliveries.status, [...FAILABLE_STATUSES]),
            ),
          )
          .returning()
        if (updated.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Delivery status changed concurrently; refresh and try again',
          )
        }
        const after = updated[0]

        await writeAudit({
          ctx,
          tx,
          action: 'delivery.failed',
          entityType: 'delivery',
          entityId: after.id,
          before: delivery as unknown as Record<string, unknown>,
          after: after as unknown as Record<string, unknown>,
          metadata: { reason: data.reason },
        })
        for (const orgId of [parties.sellerOrgId, parties.requesterOrgId]) {
          const n = await createForOrg({
            tx,
            orgId,
            type: 'delivery.failed',
            severity: 'critical',
            title: 'Delivery failed',
            body: data.reason,
            entityType: 'delivery',
            entityId: after.id,
            link: `/org/deliveries/${after.id}`,
            metadata: { reportedByUserId: actor.id },
          })
          notifs.push(...n)
        }
        return after
      })

      void dispatchNotificationsAfterCommit(notifs)
      return { ok: true as const, delivery: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

// ──────────────────────────────────────────────────────────────────────────
// cancelDelivery — admin only; pending | pickup_scheduled → cancelled.
// Cascades: transfer_request awaiting_handoff → cancelled, listing
// quantityAvailable restored, sold_out listings re-opened (mirrors
// cancelTransferRequest semantics).
// ──────────────────────────────────────────────────────────────────────────
const CANCELLABLE_STATUSES = ['pending', 'pickup_scheduled'] as const

export const cancelDelivery = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => cancelDeliverySchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const admin = requireAdmin(ctx)

      const result = await db.transaction(async (tx) => {
        const [delivery] = await tx
          .select()
          .from(deliveries)
          .where(eq(deliveries.id, data.deliveryId))
          .limit(1)
        if (!delivery) throw new AppError('NOT_FOUND', 'Delivery not found')
        if (
          !(CANCELLABLE_STATUSES as ReadonlyArray<string>).includes(
            delivery.status,
          )
        ) {
          throw new AppError(
            'INVALID_TRANSITION',
            `Cannot cancel a delivery in status '${delivery.status}'`,
          )
        }
        assertTransition(DELIVERY_TRANSITIONS, delivery.status, 'cancelled')

        const [request] = await tx
          .select()
          .from(transferRequests)
          .where(eq(transferRequests.id, delivery.transferRequestId))
          .limit(1)
        if (!request)
          throw new AppError('NOT_FOUND', 'Transfer request missing')

        const updatedDeliveryRows = await tx
          .update(deliveries)
          .set({
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledByUserId: admin.id,
            cancellationReason: data.reason,
          })
          .where(
            and(
              eq(deliveries.id, delivery.id),
              inArray(deliveries.status, [...CANCELLABLE_STATUSES]),
            ),
          )
          .returning()
        if (updatedDeliveryRows.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Delivery status changed concurrently; refresh and try again',
          )
        }
        const updatedDelivery = updatedDeliveryRows[0]

        let updatedRequest: RequestRow | null = null
        let qtyRestored = false
        let listingRebumped = false
        if (request.status === 'awaiting_handoff') {
          assertTransition(TRANSFER_TRANSITIONS, request.status, 'cancelled')
          const updatedReqRows = await tx
            .update(transferRequests)
            .set({
              status: 'cancelled',
              cancellationReason: data.reason,
            })
            .where(
              and(
                eq(transferRequests.id, request.id),
                eq(transferRequests.status, 'awaiting_handoff'),
              ),
            )
            .returning()
          if (updatedReqRows.length === 0) {
            throw new AppError(
              'CONFLICT',
              'Transfer request status changed concurrently; refresh and try again',
            )
          }
          updatedRequest = updatedReqRows[0]

          await tx
            .update(listings)
            .set({
              quantityAvailable: sql`${listings.quantityAvailable} + ${request.quantityRequested}`,
            })
            .where(eq(listings.id, request.listingId))
          qtyRestored = true

          const [postBump] = await tx
            .select({ status: listings.status })
            .from(listings)
            .where(eq(listings.id, request.listingId))
            .limit(1)
          if (postBump?.status === 'sold_out') {
            assertTransition(LISTING_TRANSITIONS, 'sold_out', 'active')
            const rebumped = await tx
              .update(listings)
              .set({ status: 'active' })
              .where(
                and(
                  eq(listings.id, request.listingId),
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
          action: 'delivery.cancelled',
          entityType: 'delivery',
          entityId: updatedDelivery.id,
          before: delivery as unknown as Record<string, unknown>,
          after: updatedDelivery as unknown as Record<string, unknown>,
          metadata: { reason: data.reason },
        })
        if (updatedRequest) {
          await writeAudit({
            ctx,
            tx,
            action: 'transfer_request.cancelled',
            entityType: 'transfer_request',
            entityId: updatedRequest.id,
            before: request as unknown as Record<string, unknown>,
            after: updatedRequest as unknown as Record<string, unknown>,
            metadata: {
              reason: data.reason,
              cause: 'delivery_cancelled',
            },
          })
        }
        if (qtyRestored) {
          await writeAudit({
            ctx,
            tx,
            action: 'listing.quantity_restored',
            entityType: 'listing',
            entityId: request.listingId,
            metadata: {
              delta: request.quantityRequested,
              reason: 'delivery_cancelled',
              transferRequestId: request.id,
            },
          })
        }
        if (listingRebumped) {
          await writeAudit({
            ctx,
            tx,
            action: 'listing.reopened',
            entityType: 'listing',
            entityId: request.listingId,
            before: { status: 'sold_out' } as Record<string, unknown>,
            after: { status: 'active' } as Record<string, unknown>,
            metadata: { reason: 'quantity_restored_after_delivery_cancel' },
          })
        }
        return updatedDelivery
      })

      return { ok: true as const, delivery: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

// ──────────────────────────────────────────────────────────────────────────
// disputeDelivery — receiver-side; in_transit | delivered → disputed.
// ──────────────────────────────────────────────────────────────────────────
export const disputeDelivery = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => disputeDeliverySchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()

      const result = await db.transaction(async (tx) => {
        const [delivery] = await tx
          .select()
          .from(deliveries)
          .where(eq(deliveries.id, data.deliveryId))
          .limit(1)
        if (!delivery) throw new AppError('NOT_FOUND', 'Delivery not found')

        const [request] = await tx
          .select()
          .from(transferRequests)
          .where(eq(transferRequests.id, delivery.transferRequestId))
          .limit(1)
        if (!request)
          throw new AppError('NOT_FOUND', 'Transfer request missing')

        await requireCapability(
          ctx,
          request.requesterOrgId,
          CAPABILITIES.CAN_REQUEST_MEDICINE,
        )
        assertTransition(DELIVERY_TRANSITIONS, delivery.status, 'disputed')

        const updated = await tx
          .update(deliveries)
          .set({
            status: 'disputed',
            receiptNotes: data.reason,
          })
          .where(
            and(
              eq(deliveries.id, delivery.id),
              inArray(deliveries.status, ['in_transit', 'delivered']),
            ),
          )
          .returning()
        if (updated.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Delivery status changed concurrently; refresh and try again',
          )
        }
        const after = updated[0]

        await writeAudit({
          ctx,
          tx,
          action: 'delivery.disputed',
          entityType: 'delivery',
          entityId: after.id,
          before: delivery as unknown as Record<string, unknown>,
          after: after as unknown as Record<string, unknown>,
          actorOrgIdOverride: request.requesterOrgId,
          metadata: { reason: data.reason },
        })
        return after
      })

      return { ok: true as const, delivery: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

// ──────────────────────────────────────────────────────────────────────────
// getDelivery — joined fetch for admin / sender / receiver / assigned courier.
// ──────────────────────────────────────────────────────────────────────────
export const getDelivery = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => getDeliverySchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const actor = requireAuth(ctx)

      const rows = await deliveryJoinedQuery().where(
        eq(deliveries.id, data.deliveryId),
      )
      const row = rows[0]
      if (!row) throw new AppError('NOT_FOUND', 'Delivery not found')

      // Authorization — at least one of:
      //   1. admin
      //   2. assigned logistics user (must still be a current member of the
      //      assigned logistics org — re-checked at read time so removed
      //      couriers cannot continue to enumerate addresses / contacts)
      //   3. member of seller org
      //   4. member of requester org
      if (!isAdminRole(actor.role)) {
        const orgIdsToCheck: Array<string> = [
          row.sellerOrg.id,
          row.requesterOrg.id,
        ]
        const isAssignedCandidate =
          row.delivery.assignedLogisticsUserId === actor.id &&
          actor.role === ROLES.LOGISTICS_STAFF &&
          row.delivery.assignedLogisticsOrgId !== null
        if (isAssignedCandidate && row.delivery.assignedLogisticsOrgId) {
          orgIdsToCheck.push(row.delivery.assignedLogisticsOrgId)
        }
        const memberships = await db
          .select({ orgId: organizationMembers.organizationId })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.userId, actor.id),
              inArray(organizationMembers.organizationId, orgIdsToCheck),
            ),
          )
        const memberOrgIds = new Set(memberships.map((m) => m.orgId))
        const isAssigned =
          isAssignedCandidate &&
          row.delivery.assignedLogisticsOrgId !== null &&
          memberOrgIds.has(row.delivery.assignedLogisticsOrgId)
        const isOrgMember =
          memberOrgIds.has(row.sellerOrg.id) ||
          memberOrgIds.has(row.requesterOrg.id)
        if (!isAssigned && !isOrgMember) {
          throw new AppError(
            'FORBIDDEN',
            'You do not have access to this delivery',
          )
        }
      }

      return { ok: true as const, delivery: row }
    } catch (e) {
      throw toClientError(e)
    }
  })

// ──────────────────────────────────────────────────────────────────────────
// adminListDeliveries — admin view across the platform.
// ──────────────────────────────────────────────────────────────────────────
export const adminListDeliveries = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => adminListDeliveriesSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      requireAdmin(ctx)

      const conditions = []
      if (data.status) {
        conditions.push(eq(deliveries.status, data.status))
      }
      if (data.search) {
        const like = `%${data.search}%`
        conditions.push(
          or(
            ilike(medicines.name, like),
            ilike(sellerOrgAlias.name, like),
            ilike(requesterOrgAlias.name, like),
          ),
        )
      }
      const where = conditions.length ? and(...conditions) : undefined
      let q = deliveryJoinedQuery()
      if (where) q = q.where(where) as typeof q
      const items = await q
        .orderBy(desc(deliveries.createdAt))
        .limit(data.limit)
      return { ok: true as const, items }
    } catch (e) {
      throw toClientError(e)
    }
  })

// ──────────────────────────────────────────────────────────────────────────
// listOutgoingDeliveries — sender (seller) view.
// ──────────────────────────────────────────────────────────────────────────
export const listOutgoingDeliveries = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => listOrgDeliveriesSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const actor = requireAuth(ctx)
      if (!isAdminRole(actor.role)) {
        await requireOrgMember(ctx, data.organizationId)
      }
      const conditions = [eq(listings.sellerOrgId, data.organizationId)]
      if (data.status) conditions.push(eq(deliveries.status, data.status))
      const items = await deliveryJoinedQuery()
        .where(and(...conditions))
        .orderBy(desc(deliveries.createdAt))
        .limit(data.limit)
      return { ok: true as const, items }
    } catch (e) {
      throw toClientError(e)
    }
  })

// ──────────────────────────────────────────────────────────────────────────
// listIncomingDeliveries — receiver (buyer) view.
// ──────────────────────────────────────────────────────────────────────────
export const listIncomingDeliveries = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => listOrgDeliveriesSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const actor = requireAuth(ctx)
      if (!isAdminRole(actor.role)) {
        await requireOrgMember(ctx, data.organizationId)
      }
      const conditions = [
        eq(transferRequests.requesterOrgId, data.organizationId),
      ]
      if (data.status) conditions.push(eq(deliveries.status, data.status))
      const items = await deliveryJoinedQuery()
        .where(and(...conditions))
        .orderBy(desc(deliveries.createdAt))
        .limit(data.limit)
      return { ok: true as const, items }
    } catch (e) {
      throw toClientError(e)
    }
  })

// ──────────────────────────────────────────────────────────────────────────
// listMyAssignedDeliveries — courier view.
// ──────────────────────────────────────────────────────────────────────────
export const listMyAssignedDeliveries = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => listAssignedDeliveriesSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const actor = requireAuth(ctx)
      if (
        !isAdminRole(actor.role) &&
        actor.role !== ROLES.LOGISTICS_STAFF
      ) {
        throw new AppError(
          'FORBIDDEN',
          'Only logistics_staff or admins can view assigned deliveries',
        )
      }
      const conditions = []
      if (isAdminRole(actor.role)) {
        // Admins get the in-flight queue by default — useful as an at-a-glance.
        conditions.push(
          inArray(deliveries.status, [
            'pending',
            'pickup_scheduled',
            'picked_up',
            'in_transit',
          ]),
        )
      } else {
        // Re-check current logistics-org memberships so a removed courier
        // cannot continue to enumerate previously-assigned deliveries.
        const memberships = await db
          .select({ orgId: organizationMembers.organizationId })
          .from(organizationMembers)
          .where(eq(organizationMembers.userId, actor.id))
        const memberOrgIds = memberships.map((m) => m.orgId)
        if (memberOrgIds.length === 0) {
          return { ok: true as const, items: [] }
        }
        conditions.push(eq(deliveries.assignedLogisticsUserId, actor.id))
        conditions.push(
          inArray(deliveries.assignedLogisticsOrgId, memberOrgIds),
        )
      }
      if (data.status) conditions.push(eq(deliveries.status, data.status))
      const items = await deliveryJoinedQuery()
        .where(and(...conditions))
        .orderBy(desc(deliveries.assignedAt), desc(deliveries.createdAt))
        .limit(data.limit)
      return { ok: true as const, items }
    } catch (e) {
      throw toClientError(e)
    }
  })

// ──────────────────────────────────────────────────────────────────────────
// adminListLogisticsCandidates — flat (user × org) list for the assignment
// dropdown. Returns only verified delivery-capable orgs and their
// LOGISTICS_STAFF members.
// ──────────────────────────────────────────────────────────────────────────
export const adminListLogisticsCandidates = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => listLogisticsCandidatesSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      requireAdmin(ctx)
      const conditions = [
        eq(userTable.role, ROLES.LOGISTICS_STAFF),
        eq(organizations.verificationStatus, 'verified'),
        eq(organizations.canDeliverMedicine, true),
        inArray(organizations.type, [
          ORG_TYPES.LOGISTICS_PARTNER,
          ORG_TYPES.DISTRIBUTOR,
        ]),
      ]
      if (data.search) {
        const like = `%${data.search}%`
        conditions.push(
          or(
            ilike(userTable.email, like),
            ilike(userTable.name, like),
            ilike(organizations.name, like),
          )!,
        )
      }
      const items = await db
        .select({
          userId: userTable.id,
          userEmail: userTable.email,
          userName: userTable.name,
          orgId: organizations.id,
          orgName: organizations.name,
          orgType: organizations.type,
        })
        .from(organizationMembers)
        .innerJoin(userTable, eq(userTable.id, organizationMembers.userId))
        .innerJoin(
          organizations,
          eq(organizations.id, organizationMembers.organizationId),
        )
        .where(and(...conditions))
        .orderBy(asc(organizations.name), asc(userTable.email))
        .limit(data.limit)
      return { ok: true as const, items }
    } catch (e) {
      throw toClientError(e)
    }
  })
