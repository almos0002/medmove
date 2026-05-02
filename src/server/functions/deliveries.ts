import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  deliveries,
  inventoryBatches,
  listings,
  organizations,
  transferRequests,
} from '@/lib/schema'
import { user as userTable } from '@/lib/auth-schema'
import { organizationMembers } from '@/lib/schema'
import {
  CAPABILITIES,
  ORG_TYPES,
  ROLES,
  hasCapability,
  isAdminRole,
} from '@/lib/permissions'
import { writeAudit } from '../audit'
import { getRequestContext } from '../context'
import { AppError, toClientError } from '../errors'
import { requireAuth } from '../guards/require-auth'
import { requireAdmin } from '../guards/require-admin'
import { requireCapability } from '../guards/require-capability'
import {
  DELIVERY_TRANSITIONS,
  TRANSFER_TRANSITIONS,
  assertTransition,
} from '../transitions'
import {
  assignDeliveryLogisticsSchema,
  confirmDeliverySchema,
  disputeDeliverySchema,
  listAssignedDeliveriesSchema,
  markDispatchedSchema,
  scheduleDeliverySchema,
} from '../validators/deliveries'

export const scheduleDelivery = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => scheduleDeliverySchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()

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

        // Scheduling is the seller-side hand-off step → can_list_medicine.
        await requireCapability(
          ctx,
          listing.sellerOrgId,
          CAPABILITIES.CAN_LIST_MEDICINE,
        )

        if (request.status !== 'accepted') {
          throw new AppError(
            'INVALID_TRANSITION',
            `Cannot schedule delivery for request in status '${request.status}'`,
          )
        }
        assertTransition(
          TRANSFER_TRANSITIONS,
          request.status,
          'awaiting_handoff',
        )

        // Atomic guarded transition prevents two concurrent schedules.
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
            status: 'scheduled',
          })
          .returning()

        await writeAudit({
          ctx,
          tx,
          action: 'delivery.scheduled',
          entityType: 'delivery',
          entityId: delivery.id,
          after: delivery as unknown as Record<string, unknown>,
          actorOrgIdOverride: listing.sellerOrgId,
        })
        await writeAudit({
          ctx,
          tx,
          action: 'transfer_request.awaiting_handoff',
          entityType: 'transfer_request',
          entityId: updatedReq.id,
          before: request as unknown as Record<string, unknown>,
          after: updatedReq as unknown as Record<string, unknown>,
          actorOrgIdOverride: listing.sellerOrgId,
        })
        return { delivery, request: updatedReq }
      })

      return { ok: true as const, ...result }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const markDispatched = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => markDispatchedSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const actor = requireAuth(ctx)

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

        const [listing] = await tx
          .select()
          .from(listings)
          .where(eq(listings.id, request.listingId))
          .limit(1)
        if (!listing) throw new AppError('NOT_FOUND', 'Listing missing')

        // Authorization rules for marking dispatched:
        //   1. Admins always allowed.
        //   2. The specific assigned LOGISTICS_STAFF user (per-row check on
        //      delivery.assignedLogisticsUserId). To prevent stale-privilege
        //      escalation, we ALSO re-validate at dispatch time that:
        //        a) the actor's current role is still LOGISTICS_STAFF, AND
        //        b) the actor is still a member of the assigned logistics
        //           org (if one was recorded).
        //      If either changed, we fall through to the org-capability
        //      branches below — which themselves require the org to still
        //      hold can_deliver_medicine.
        //   3. Otherwise: caller must be a member of an org with
        //      can_deliver_medicine. That org must be either the assigned
        //      logistics org (if one is set) or the seller org (self-
        //      dispatch by a distributor / cap-enabled seller).
        if (!isAdminRole(actor.role)) {
          let authorisedAsAssigned = false
          if (
            delivery.assignedLogisticsUserId &&
            delivery.assignedLogisticsUserId === actor.id &&
            actor.role === ROLES.LOGISTICS_STAFF
          ) {
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
              authorisedAsAssigned = !!stillMember
            } else {
              authorisedAsAssigned = true
            }
          }

          if (!authorisedAsAssigned) {
            if (delivery.assignedLogisticsOrgId) {
              await requireCapability(
                ctx,
                delivery.assignedLogisticsOrgId,
                CAPABILITIES.CAN_DELIVER_MEDICINE,
              )
            } else {
              // No logistics assigned — must be a self-dispatch by a seller
              // org that holds can_deliver_medicine (e.g. distributor type).
              await requireCapability(
                ctx,
                listing.sellerOrgId,
                CAPABILITIES.CAN_DELIVER_MEDICINE,
              )
            }
          }
        }

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
              eq(deliveries.status, 'scheduled'),
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
          action: 'delivery.dispatched',
          entityType: 'delivery',
          entityId: updatedDelivery.id,
          before: delivery as unknown as Record<string, unknown>,
          after: updatedDelivery as unknown as Record<string, unknown>,
          actorOrgIdOverride: listing.sellerOrgId,
        })
        await writeAudit({
          ctx,
          tx,
          action: 'transfer_request.dispatched',
          entityType: 'transfer_request',
          entityId: updatedRequest.id,
          before: request as unknown as Record<string, unknown>,
          after: updatedRequest as unknown as Record<string, unknown>,
          actorOrgIdOverride: listing.sellerOrgId,
        })
        return { delivery: updatedDelivery, request: updatedRequest }
      })

      return { ok: true as const, ...result }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const confirmDelivery = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => confirmDeliverySchema.parse(d))
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

        // Receipt is asserted by the requesting (buyer-side) org, which must
        // have can_request_medicine.
        const { user } = await requireCapability(
          ctx,
          request.requesterOrgId,
          CAPABILITIES.CAN_REQUEST_MEDICINE,
        )
        assertTransition(DELIVERY_TRANSITIONS, delivery.status, 'delivered')
        assertTransition(TRANSFER_TRANSITIONS, request.status, 'completed')

        if (data.receivedQuantity > request.quantityRequested) {
          throw new AppError(
            'CONFLICT',
            `receivedQuantity (${data.receivedQuantity}) cannot exceed quantityRequested (${request.quantityRequested})`,
          )
        }

        // Re-validate MVP safety at confirmation time (batch expiry / sealed state
        // may have changed since acceptance).
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

        // Atomic guarded transitions FIRST so only one tx can apply the side-effects.
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

        // Decrement physical batch stock; race-safe via qty guard.
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
        return { delivery: updatedDelivery, request: updatedRequest }
      })

      return { ok: true as const, ...result }
    } catch (e) {
      throw toClientError(e)
    }
  })

