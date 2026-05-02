/**
 * Step 12 — Server-fn wrappers around `src/server/expiry.ts`.
 *
 * The expiry module imports `db` (postgres-js) which would leak the driver
 * into the client bundle if a route file imported it directly. These thin
 * `createServerFn` wrappers keep the heavy code server-only and let routes
 * pull in just the wrapper + the exported types.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getRequestContext } from '../context'
import { toClientError } from '../errors'
import { requireAdmin } from '../guards/require-admin'
import { requireOrgMember } from '../guards/require-org'
import { getOrgExpirySummary, runExpiryScan } from '../expiry'

export const getOrgExpirySummaryFn = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) =>
    z.object({ organizationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      await requireOrgMember(ctx, data.organizationId)
      const summary = await getOrgExpirySummary(data.organizationId)
      return { ok: true as const, summary }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const adminRunExpiryScan = createServerFn({
  method: 'POST',
  strict: { output: false },
}).handler(async () => {
  try {
    const ctx = await getRequestContext()
    requireAdmin(ctx)
    const result = await runExpiryScan()
    return { ok: true as const, ...result }
  } catch (e) {
    throw toClientError(e)
  }
})
