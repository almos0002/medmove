import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  organizationDocuments,
  organizationMembers,
  organizations,
} from '@/lib/schema'
import { writeAudit } from '../audit'
import {
  createForAdmins,
  createForOrg,
  dispatchNotificationsAfterCommit,
  type NotificationRow,
} from '../notifications'
import { getRequestContext } from '../context'
import { AppError, toClientError } from '../errors'
import { requireAuth } from '../guards/require-auth'
import { requireOrgMember } from '../guards/require-org'
import { defaultCapabilitiesForType, isAdminRole } from '@/lib/permissions'
import { requireAdmin } from '../guards/require-admin'
import { ORG_TRANSITIONS, assertTransition } from '../transitions'
import {
  createOrganizationSchema,
  getOrganizationSchema,
  listOrganizationsSchema,
  rejectDocumentSchema,
  rejectOrganizationSchema,
  reviewDocumentSchema,
  reviewOrganizationSchema,
  updateOrganizationCapabilitiesSchema,
  uploadDocumentSchema,
} from '../validators/organizations'

export const createOrganization = createServerFn({ method: 'POST', strict: { output: false } })
  .inputValidator((d: unknown) => createOrganizationSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const user = requireAuth(ctx)

      // Seed capability flags from the org type so the org has sensible
      // defaults the moment it's verified. Admins can flip any of these
      // afterwards via `adminUpdateOrganizationCapabilities`.
      const caps = defaultCapabilitiesForType(data.type)

      const notifs: NotificationRow[] = []
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
            canListMedicine: caps.canListMedicine,
            canRequestMedicine: caps.canRequestMedicine,
            canDeliverMedicine: caps.canDeliverMedicine,
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

        const n = await createForAdmins({
          tx,
          type: 'organization.pending_verification',
          severity: 'info',
          title: 'New organization awaiting verification',
          body: `${org.name} (${org.type}) registered and is awaiting review.`,
          entityType: 'organization',
          entityId: org.id,
          link: `/admin/organizations/${org.id}`,
        })
        notifs.push(...n)

        return org
      })
      void dispatchNotificationsAfterCommit(notifs)
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
      if (org.verificationStatus === 'verified' && !isAdminRole(user.role)) {
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
      const admin = requireAdmin(ctx)

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
      const admin = requireAdmin(ctx)

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
      const admin = requireAdmin(ctx)

      const notifs: NotificationRow[] = []
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
        const n = await createForOrg({
          tx,
          orgId: after.id,
          type: 'organization.verified',
          severity: 'success',
          title: 'Your organization is verified',
          body: `${after.name} can now use its assigned MedMove capabilities.`,
          entityType: 'organization',
          entityId: after.id,
          link: '/org',
        })
        notifs.push(...n)
        return after
      })

      void dispatchNotificationsAfterCommit(notifs)
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
      requireAdmin(ctx)

      const notifs: NotificationRow[] = []
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
        const n = await createForOrg({
          tx,
          orgId: after.id,
          type: 'organization.rejected',
          severity: 'critical',
          title: 'Organization verification rejected',
          body: data.reason,
          entityType: 'organization',
          entityId: after.id,
          link: '/org',
        })
        notifs.push(...n)
        return after
      })

      void dispatchNotificationsAfterCommit(notifs)
      return { ok: true as const, organization: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

/**
 * Admin-only: toggle the per-org capability flags. Only the flags supplied
 * in the payload are changed (PATCH semantics). At least one flag must be
 * present (enforced by the validator).
 */
export const adminUpdateOrganizationCapabilities = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) =>
    updateOrganizationCapabilitiesSchema.parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      requireAdmin(ctx)

      const result = await db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(organizations)
          .where(eq(organizations.id, data.organizationId))
          .limit(1)
        if (!before) throw new AppError('NOT_FOUND', 'Organization not found')

        const patch: Partial<typeof organizations.$inferInsert> = {}
        if (data.canListMedicine !== undefined)
          patch.canListMedicine = data.canListMedicine
        if (data.canRequestMedicine !== undefined)
          patch.canRequestMedicine = data.canRequestMedicine
        if (data.canDeliverMedicine !== undefined)
          patch.canDeliverMedicine = data.canDeliverMedicine

        const updated = await tx
          .update(organizations)
          .set(patch)
          .where(eq(organizations.id, data.organizationId))
          .returning()
        const after = updated[0]!

        await writeAudit({
          ctx,
          tx,
          action: 'organization.capabilities_updated',
          entityType: 'organization',
          entityId: after.id,
          before: {
            canListMedicine: before.canListMedicine,
            canRequestMedicine: before.canRequestMedicine,
            canDeliverMedicine: before.canDeliverMedicine,
          } as Record<string, unknown>,
          after: {
            canListMedicine: after.canListMedicine,
            canRequestMedicine: after.canRequestMedicine,
            canDeliverMedicine: after.canDeliverMedicine,
          } as Record<string, unknown>,
          metadata: { reason: data.reason ?? null },
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
      requireAdmin(ctx)

      const notifs: NotificationRow[] = []
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
        const n = await createForOrg({
          tx,
          orgId: after.id,
          type: 'organization.suspended',
          severity: 'critical',
          title: 'Organization suspended',
          body: data.reason,
          entityType: 'organization',
          entityId: after.id,
          link: '/org',
        })
        notifs.push(...n)
        return after
      })

      void dispatchNotificationsAfterCommit(notifs)
      return { ok: true as const, organization: result }
    } catch (e) {
      throw toClientError(e)
    }
  })

