import { relations } from 'drizzle-orm'
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { user } from '../auth-schema'
import { organizations } from './organizations'

/**
 * Append-only audit log. Every state-changing action in the platform writes
 * one row here, in the same DB transaction as the change itself. Never UPDATE
 * or DELETE rows from this table — enforce in app code (and ideally revoke
 * those grants in production).
 *
 * `before` and `after` capture the relevant entity snapshot for the action.
 * `metadata` is freeform: ip, user_agent, request_id, reason, etc.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: text('actor_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    actorOrgId: uuid('actor_org_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    action: text('action').notNull(), // e.g. 'organization.verified', 'listing.approved'
    entityType: text('entity_type').notNull(), // e.g. 'organization', 'listing'
    entityId: text('entity_id').notNull(), // uuid or text id of the entity
    before: jsonb('before').$type<Record<string, unknown> | null>(),
    after: jsonb('after').$type<Record<string, unknown> | null>(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('audit_logs_entity_idx').on(t.entityType, t.entityId),
    index('audit_logs_actor_user_idx').on(t.actorUserId),
    index('audit_logs_actor_org_idx').on(t.actorOrgId),
    index('audit_logs_created_at_idx').on(t.createdAt),
  ],
)

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actorUser: one(user, {
    fields: [auditLogs.actorUserId],
    references: [user.id],
  }),
  actorOrg: one(organizations, {
    fields: [auditLogs.actorOrgId],
    references: [organizations.id],
  }),
}))
