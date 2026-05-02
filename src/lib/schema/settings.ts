import { relations } from 'drizzle-orm'
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { user } from '../auth-schema'

/**
 * Step 14 — per-user notification preferences.
 *
 * One row per user. Channel toggles default to `true` (in-app on, others
 * off until providers are wired in production). `mutedTypes` is a string
 * array of `notificationTypeEnum` values the user has opted out of; an
 * empty array means "all types".
 *
 * The notification *creation* helpers always write the in-app row. The
 * channel dispatcher consults `userNotificationPreferences` before
 * sending email / SMS / WhatsApp.
 */
export const userNotificationPreferences = pgTable(
  'user_notification_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    inAppEnabled: boolean('in_app_enabled').notNull().default(true),
    emailEnabled: boolean('email_enabled').notNull().default(true),
    smsEnabled: boolean('sms_enabled').notNull().default(false),
    whatsappEnabled: boolean('whatsapp_enabled').notNull().default(false),
    /**
     * `notificationTypeEnum` values the user has explicitly opted out of.
     * Stored as text[] so the enum can grow without a migration here.
     */
    mutedTypes: jsonb('muted_types').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [uniqueIndex('user_notification_preferences_user_uq').on(t.userId)],
)

export const userNotificationPreferencesRelations = relations(
  userNotificationPreferences,
  ({ one }) => ({
    user: one(user, {
      fields: [userNotificationPreferences.userId],
      references: [user.id],
    }),
  }),
)

/**
 * Step 14 — single-row platform settings table edited by super_admin /
 * admin from `/admin/settings`. We use a singleton pattern (always one
 * row, identified by the `singleton` boolean) instead of a KV table to
 * keep typed access trivial.
 *
 * `featureFlags` is a freeform JSON map for future toggles; the typed
 * accessor in `getPlatformSettings` exposes only the keys the app
 * actually reads.
 */
export const platformSettings = pgTable(
  'platform_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    singleton: boolean('singleton').notNull().default(true),
    siteName: text('site_name').notNull().default('MedMove'),
    supportEmail: text('support_email')
      .notNull()
      .default('support@medmove.dev'),
    supportPhone: text('support_phone'),
    /**
     * Banner shown across the dashboard. Empty string → hidden.
     * Use for "scheduled maintenance at 22:00 UTC" style notices.
     */
    announcementBanner: text('announcement_banner').notNull().default(''),
    /**
     * Soft toggle that disables every public sign-up endpoint at the
     * server-fn level. Existing users can still sign in.
     */
    signupsEnabled: boolean('signups_enabled').notNull().default(true),
    /**
     * Auto-suspend org if no approved verification documents after N days.
     * 0 disables the check.
     */
    verificationGracePeriodDays: text('verification_grace_period_days')
      .notNull()
      .default('30'),
    featureFlags: jsonb('feature_flags')
      .$type<Record<string, boolean | string | number>>()
      .notNull()
      .default({}),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    updatedByUserId: text('updated_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [uniqueIndex('platform_settings_singleton_uq').on(t.singleton)],
)
