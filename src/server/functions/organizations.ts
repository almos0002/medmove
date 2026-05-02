import { createServerFn } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  organizationDocuments,
  organizationMembers,
  organizations,
} from '@/lib/schema'
import { writeAudit } from '../audit'
import { getRequestContext } from '../context'
import { AppError, toClientError } from '../errors'
import { requireAuth } from '../guards/require-auth'
import { requireOrgMember } from '../guards/require-org'
import { requireRole } from '../guards/require-role'
import { ORG_TRANSITIONS, assertTransition } from '../transitions'
import {
  createOrganizationSchema,
  rejectDocumentSchema,
  rejectOrganizationSchema,
  reviewDocumentSchema,
  reviewOrganizationSchema,
  uploadDocumentSchema,
} from '../validators/organizations'

export const createOrganization = createServerFn({ method: 'POST', strict: { output: false } })
  .inputValidator((d: unknown) => createOrganizationSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const user = requireAuth(ctx)

      const created = await db.transaction(async (tx) => {
        const [org] = await tx
          .insert(organizations)
          .values({
            name: data.name,
            type: data.type,
            licenseNumber: data.licenseNumber,
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone,
            addressLine1: data.addressLine1,
            addressLine2: data.addressLine2 ?? null,
            city: data.city,
            state: data.state ?? null,
            postalCode: data.postalCode ?? null,
            country: data.country,
          })
          .returning()

        await tx.insert(organizationMembers).values({
          organizationId: org.id,
          userId: user.id,
          role: 'owner',
        })

        await writeAudit({
          ctx,
          tx,
          action: 'organization.created',
          entityType: 'organization',
          entityId: org.id,
          after: org as unknown as Record<string, unknown>,
          actorOrgIdOverride: org.id,
        })

        return org
      })

      return { ok: true as const, organization: created }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const uploadOrganizationDocument = createServerFn({ method: 'POST', strict: { output: false } })
  .inputValidator((d: unknown) => uploadDocumentSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const { user } = await requireOrgMember(ctx, data.organizationId)

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, data.organizationId))
        .limit(1)
      if (!org) throw new AppError('NOT_FOUND', 'Organization not found')
      if (org.verificationStatus === 'verified' && user.role !== 'admin') {
        throw new AppError(
          'FORBIDDEN',
          'Cannot upload documents to a verified organization',
        )
      }

      const created = await db.transaction(async (tx) => {
        const [doc] = await tx
          .insert(organizationDocuments)
          .values({
            organizationId: data.organizationId,
            documentType: data.documentType,
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            mimeType: data.mimeType,
            sizeBytes: data.sizeBytes ?? null,
            uploadedByUserId: user.id,
          })
          .returning()

        await writeAudit({
          ctx,
          tx,
          action: 'organization_document.uploaded',
          entityType: 'organization_document',
          entityId: doc.id,
          after: doc as unknown as Record<string, unknown>,
          actorOrgIdOverride: data.organizationId,
        })

        return doc
      })

      return { ok: true as const, document: created }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const adminApproveDocument = createServerFn({ method: 'POST', strict: { output: false } })
  .inputValidator((d: unknown) => reviewDocumentSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const admin = requireRole(ctx, 'admin')

      const result = await db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(organizationDocuments)
          .where(eq(organizationDocuments.id, data.documentId))
          .limit(1)
        if (!before) throw new AppError('NOT_FOUND', 'Document not found')
        if (before.status !== 'pending') {
          throw new AppError(
            'INVALID_TRANSITION',
            `Cannot approve document in status '${before.status}'`,
          )
        }
        const updated = await tx
          .update(organizationDocuments)
          .set({
            status: 'approved',
            reviewedByUserId: admin.id,
            reviewedAt: new Date(),
            reviewNotes: data.notes ?? null,
          })
          .where(
            and(
              eq(organizationDocuments.id, data.documentId),
              eq(organizationDocuments.status, 'pending'),
            ),
          )
          .returning()
        if (updated.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Document status changed concurrently; refresh and try again',
          )
        }
        const after = updated[0]

        await writeAudit({
          ctx,
          tx,
          action: 'organization_document.approved',
          entityType: 'organization_document',
          entityId: after.id,
          before: before as unknown as Record<string, unknown>,
          after: after as unknown as Record<string, unknown>,
          actorOrgIdOverride: before.organizationId,
        })
        return after
      })
      return { ok: true as const, document: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const adminRejectDocument = createServerFn({ method: 'POST', strict: { output: false } })
  .inputValidator((d: unknown) => rejectDocumentSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const admin = requireRole(ctx, 'admin')

      const result = await db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(organizationDocuments)
          .where(eq(organizationDocuments.id, data.documentId))
          .limit(1)
        if (!before) throw new AppError('NOT_FOUND', 'Document not found')
        if (before.status !== 'pending') {
          throw new AppError(
            'INVALID_TRANSITION',
            `Cannot reject document in status '${before.status}'`,
          )
        }
        const updated = await tx
          .update(organizationDocuments)
          .set({
            status: 'rejected',
            reviewedByUserId: admin.id,
            reviewedAt: new Date(),
            reviewNotes: data.reason,
          })
          .where(
            and(
              eq(organizationDocuments.id, data.documentId),
              eq(organizationDocuments.status, 'pending'),
            ),
          )
          .returning()
        if (updated.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Document status changed concurrently; refresh and try again',
          )
        }
        const after = updated[0]

        await writeAudit({
          ctx,
          tx,
          action: 'organization_document.rejected',
          entityType: 'organization_document',
          entityId: after.id,
          before: before as unknown as Record<string, unknown>,
          after: after as unknown as Record<string, unknown>,
          actorOrgIdOverride: before.organizationId,
          metadata: { reason: data.reason },
        })
        return after
      })
      return { ok: true as const, document: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const adminApproveOrganization = createServerFn({ method: 'POST', strict: { output: false } })
  .inputValidator((d: unknown) => reviewOrganizationSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const admin = requireRole(ctx, 'admin')

      const result = await db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(organizations)
          .where(eq(organizations.id, data.organizationId))
          .limit(1)
        if (!before) throw new AppError('NOT_FOUND', 'Organization not found')

        assertTransition(
          ORG_TRANSITIONS,
          before.verificationStatus,
          'verified',
        )

        const docs = await tx
          .select({
            id: organizationDocuments.id,
            documentType: organizationDocuments.documentType,
            status: organizationDocuments.status,
          })
          .from(organizationDocuments)
          .where(
            and(
              eq(organizationDocuments.organizationId, data.organizationId),
            ),
          )
        const hasPrimary = docs.some(
          (d) =>
            d.status === 'approved' &&
            (d.documentType === 'pharmacy_license' ||
              d.documentType === 'business_registration'),
        )
        if (!hasPrimary) {
          throw new AppError(
            'CONFLICT',
            'Organization must have at least one approved pharmacy_license or business_registration document',
          )
        }

        const updated = await tx
          .update(organizations)
          .set({
            verificationStatus: 'verified',
            verifiedAt: new Date(),
            verifiedByUserId: admin.id,
            rejectionReason: null,
          })
          .where(
            and(
              eq(organizations.id, data.organizationId),
              eq(organizations.verificationStatus, before.verificationStatus),
            ),
          )
          .returning()
        if (updated.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Organization status changed concurrently; refresh and try again',
          )
        }
        const after = updated[0]

        await writeAudit({
          ctx,
          tx,
          action: 'organization.verified',
          entityType: 'organization',
          entityId: after.id,
          before: before as unknown as Record<string, unknown>,
          after: after as unknown as Record<string, unknown>,
          metadata: { notes: data.reason ?? null },
          actorOrgIdOverride: after.id,
        })
        return after
      })

      return { ok: true as const, organization: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const adminRejectOrganization = createServerFn({ method: 'POST', strict: { output: false } })
  .inputValidator((d: unknown) => rejectOrganizationSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      requireRole(ctx, 'admin')

      const result = await db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(organizations)
          .where(eq(organizations.id, data.organizationId))
          .limit(1)
        if (!before) throw new AppError('NOT_FOUND', 'Organization not found')
        assertTransition(
          ORG_TRANSITIONS,
          before.verificationStatus,
          'rejected',
        )

        const updated = await tx
          .update(organizations)
          .set({
            verificationStatus: 'rejected',
            rejectionReason: data.reason,
          })
          .where(
            and(
              eq(organizations.id, data.organizationId),
              eq(organizations.verificationStatus, before.verificationStatus),
            ),
          )
          .returning()
        if (updated.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Organization status changed concurrently; refresh and try again',
          )
        }
        const after = updated[0]

        await writeAudit({
          ctx,
          tx,
          action: 'organization.rejected',
          entityType: 'organization',
          entityId: after.id,
          before: before as unknown as Record<string, unknown>,
          after: after as unknown as Record<string, unknown>,
          metadata: { reason: data.reason },
          actorOrgIdOverride: after.id,
        })
        return after
      })

      return { ok: true as const, organization: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const adminSuspendOrganization = createServerFn({ method: 'POST', strict: { output: false } })
  .inputValidator((d: unknown) => rejectOrganizationSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      requireRole(ctx, 'admin')

      const result = await db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(organizations)
          .where(eq(organizations.id, data.organizationId))
          .limit(1)
        if (!before) throw new AppError('NOT_FOUND', 'Organization not found')
        assertTransition(
          ORG_TRANSITIONS,
          before.verificationStatus,
          'suspended',
        )

        const updated = await tx
          .update(organizations)
          .set({
            verificationStatus: 'suspended',
            suspendedAt: new Date(),
            suspensionReason: data.reason,
          })
          .where(
            and(
              eq(organizations.id, data.organizationId),
              eq(organizations.verificationStatus, before.verificationStatus),
            ),
          )
          .returning()
        if (updated.length === 0) {
          throw new AppError(
            'CONFLICT',
            'Organization status changed concurrently; refresh and try again',
          )
        }
        const after = updated[0]

        await writeAudit({
          ctx,
          tx,
          action: 'organization.suspended',
          entityType: 'organization',
          entityId: after.id,
          before: before as unknown as Record<string, unknown>,
          after: after as unknown as Record<string, unknown>,
          metadata: { reason: data.reason },
          actorOrgIdOverride: after.id,
        })
        return after
      })

      return { ok: true as const, organization: result }
    } catch (e) {
      throw toClientError(e)
    }
  })
