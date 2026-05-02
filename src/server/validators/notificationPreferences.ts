import { z } from 'zod'

/**
 * Step 14 — partial update for the per-user notification preferences row.
 * Every flag is optional so the UI can PATCH just the toggles the user
 * touched. `mutedTypes` is a full replacement when supplied.
 */
export const updateNotificationPreferencesSchema = z
  .object({
    inAppEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    smsEnabled: z.boolean().optional(),
    whatsappEnabled: z.boolean().optional(),
    mutedTypes: z.array(z.string().min(1).max(80)).max(64).optional(),
  })
  .refine(
    (v) =>
      v.inAppEnabled !== undefined ||
      v.emailEnabled !== undefined ||
      v.smsEnabled !== undefined ||
      v.whatsappEnabled !== undefined ||
      v.mutedTypes !== undefined,
    { message: 'No preferences provided' },
  )
export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>
