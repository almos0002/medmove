import { z } from 'zod'
import { nonEmpty, positiveInt, uuid } from './_shared'

export const listingStatusSchema = z.enum([
  'draft',
  'pending_admin',
  'active',
  'rejected',
  'sold_out',
  'expired',
  'withdrawn',
])

export const listingTypeSchema = z.enum(['donation', 'sale'])
export type ListingType = z.infer<typeof listingTypeSchema>

export const listingExpiryWindowSchema = z.enum([
  'expired',
  'critical',
  'expiring_soon',
  'safe',
])
export type ListingExpiryWindow = z.infer<typeof listingExpiryWindowSchema>

export const createListingSchema = z.object({
  batchId: uuid,
  quantityListed: positiveInt,
  pricePerUnitCents: z.number().int().nonnegative().nullable().default(null),
  currency: z.string().trim().length(3).default('USD'),
  photoUrls: z.array(z.string().url()).max(8).default([]),
  notes: z.string().trim().max(2000).optional(),
  pickupCity: nonEmpty(120),
  pickupCountry: nonEmpty(2),
})
export type CreateListingInput = z.infer<typeof createListingSchema>

export const submitListingSchema = z.object({ listingId: uuid })

export const withdrawListingSchema = z.object({ listingId: uuid })

export const adminApproveListingSchema = z.object({
  listingId: uuid,
  notes: z.string().trim().max(1000).optional(),
})

export const adminRejectListingSchema = z.object({
  listingId: uuid,
  reason: nonEmpty(500),
})

export const listActiveListingsSchema = z.object({
  city: z.string().trim().max(120).optional(),
  limit: z.number().int().positive().max(100).default(50),
})

export const adminPendingListingsSchema = z.object({
  limit: z.number().int().positive().max(100).default(50),
})

export const getListingSchema = z.object({ id: uuid })

export const listMyListingsSchema = z.object({
  organizationId: uuid,
  status: listingStatusSchema.optional(),
  medicineSearch: z.string().trim().max(120).optional(),
  listingType: listingTypeSchema.optional(),
  expiryWindow: listingExpiryWindowSchema.optional(),
  limit: z.number().int().positive().max(100).default(100),
})

export const adminListAllListingsSchema = z.object({
  status: listingStatusSchema.optional(),
  medicineSearch: z.string().trim().max(120).optional(),
  orgSearch: z.string().trim().max(120).optional(),
  listingType: listingTypeSchema.optional(),
  expiryWindow: listingExpiryWindowSchema.optional(),
  limit: z.number().int().positive().max(100).default(100),
})

export const listMarketplaceListingsSchema = z.object({
  medicineSearch: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
  expiryWindow: listingExpiryWindowSchema.optional(),
  limit: z.number().int().positive().max(50).default(50),
})

export const getMarketplaceListingSchema = z.object({ id: uuid })
