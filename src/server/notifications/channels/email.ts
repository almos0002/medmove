import type { DispatchPayload, DispatchResult } from './index'

/**
 * Email channel stub. Logs and no-ops. Swap in a real provider (Resend,
 * Postmark, etc.) here without touching callers — the contract is defined
 * by `DispatchPayload` / `DispatchResult` in `./index.ts`.
 */
export async function sendEmail(payload: DispatchPayload): Promise<DispatchResult> {
  console.log('[notifications:email] noop', {
    to: payload.recipient.email,
    type: payload.notification.type,
    title: payload.notification.title,
  })
  return { ok: true, skipped: true, channel: 'email' }
}
