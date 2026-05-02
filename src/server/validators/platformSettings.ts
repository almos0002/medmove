import { z } from 'zod'

/**
 * Step 14 — admin-editable platform settings. Every field is optional so
 * the UI can submit only the fields it changed. `verificationGracePeriodDays`
 * is stored as text (because it's nullable + JSONified externally) but we
 * accept either an integer or its string representation in 0..365.
 */
export const updatePlatformSettingsSchema = z
  .object({
    siteName: z.string().trim().min(1).max(120).optional(),
    supportEmail: z.string().trim().email().max(200).optional(),
    supportPhone: z.string().trim().max(40).nullable().optional(),
    announcementBanner: z.string().trim().max(500).optional(),
    signupsEnabled: z.boolean().optional(),
    verificationGracePeriodDays: z
      .union([z.number().int().min(0).max(365), z.string().trim()])
      .optional()
      .transform((v) => {
        if (v === undefined) return undefined
        if (typeof v === 'number') return String(v)
        const n = Number.parseInt(v, 10)
        if (Number.isNaN(n) || n < 0 || n > 365) {
          throw new Error('verificationGracePeriodDays must be 0..365')
        }
        return String(n)
      }),
    featureFlags: z
      .record(z.string().min(1).max(80), z.union([z.boolean(), z.string(), z.number()]))
      .optional(),
  })
  .refine(
    (v) =>
      v.siteName !== undefined ||
      v.supportEmail !== undefined ||
      v.supportPhone !== undefined ||
      v.announcementBanner !== undefined ||
      v.signupsEnabled !== undefined ||
      v.verificationGracePeriodDays !== undefined ||
      v.featureFlags !== undefined,
    { message: 'No settings provided' },
  )
export type UpdatePlatformSettingsInput = z.infer<
  typeof updatePlatformSettingsSchema
>
