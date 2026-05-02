import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { platformSettings } from '@/lib/schema'
import { getRequestContext } from '../context'
import { writeAudit } from '../audit'
import { toClientError } from '../errors'
import { requireAdmin } from '../guards/require-admin'
import { updatePlatformSettingsSchema } from '../validators/platformSettings'

/**
 * Step 14 — platform settings.
 *
 * Singleton row identified by `singleton = true`. We lazily create the row
 * the first time anyone reads it so a fresh database boots without manual
 * SQL.
 *
 * `getPlatformSettings` is callable by any authenticated context (used by
 * the announcement banner and the support email link). The exposed shape
 * deliberately omits internal feature flags.
 *
 * `getAdminPlatformSettings` returns the full row (admin only).
 *
 * `adminUpdatePlatformSettings` is admin only.
 */
export type PublicPlatformSettings = {
  siteName: string
  supportEmail: string
  supportPhone: string | null
  announcementBanner: string
  signupsEnabled: boolean
}

async function ensureRow() {
  const [row] = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.singleton, true))
    .limit(1)
  if (row) return row
  const [created] = await db
    .insert(platformSettings)
    .values({ singleton: true })
    .returning()
  return created
}

export const getPlatformSettings = createServerFn({
  method: 'GET',
  strict: { output: false },
}).handler(async () => {
  try {
    const row = await ensureRow()
    return {
      settings: {
        siteName: row.siteName,
        supportEmail: row.supportEmail,
        supportPhone: row.supportPhone,
        announcementBanner: row.announcementBanner,
        signupsEnabled: row.signupsEnabled,
      } satisfies PublicPlatformSettings,
    }
  } catch (e) {
    throw toClientError(e)
  }
})

export const getAdminPlatformSettings = createServerFn({
  method: 'GET',
  strict: { output: false },
}).handler(async () => {
  try {
    const ctx = await getRequestContext()
    requireAdmin(ctx)
    const row = await ensureRow()
    return { settings: row }
  } catch (e) {
    throw toClientError(e)
  }
})

export const adminUpdatePlatformSettings = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => updatePlatformSettingsSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const admin = requireAdmin(ctx)
      const result = await db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(platformSettings)
          .where(eq(platformSettings.singleton, true))
          .limit(1)
        const beforeRow = before ??
          (
            await tx
              .insert(platformSettings)
              .values({ singleton: true })
              .returning()
          )[0]!

        const patch: Partial<typeof platformSettings.$inferInsert> = {
          updatedByUserId: admin.id,
        }
        if (data.siteName !== undefined) patch.siteName = data.siteName
        if (data.supportEmail !== undefined) patch.supportEmail = data.supportEmail
        if (data.supportPhone !== undefined)
          patch.supportPhone = data.supportPhone
        if (data.announcementBanner !== undefined)
          patch.announcementBanner = data.announcementBanner
        if (data.signupsEnabled !== undefined)
          patch.signupsEnabled = data.signupsEnabled
        if (data.verificationGracePeriodDays !== undefined)
          patch.verificationGracePeriodDays = data.verificationGracePeriodDays
        if (data.featureFlags !== undefined)
          patch.featureFlags = data.featureFlags

        const [after] = await tx
          .update(platformSettings)
          .set(patch)
          .where(eq(platformSettings.singleton, true))
          .returning()
        await writeAudit({
          ctx,
          tx,
          action: 'platform_settings.updated',
          entityType: 'platform_settings',
          entityId: after.id,
          before: beforeRow as unknown as Record<string, unknown>,
          after: after as unknown as Record<string, unknown>,
        })
        return after
      })
      return { ok: true as const, settings: result }
    } catch (e) {
      throw toClientError(e)
    }
  })
