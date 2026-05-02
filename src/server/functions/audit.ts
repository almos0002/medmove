import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/lib/db'
import { auditLogs, organizations } from '@/lib/schema'
import { user as userTable } from '@/lib/auth-schema'
import { isAdminRole } from '@/lib/permissions'
import { getRequestContext } from '../context'
import { AppError, toClientError } from '../errors'
import { requireAdmin } from '../guards/require-admin'
import { requireAuth } from '../guards/require-auth'
import { requireOrgMember } from '../guards/require-org'
import {
  getAuditLogSchema,
  listAuditLogsSchema,
  orgScopeSchema,
  recentActivitySchema,
} from '../validators/audit'

const actorUser = alias(userTable, 'audit_actor_user')
const actorOrg = alias(organizations, 'audit_actor_org')

const SELECT_SHAPE = {
  log: {
    id: auditLogs.id,
    actorUserId: auditLogs.actorUserId,
    actorOrgId: auditLogs.actorOrgId,
    action: auditLogs.action,
    entityType: auditLogs.entityType,
    entityId: auditLogs.entityId,
    before: auditLogs.before,
    after: auditLogs.after,
    metadata: auditLogs.metadata,
    ipAddress: auditLogs.ipAddress,
    userAgent: auditLogs.userAgent,
    createdAt: auditLogs.createdAt,
  },
  actorUser: {
    id: actorUser.id,
    email: actorUser.email,
    name: actorUser.name,
    role: actorUser.role,
  },
  actorOrg: {
    id: actorOrg.id,
    name: actorOrg.name,
    type: actorOrg.type,
  },
} as const

function buildFilters(data: {
  action?: string
  entityType?: string
  entityId?: string
  actorUserId?: string
  actorOrgId?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}) {
  return and(
    data.action ? eq(auditLogs.action, data.action) : undefined,
    data.entityType ? eq(auditLogs.entityType, data.entityType) : undefined,
    data.entityId ? eq(auditLogs.entityId, data.entityId) : undefined,
    data.actorUserId ? eq(auditLogs.actorUserId, data.actorUserId) : undefined,
    data.actorOrgId ? eq(auditLogs.actorOrgId, data.actorOrgId) : undefined,
    data.dateFrom
      ? gte(auditLogs.createdAt, new Date(`${data.dateFrom}T00:00:00.000Z`))
      : undefined,
    data.dateTo
      ? lte(auditLogs.createdAt, new Date(`${data.dateTo}T23:59:59.999Z`))
      : undefined,
    data.search
      ? or(
          ilike(auditLogs.action, `%${data.search}%`),
          ilike(actorUser.email, `%${data.search}%`),
          ilike(actorOrg.name, `%${data.search}%`),
          ilike(auditLogs.entityId, `%${data.search}%`),
        )
      : undefined,
  )
}

/**
 * Admin: list audit log rows with rich joins (actor user + actor org). Paged.
 *
 * The audit_logs table is append-only — there is no `update` or `delete`
 * server function in this module by design.
 */
export const adminListAuditLogs = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => listAuditLogsSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      requireAdmin(ctx)

      const where = buildFilters(data)
      const limit = data.limit ?? 50
      const offset = data.offset ?? 0

      const rows = await db
        .select(SELECT_SHAPE)
        .from(auditLogs)
        .leftJoin(actorUser, eq(actorUser.id, auditLogs.actorUserId))
        .leftJoin(actorOrg, eq(actorOrg.id, auditLogs.actorOrgId))
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset)

      const [{ value: total }] = await db
        .select({ value: sql<number>`count(*)::int` })
        .from(auditLogs)
        .leftJoin(actorUser, eq(actorUser.id, auditLogs.actorUserId))
        .leftJoin(actorOrg, eq(actorOrg.id, auditLogs.actorOrgId))
        .where(where)

      return {
        ok: true as const,
        items: rows,
        total,
        limit,
        offset,
      }
    } catch (e) {
      throw toClientError(e)
    }
  })

/**
 * Org-scoped audit log feed. Any member of the org may view its own log.
 * Admins may also view any org's log this way (handy from the org detail
 * page). Filters identical to admin list but `actorOrgId` is forced.
 */
export const listOrgAuditLogs = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) =>
    listAuditLogsSchema.merge(orgScopeSchema).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const actor = requireAuth(ctx)
      if (!isAdminRole(actor.role)) {
        await requireOrgMember(ctx, data.organizationId)
      }

      const where = and(
        eq(auditLogs.actorOrgId, data.organizationId),
        buildFilters({ ...data, actorOrgId: undefined }),
      )
      const limit = data.limit ?? 50
      const offset = data.offset ?? 0

      const rows = await db
        .select(SELECT_SHAPE)
        .from(auditLogs)
        .leftJoin(actorUser, eq(actorUser.id, auditLogs.actorUserId))
        .leftJoin(actorOrg, eq(actorOrg.id, auditLogs.actorOrgId))
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset)

      const [{ value: total }] = await db
        .select({ value: sql<number>`count(*)::int` })
        .from(auditLogs)
        .leftJoin(actorUser, eq(actorUser.id, auditLogs.actorUserId))
        .leftJoin(actorOrg, eq(actorOrg.id, auditLogs.actorOrgId))
        .where(where)

      return {
        ok: true as const,
        items: rows,
        total,
        limit,
        offset,
        organizationId: data.organizationId,
      }
    } catch (e) {
      throw toClientError(e)
    }
  })

/**
 * Single audit log entry. Admins may fetch any row; org users may only fetch
 * a row whose `actorOrgId` matches their primary org.
 */
export const getAuditLog = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => getAuditLogSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const actor = requireAuth(ctx)

      const [row] = await db
        .select(SELECT_SHAPE)
        .from(auditLogs)
        .leftJoin(actorUser, eq(actorUser.id, auditLogs.actorUserId))
        .leftJoin(actorOrg, eq(actorOrg.id, auditLogs.actorOrgId))
        .where(eq(auditLogs.id, data.id))
        .limit(1)

      if (!row) throw new AppError('NOT_FOUND', 'Audit log entry not found')

      if (!isAdminRole(actor.role)) {
        if (
          !ctx.primaryOrg ||
          row.log.actorOrgId !== ctx.primaryOrg.id
        ) {
          throw new AppError(
            'FORBIDDEN',
            'This audit entry is outside your organization',
          )
        }
      }

      return { ok: true as const, ...row }
    } catch (e) {
      throw toClientError(e)
    }
  })

/**
 * Recent activity feed for dashboards. If `organizationId` is provided the
 * caller must be a member (or admin). Otherwise, admin-only platform feed.
 */
export const listRecentActivity = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => recentActivitySchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const actor = requireAuth(ctx)

      let where
      if (data.organizationId) {
        if (!isAdminRole(actor.role)) {
          await requireOrgMember(ctx, data.organizationId)
        }
        where = eq(auditLogs.actorOrgId, data.organizationId)
      } else {
        if (!isAdminRole(actor.role)) {
          throw new AppError(
            'FORBIDDEN',
            'Only admins may view the platform-wide feed',
          )
        }
        where = undefined
      }

      const rows = await db
        .select(SELECT_SHAPE)
        .from(auditLogs)
        .leftJoin(actorUser, eq(actorUser.id, auditLogs.actorUserId))
        .leftJoin(actorOrg, eq(actorOrg.id, auditLogs.actorOrgId))
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(data.limit ?? 15)

      return { ok: true as const, items: rows }
    } catch (e) {
      throw toClientError(e)
    }
  })
