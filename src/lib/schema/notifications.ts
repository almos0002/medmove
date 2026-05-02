import { relations, sql } from 'drizzle-orm'
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { user } from '../auth-schema'
import { organizations } from './organizations'

/**
 * Step 12 — In-app notifications.
 *
 * Every notification is materialised per recipient user so that read state is
 * always per-user. Org / admin events are fanned out at write-time to one row
 * per current member / current admin (see `createForOrg` / `createForAdmins`
 * in `src/server/notifications/index.ts`).
 *
 * Columns:
 *   - audience           — informational tag of the originating audience
 *                          ('user' | 'organization' | 'admins'), useful for
 *                          UI grouping; visibility is enforced solely by
 *                          recipient_user_id.
 *   - recipient_user_id  — the user this row belongs to (NOT NULL).
 *   - recipient_org_id   — for audience='organization' rows: the org context
 *                          (nullable).
 *   - read_at            — per-user read timestamp.
 *
 * Dedup: a unique index on (recipient_user_id, entity_type, entity_id, type)
 * lets the daily expiry scan use INSERT … ON CONFLICT DO NOTHING to guarantee
 * at most one row per (user, batch, alert level). Plain notifications opt out
 * of the conflict clause and may legitimately repeat.
 */
export const notificationAudienceEnum = pgEnum('notification_audience', [
  'user',
  'organization',
  'admins',
])

export const notificationSeverityEnum = pgEnum('notification_severity', [
  'info',
  'success',
  'warning',
  'critical',
])

export const notificationTypeEnum = pgEnum('notification_type', [
  // organisation lifecycle
  'organization.pending_verification',
  'organization.verified',
  'organization.rejected',
  'organization.suspended',
  // listings
  'listing.pending_review',
  'listing.approved',
  'listing.rejected',
  'listing.withdrawn',
  // transfer requests
  'transfer_request.created',
  'transfer_request.admin_approved',
  'transfer_request.admin_rejected',
  'transfer_request.seller_accepted',
  'transfer_request.seller_declined',
  // deliveries
  'delivery.created',
  'delivery.logistics_assigned',
  'delivery.pickup_scheduled',
  'delivery.in_transit',
  'delivery.delivered',
  'delivery.failed',
  // inventory expiry alerts
  'inventory.expiring_soon',
  'inventory.critical_expiry',
  'inventory.expired',
  'inventory.safe',
])

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    audience: notificationAudienceEnum('audience').notNull(),
    recipientUserId: text('recipient_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    recipientOrgId: uuid('recipient_org_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    type: notificationTypeEnum('type').notNull(),
    severity: notificationSeverityEnum('severity').notNull().default('info'),
    title: text('title').notNull(),
    body: text('body'),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    link: text('link'),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    readAt: timestamp('read_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('notifications_recipient_user_idx').on(
      t.recipientUserId,
      t.createdAt,
    ),
    index('notifications_audience_idx').on(t.audience, t.createdAt),
    index('notifications_entity_idx').on(t.entityType, t.entityId),
    index('notifications_unread_user_idx')
      .on(t.recipientUserId)
      .where(sql`read_at IS NULL`),
    // Dedup: at most one (user, entity, type) row — used by the expiry scan
    // to be safely re-runnable across re-execution.
    uniqueIndex('notifications_user_entity_type_uq').on(
      t.recipientUserId,
      t.entityType,
      t.entityId,
      t.type,
    ),
  ],
)

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipientUser: one(user, {
    fields: [notifications.recipientUserId],
    references: [user.id],
  }),
  recipientOrg: one(organizations, {
    fields: [notifications.recipientOrgId],
    references: [organizations.id],
  }),
}))
