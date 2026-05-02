import { z } from 'zod'
import { nonEmpty, positiveInt, uuid } from './_shared'

export const requestTransferSchema = z.object({
  listingId: uuid,
  requesterOrgId: uuid,
  quantityRequested: positiveInt,
  intendedUse: nonEmpty(1000),
})

export const adminApproveTransferSchema = z.object({
  transferRequestId: uuid,
  notes: z.string().trim().max(1000).optional(),
})

export const adminRejectTransferSchema = z.object({
  transferRequestId: uuid,
  reason: nonEmpty(500),
})

export const sellerAcceptSchema = z.object({
  transferRequestId: uuid,
  notes: z.string().trim().max(1000).optional(),
})

export const sellerDeclineSchema = z.object({
  transferRequestId: uuid,
  reason: nonEmpty(500),
})

export const cancelTransferSchema = z.object({
  transferRequestId: uuid,
  reason: nonEmpty(500),
})
