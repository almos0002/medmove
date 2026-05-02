import type { notifications } from '@/lib/schema'
import { sendEmail } from './email'
import { sendSms } from './sms'
import { sendWhatsapp } from './whatsapp'

/**
 * External-channel dispatcher seam. Today every channel is a stub that logs
 * and returns `{ skipped: true }`; tomorrow real providers (Resend, Twilio,
 * Meta WhatsApp, etc.) plug in inside `./email.ts`, `./sms.ts`, and
 * `./whatsapp.ts` without callers having to change.
 *
 * Important: callers are expected to invoke this *after* the inserting DB
 * transaction has committed and to swallow any thrown error — a failed
 * provider call must never roll back the persisted in-app notification or
 * the surrounding business transaction.
 */
export type NotificationRow = typeof notifications.$inferSelect

export type DispatchRecipient = {
  userId: string | null
  email: string | null
  phone: string | null
  name: string | null
}

export type DispatchPayload = {
  notification: NotificationRow
  recipient: DispatchRecipient
}

export type DispatchResult = {
  ok: boolean
  skipped?: boolean
  channel: 'email' | 'sms' | 'whatsapp'
  error?: string
}

/**
 * Fan a notification out across every configured channel. Errors are caught
 * per-channel and logged so one broken provider never blocks the others.
 */
export async function dispatchNotification(
  payload: DispatchPayload,
): Promise<DispatchResult[]> {
  const results = await Promise.allSettled([
    sendEmail(payload),
    sendSms(payload),
    sendWhatsapp(payload),
  ])
  return results.map((r, i) => {
    const channel = (['email', 'sms', 'whatsapp'] as const)[i]
    if (r.status === 'fulfilled') return r.value
    console.error(`[notifications:${channel}] dispatch failed`, r.reason)
    return {
      ok: false,
      channel,
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    }
  })
}
