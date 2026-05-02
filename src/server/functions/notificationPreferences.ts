import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { userNotificationPreferences } from '@/lib/schema'
import { getRequestContext } from '../context'
import { writeAudit } from '../audit'
import { toClientError } from '../errors'
import { requireAuth } from '../guards/require-auth'
import { updateNotificationPreferencesSchema } from '../validators/notificationPreferences'

/**
 * Step 14 — per-user notification preferences.
 *
 * `getMyNotificationPreferences` returns the user's row, lazily creating
 * one with defaults if the user has never opened the prefs page.
 *
 * `updateMyNotificationPreferences` patches only the keys supplied.
 *
 * Both endpoints require an authenticated user; there is no admin-side
 * read/write — preferences are private.
 */
const DEFAULTS = {
  inAppEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  whatsappEnabled: false,
  mutedTypes: [] as string[],
}

export type NotificationPreferencesShape = {
  inAppEnabled: boolean
  emailEnabled: boolean
  smsEnabled: boolean
  whatsappEnabled: boolean
  mutedTypes: string[]
}

async function ensureRow(userId: string) {
  const [row] = await db
    .select()
    .from(userNotificationPreferences)
    .where(eq(userNotificationPreferences.userId, userId))
    .limit(1)
  if (row) return row
  const [created] = await db
    .insert(userNotificationPreferences)
    .values({ userId, ...DEFAULTS })
    .returning()
  return created
}

export const getMyNotificationPreferences = createServerFn({
  method: 'GET',
  strict: { output: false },
}).handler(async () => {
  try {
    const ctx = await getRequestContext()
    const me = requireAuth(ctx)
    const row = await ensureRow(me.id)
    return {
      preferences: {
        inAppEnabled: row.inAppEnabled,
        emailEnabled: row.emailEnabled,
        smsEnabled: row.smsEnabled,
        whatsappEnabled: row.whatsappEnabled,
        mutedTypes: row.mutedTypes,
      } satisfies NotificationPreferencesShape,
    }
  } catch (e) {
    throw toClientError(e)
  }
})

export const updateMyNotificationPreferences = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) =>
    updateNotificationPreferencesSchema.parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const me = requireAuth(ctx)
      const result = await db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(userNotificationPreferences)
          .where(eq(userNotificationPreferences.userId, me.id))
          .limit(1)
        const beforeRow = before ??
          (
            await tx
              .insert(userNotificationPreferences)
              .values({ userId: me.id, ...DEFAULTS })
              .returning()
          )[0]!

        const patch: Partial<typeof userNotificationPreferences.$inferInsert> = {}
        if (data.inAppEnabled !== undefined) patch.inAppEnabled = data.inAppEnabled
        if (data.emailEnabled !== undefined) patch.emailEnabled = data.emailEnabled
        if (data.smsEnabled !== undefined) patch.smsEnabled = data.smsEnabled
        if (data.whatsappEnabled !== undefined)
          patch.whatsappEnabled = data.whatsappEnabled
        if (data.mutedTypes !== undefined) patch.mutedTypes = data.mutedTypes

        const [after] = await tx
          .update(userNotificationPreferences)
          .set(patch)
          .where(eq(userNotificationPreferences.userId, me.id))
          .returning()

        await writeAudit({
          ctx,
          tx,
          action: 'user_notification_preferences.updated',
          entityType: 'user_notification_preferences',
          entityId: after.id,
          before: {
            inAppEnabled: beforeRow.inAppEnabled,
            emailEnabled: beforeRow.emailEnabled,
            smsEnabled: beforeRow.smsEnabled,
            whatsappEnabled: beforeRow.whatsappEnabled,
            mutedTypes: beforeRow.mutedTypes,
          },
          after: {
            inAppEnabled: after.inAppEnabled,
            emailEnabled: after.emailEnabled,
            smsEnabled: after.smsEnabled,
            whatsappEnabled: after.whatsappEnabled,
            mutedTypes: after.mutedTypes,
          },
        })
        return after
      })
      return {
        ok: true as const,
        preferences: {
          inAppEnabled: result.inAppEnabled,
          emailEnabled: result.emailEnabled,
          smsEnabled: result.smsEnabled,
          whatsappEnabled: result.whatsappEnabled,
          mutedTypes: result.mutedTypes,
        } satisfies NotificationPreferencesShape,
      }
    } catch (e) {
      throw toClientError(e)
    }
  })
