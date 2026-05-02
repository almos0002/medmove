import { z } from 'zod'
import { nonEmpty, uuid } from './_shared'

export const orgTypeSchema = z.enum([
  'pharmacy',
  'hospital',
  'clinic',
  'ngo',
  'distributor',
  'logistics_partner',
])

export const docTypeSchema = z.enum([
  'pharmacy_license',
  'business_registration',
  'tax_certificate',
  'authorized_person_id',
  'other',
])

export const createOrganizationSchema = z.object({
  name: nonEmpty(200),
  type: orgTypeSchema,
  licenseNumber: nonEmpty(120),
  contactEmail: z.string().trim().email().max(200),
  contactPhone: nonEmpty(40),
  addressLine1: nonEmpty(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: nonEmpty(120),
  state: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().max(20).optional(),
  country: nonEmpty(2),
})
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>

export const uploadDocumentSchema = z.object({
  organizationId: uuid,
  documentType: docTypeSchema,
  fileUrl: z.string().url().max(2000),
  fileName: nonEmpty(255),
  mimeType: nonEmpty(100),
  sizeBytes: z.number().int().nonnegative().nullable().optional(),
})

export const reviewOrganizationSchema = z.object({
  organizationId: uuid,
  reason: z.string().trim().max(500).optional(),
})

export const rejectOrganizationSchema = z.object({
  organizationId: uuid,
  reason: nonEmpty(500),
})

export const reviewDocumentSchema = z.object({
  documentId: uuid,
  notes: z.string().trim().max(500).optional(),
})

export const rejectDocumentSchema = z.object({
  documentId: uuid,
  reason: nonEmpty(500),
})

/**
 * Admin-only payload to toggle per-org capability flags. At least one
 * capability must be present (otherwise the call is a no-op and almost
 * certainly a client bug).
 */
export const listOrganizationsSchema = z.object({
  status: z
    .enum(['pending', 'verified', 'rejected', 'suspended'])
    .optional(),
  type: orgTypeSchema.optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
})
export type ListOrganizationsInput = z.infer<typeof listOrganizationsSchema>

export const getOrganizationSchema = z.object({
  organizationId: uuid,
})
export type GetOrganizationInput = z.infer<typeof getOrganizationSchema>

export const updateOrganizationCapabilitiesSchema = z
  .object({
    organizationId: uuid,
    canListMedicine: z.boolean().optional(),
    canRequestMedicine: z.boolean().optional(),
    canDeliverMedicine: z.boolean().optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .refine(
    (v) =>
      v.canListMedicine !== undefined ||
      v.canRequestMedicine !== undefined ||
      v.canDeliverMedicine !== undefined,
    {
      message: 'At least one capability flag must be provided',
      path: ['canListMedicine'],
    },
  )
