import { z } from 'zod'
import { nonEmpty, positiveInt, uuid } from './_shared'

export const dispatchMethodSchema = z.enum([
  'buyer_pickup',
  'seller_drop_off',
  'third_party_courier',
])

export const deliveryStatusSchema = z.enum([
  'pending',
  'pickup_scheduled',
  'picked_up',
  'scheduled',
  'in_transit',
  'delivered',
  'failed',
  'cancelled',
  'disputed',
])
export type DeliveryStatusValue = z.infer<typeof deliveryStatusSchema>

/** Admin creates a delivery from an `accepted` transfer request. */
export const adminCreateDeliverySchema = z.object({
  transferRequestId: uuid,
  dispatchMethod: dispatchMethodSchema,
  pickupAddress: nonEmpty(500),
  dropoffAddress: nonEmpty(500),
  sellerContactName: nonEmpty(200),
  sellerContactPhone: nonEmpty(40),
  buyerContactName: nonEmpty(200),
  buyerContactPhone: nonEmpty(40),
  courierReference: z.string().trim().max(200).optional(),
  dispatchNotes: z.string().trim().max(2000).optional(),
})

export const schedulePickupSchema = z.object({
  deliveryId: uuid,
  pickupScheduledAt: z.coerce
    .date()
    .refine((d) => !Number.isNaN(d.valueOf()), 'Invalid date')
    .refine(
      (d) => d.getTime() >= Date.now() - 5 * 60 * 1000,
      'Pickup time must be in the future',
    ),
  notes: z.string().trim().max(2000).optional(),
})

export const markPickedUpSchema = z.object({
  deliveryId: uuid,
  notes: z.string().trim().max(2000).optional(),
})

export const markInTransitSchema = z.object({
  deliveryId: uuid,
  courierReference: z.string().trim().max(200).optional(),
  dispatchNotes: z.string().trim().max(2000).optional(),
})

export const confirmDeliverySchema = z.object({
  deliveryId: uuid,
  receivedQuantity: positiveInt,
  receiptNotes: z.string().trim().max(2000).optional(),
})

export const markDeliveryFailedSchema = z.object({
  deliveryId: uuid,
  reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(1000),
})

export const cancelDeliverySchema = z.object({
  deliveryId: uuid,
  reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(1000),
})

export const disputeDeliverySchema = z.object({
  deliveryId: uuid,
  reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(1000),
})

export const assignDeliveryLogisticsSchema = z.object({
  deliveryId: uuid,
  logisticsUserId: nonEmpty(255),
  logisticsOrgId: uuid,
  notes: z.string().trim().max(1000).optional(),
})

export const getDeliverySchema = z.object({
  deliveryId: uuid,
})

export const adminListDeliveriesSchema = z.object({
  status: deliveryStatusSchema.optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.number().int().min(1).max(200).default(100),
})

export const listOrgDeliveriesSchema = z.object({
  organizationId: uuid,
  status: deliveryStatusSchema.optional(),
  limit: z.number().int().min(1).max(200).default(100),
})

export const listAssignedDeliveriesSchema = z.object({
  status: deliveryStatusSchema.optional(),
  limit: z.number().int().min(1).max(200).default(100),
})

export const listLogisticsCandidatesSchema = z.object({
  search: z.string().trim().max(120).optional(),
  limit: z.number().int().min(1).max(200).default(100),
})