// ─── Step 6 reads — onboarding & verification UI ──────────────────────────

/**
 * Returns the current user's primary organization (the first row in
 * organization_members for them) plus its documents. If the user has no
 * org yet, returns `{ organization: null }` so the onboarding flow can
 * render its empty state. Admins calling this fn get their own primary
 * org if they have one — admins normally use `adminGetOrganizationById`
 * to inspect a specific org.
 */
export const getMyOrganization = createServerFn({
  method: 'GET',
  strict: { output: false },
}).handler(async () => {
  try {
    const ctx = await getRequestContext()
    const user = requireAuth(ctx)

    const [membership] = await db
      .select({
        org: organizations,
        memberRole: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(
        organizations,
        eq(organizations.id, organizationMembers.organizationId),
      )
      .where(eq(organizationMembers.userId, user.id))
      .limit(1)

    if (!membership) {
      return { ok: true as const, organization: null, documents: [] as const }
    }

    const docs = await db
      .select()
      .from(organizationDocuments)
      .where(eq(organizationDocuments.organizationId, membership.org.id))
      .orderBy(desc(organizationDocuments.createdAt))

    return {
      ok: true as const,
      organization: membership.org,
      memberRole: membership.memberRole,
      documents: docs,
    }
  } catch (e) {
    throw toClientError(e)
  }
})

/**
 * List documents for an org. Members of that org or admins may read.
 * Used by the org documents page and the admin org detail page.
 */
export const listOrganizationDocuments = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => getOrganizationSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const actor = requireAuth(ctx)
      if (!isAdminRole(actor.role)) {
        await requireOrgMember(ctx, data.organizationId)
      }
      const docs = await db
        .select()
        .from(organizationDocuments)
        .where(eq(organizationDocuments.organizationId, data.organizationId))
        .orderBy(desc(organizationDocuments.createdAt))
      return { ok: true as const, documents: docs }
    } catch (e) {
      throw toClientError(e)
    }
  })

/**
 * Admin-only: list organisations with optional status / type / name
 * filters. Returns rows with each org's pending-document count so the
 * admin queue can prioritise the ones with paperwork ready to review.
 */
export const adminListOrganizations = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => listOrganizationsSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      requireAdmin(ctx)

      const limit = data.limit ?? 50
      const offset = data.offset ?? 0
      const where = and(
        data.status ? eq(organizations.verificationStatus, data.status) : undefined,
        data.type ? eq(organizations.type, data.type) : undefined,
        data.search
          ? or(
              ilike(organizations.name, `%${data.search}%`),
              ilike(organizations.licenseNumber, `%${data.search}%`),
              ilike(organizations.contactEmail, `%${data.search}%`),
            )
          : undefined,
      )

      const rows = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          type: organizations.type,
          city: organizations.city,
          country: organizations.country,
          contactEmail: organizations.contactEmail,
          licenseNumber: organizations.licenseNumber,
          verificationStatus: organizations.verificationStatus,
          canListMedicine: organizations.canListMedicine,
          canRequestMedicine: organizations.canRequestMedicine,
          canDeliverMedicine: organizations.canDeliverMedicine,
          createdAt: organizations.createdAt,
          verifiedAt: organizations.verifiedAt,
          rejectionReason: organizations.rejectionReason,
          pendingDocCount: sql<number>`(
            select count(*)::int from ${organizationDocuments}
            where ${organizationDocuments.organizationId} = ${organizations.id}
              and ${organizationDocuments.status} = 'pending'
          )`,
        })
        .from(organizations)
        .where(where)
        .orderBy(desc(organizations.createdAt))
        .limit(limit)
        .offset(offset)

      const [{ count } = { count: 0 }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(organizations)
        .where(where)

      return { ok: true as const, organizations: rows, total: count }
    } catch (e) {
      throw toClientError(e)
    }
  })

/**
 * Admin-only: read one organisation with its documents and member count
 * for the admin detail page.
 */
export const adminGetOrganizationById = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => getOrganizationSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      requireAdmin(ctx)

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, data.organizationId))
        .limit(1)
      if (!org) throw new AppError('NOT_FOUND', 'Organization not found')

      const docs = await db
        .select()
        .from(organizationDocuments)
        .where(eq(organizationDocuments.organizationId, org.id))
        .orderBy(desc(organizationDocuments.createdAt))

      const [{ count } = { count: 0 }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(organizationMembers)
        .where(eq(organizationMembers.organizationId, org.id))

      return {
        ok: true as const,
        organization: org,
        documents: docs,
        memberCount: count,
      }
    } catch (e) {
      throw toClientError(e)
    }
  })
