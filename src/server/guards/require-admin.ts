import { ADMIN_ROLES } from '@/lib/permissions'
import { AppError } from '../errors'
import type { ActorUser, RequestContext } from '../context'
import { requireAuth } from './require-auth'

/**
 * Allows ADMIN or SUPER_ADMIN. Use this anywhere the spec says "admins" —
 * it ensures we don't silently break when a future SUPER_ADMIN-only check is
 * added (just narrow the call to `requireRole(ctx, 'super_admin')`).
 */
export function requireAdmin(ctx: RequestContext): ActorUser {
  const user = requireAuth(ctx)
  if (!ADMIN_ROLES.includes(user.role)) {
    throw new AppError('FORBIDDEN', 'Requires admin or super_admin role')
  }
  return user
}
