import { z } from 'zod'
import { uuid } from './_shared'
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '@/lib/audit-events'

const optionalStr = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v.length === 0 ? undefined : v))
    .optional()

/**
 * Filters for the admin audit logs table. All optional — caller may scope
 * by any subset.
 *   - dateFrom / dateTo: inclusive YYYY-MM-DD strings (server widens dateTo
 *     to end-of-day so "2026-01-15" includes events at 23:59).
 */
export const listAuditLogsSchema = z.object({
  action: z
    .union([z.enum(AUDIT_ACTIONS), z.string().trim().min(1).max(120)])
    .optional(),
  entityType: z.enum(AUDIT_ENTITY_TYPES).optional(),
  entityId: optionalStr(120),
  actorUserId: optionalStr(120),
  actorOrgId: z.string().uuid().optional(),
  search: optionalStr(120),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
})
export type ListAuditLogsInput = z.infer<typeof listAuditLogsSchema>

export const getAuditLogSchema = z.object({ id: uuid })
export type GetAuditLogInput = z.infer<typeof getAuditLogSchema>

export const orgScopeSchema = z.object({ organizationId: uuid })
export type OrgScopeInput = z.infer<typeof orgScopeSchema>

export const recentActivitySchema = z.object({
  organizationId: uuid.optional(),
  limit: z.number().int().min(1).max(50).optional(),
})
export type RecentActivityInput = z.infer<typeof recentActivitySchema>
