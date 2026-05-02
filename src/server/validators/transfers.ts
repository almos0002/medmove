import { z } from 'zod'
import { nonEmpty, positiveInt, uuid } from './_shared'
import { listingExpiryWindowSchema } from './listings'

/**
 * Mirrors `transferRequestStatusEnum` in `src/lib/schema/enums.ts`. Used for
 * URL search filters and admin/org list queries.
 */
export const transferRequestStatusSchema = z.enum([
  'pending_admin',
  'rejected',
  'pending_seller',
  'declined',
  'accepted',
  'awaiting_handoff',
  'dispatched',
  'completed',
  'expired',
  'cancelled',
])
export type TransferRequestStatus = z.infer<typeof transferRequestStatusSchema>

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
  reason: z.string().trim().min(5).max(500),
})

export const getTransferRequestSchema = z.object({ id: uuid })

export const listMyTransferRequestsSchema = z.object({
  organizationId: uuid,
  status: transferRequestStatusSchema.optional(),
  medicineSearch: z.string().trim().max(120).optional(),
  expiryWindow: listingExpiryWindowSchema.optional(),
  limit: z.number().int().positive().max(100).default(100),
})

/**
 * Same shape as `listMyTransferRequestsSchema` — used by the seller-side
 * "incoming requests" page (requests against my org's listings).
 */
export const listIncomingTransferRequestsSchema = listMyTransferRequestsSchema

export const adminListTransferRequestsSchema = z.object({
  status: transferRequestStatusSchema.optional(),
  medicineSearch: z.string().trim().max(120).optional(),
  requesterOrgSearch: z.string().trim().max(120).optional(),
  sellerOrgSearch: z.string().trim().max(120).optional(),
  expiryWindow: listingExpiryWindowSchema.optional(),
  limit: z.number().int().positive().max(100).default(100),
})
