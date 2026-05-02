import type { DispatchPayload, DispatchResult } from './index'

/**
 * WhatsApp channel stub. Logs and no-ops. Swap in a real provider (Twilio
 * WhatsApp, Meta Cloud API) here without touching callers.
 */
export async function sendWhatsapp(
  payload: DispatchPayload,
): Promise<DispatchResult> {
  console.log('[notifications:whatsapp] noop', {
    to: payload.recipient.phone ?? null,
    type: payload.notification.type,
  })
  return { ok: true, skipped: true, channel: 'whatsapp' }
}
