import type { DispatchPayload, DispatchResult } from './index'

/**
 * SMS channel stub. Logs and no-ops. Swap in a real provider (Twilio, etc.)
 * here without touching callers.
 */
export async function sendSms(payload: DispatchPayload): Promise<DispatchResult> {
  console.log('[notifications:sms] noop', {
    to: payload.recipient.phone ?? null,
    type: payload.notification.type,
  })
  return { ok: true, skipped: true, channel: 'sms' }
}