/**
 * Admin assigns a delivery to a verified delivery-capable org user. The
 * target user must be a LOGISTICS_STAFF user, AND a member of the target
 * org, AND the target org must (a) be verified, (b) be of a delivery-
 * capable type (logistics_partner or distributor), and (c) hold the
 * can_deliver_medicine capability flag. Re-assignment is allowed only while
 * the delivery is still 'scheduled'.
 */
export const adminAssignDeliveryLogistics = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => assignDeliveryLogisticsSchema.parse(d))
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
        if (delivery.status !== 'scheduled') {
          throw new AppError(
            'INVALID_TRANSITION',
            `Cannot reassign a delivery in status '${delivery.status}'`,
          )
        }

        // Validate the target user is a LOGISTICS_STAFF user.
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

        // Validate the org is a verified delivery-capable org with the
        // can_deliver_medicine capability set.
        const [org] = await tx
          .select()
          .from(organizations)
          .where(eq(organizations.id, data.logisticsOrgId))
          .limit(1)
        if (!org)
          throw new AppError('NOT_FOUND', 'Delivery org not found')
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

        // The target user must actually belong to the target org —
        // otherwise an admin could assign a delivery to a logistics_staff
        // user from a *different* delivery company, breaking the contract.
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
              eq(deliveries.status, 'scheduled'),
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
        return after
      })
      return { ok: true as const, delivery: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

/**
 * Returns the deliveries assigned to the calling logistics_staff user.
 * Admins see all in-flight deliveries (read-only convenience).
 */
export const listMyAssignedDeliveries = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => listAssignedDeliveriesSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const user = requireAuth(ctx)
      if (
        !isAdminRole(user.role) &&
        user.role !== ROLES.LOGISTICS_STAFF
      ) {
        throw new AppError(
          'FORBIDDEN',
          'Only logistics_staff or admins can view assigned deliveries',
        )
      }

      const where = isAdminRole(user.role)
        ? or(
            eq(deliveries.status, 'scheduled'),
            eq(deliveries.status, 'in_transit'),
          )
        : eq(deliveries.assignedLogisticsUserId, user.id)

      const rows = await db
        .select()
        .from(deliveries)
        .where(where)
        .orderBy(desc(deliveries.assignedAt))
        .limit(data.limit)
      return { ok: true as const, items: rows }
    } catch (e) {
      throw toClientError(e)
    }
  })

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

        // Disputing is the receiving (buyer-side) action.
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
