import { createServerFn } from '@tanstack/react-start'
import { getRequestContext } from '../context'

/**
 * Server fn callable from TanStack Router `beforeLoad` to fetch the current
 * session. Returns a *minimal* shape — never the raw cookie/token — and is
 * safe to expose because every field comes from `getRequestContext()` which
 * already validates the session.
 *
 * Caching: the router caches `beforeLoad` per navigation, so this won't be
 * re-fetched on every component render.
 */
export const getServerSession = createServerFn({
  method: 'GET',
  strict: { output: false },
}).handler(async () => {
  const ctx = await getRequestContext()
  return {
    user: ctx.user,
    primaryOrg: ctx.primaryOrg,
  }
})
