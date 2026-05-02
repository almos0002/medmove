import { z } from 'zod'
import { isoDate, nonEmpty, positiveInt, uuid } from './_shared'

export const storageTypeSchema = z.enum([
  'room_temperature',
  'cool_dry_place',
  'refrigerated',
])

export const sealedStatusSchema = z.enum(['sealed', 'opened'])

export const createBatchSchema = z.object({
  organizationId: uuid,
  medicineId: uuid,
  batchNumber: nonEmpty(80),
  manufactureDate: isoDate.optional(),
  expiryDate: isoDate,
  quantityOnHand: positiveInt,
  unit: nonEmpty(40),
  storageType: storageTypeSchema,
  sealedStatus: sealedStatusSchema,
  notes: z.string().trim().max(2000).optional(),
})

export const listBatchesSchema = z.object({
  organizationId: uuid,
})
