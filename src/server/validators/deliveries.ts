import { z } from 'zod'
import { nonEmpty, nonNegativeInt, uuid } from './_shared'

export const dispatchMethodSchema = z.enum([
  'buyer_pickup',
  'seller_drop_off',
  'third_party_courier',
])

export const scheduleDeliverySchema = z.object({
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

export const markDispatchedSchema = z.object({
  deliveryId: uuid,
  courierReference: z.string().trim().max(200).optional(),
  dispatchNotes: z.string().trim().max(2000).optional(),
})

export const confirmDeliverySchema = z.object({
  deliveryId: uuid,
  receivedQuantity: nonNegativeInt,
  receiptNotes: z.string().trim().max(2000).optional(),
})

export const disputeDeliverySchema = z.object({
  deliveryId: uuid,
  reason: nonEmpty(1000),
})

export const assignDeliveryLogisticsSchema = z.object({
  deliveryId: uuid,
  logisticsUserId: nonEmpty(255),
  logisticsOrgId: uuid,
  notes: z.string().trim().max(1000).optional(),
})

export const listAssignedDeliveriesSchema = z.object({
  limit: z.number().int().min(1).max(200).default(50),
})
