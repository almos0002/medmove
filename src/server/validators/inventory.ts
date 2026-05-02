import { z } from 'zod'
import { isoDate, nonEmpty, positiveInt, uuid } from './_shared'

export const storageTypeSchema = z.enum([
  'room_temperature',
  'cool_dry_place',
  'refrigerated',
])

export const sealedStatusSchema = z.enum(['sealed', 'opened'])

export const expiryStatusSchema = z.enum([
  'safe',
  'expiring_soon',
  'critical',
  'expired',
])

export const createBatchSchema = z
  .object({
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
  .superRefine((v, ctx) => {
    if (v.manufactureDate && v.manufactureDate > v.expiryDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['manufactureDate'],
        message: 'Manufacture date must be before expiry date',
      })
    }
  })

export const listBatchesSchema = z.object({
  organizationId: uuid,
  medicineSearch: z.string().trim().max(120).optional(),
  batchNumberSearch: z.string().trim().max(80).optional(),
  expiryStatus: expiryStatusSchema.optional(),
  sealedStatus: sealedStatusSchema.optional(),
  storageType: storageTypeSchema.optional(),
})

export const getBatchSchema = z.object({ id: uuid })
