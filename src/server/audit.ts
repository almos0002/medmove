import { db } from '@/lib/db'
import { auditLogs } from '@/lib/schema'
import type { RequestContext } from './context'

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0]
type DbOrTx = typeof db | DbTx

export type WriteAuditArgs = {
  ctx: RequestContext
  tx?: DbOrTx
  action: string
  entityType: string
  entityId: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  metadata?: Record<string, unknown>
  actorOrgIdOverride?: string | null
}

export async function writeAudit(args: WriteAuditArgs): Promise<void> {
  const client = args.tx ?? db
  await client.insert(auditLogs).values({
    actorUserId: args.ctx.user?.id ?? null,
    actorOrgId:
      args.actorOrgIdOverride !== undefined
        ? args.actorOrgIdOverride
        : (args.ctx.primaryOrg?.id ?? null),
    action: args.action,
    entityType: args.entityType,
    entityId: args.entityId,
    before: args.before ?? null,
    after: args.after ?? null,
    metadata: args.metadata ?? null,
    ipAddress: args.ctx.ip,
    userAgent: args.ctx.userAgent,
  })
}
