import { AppError } from '../errors'
import type { ActorUser, AppRole, RequestContext } from '../context'
import { requireAuth } from './require-auth'

export function requireRole(
  ctx: RequestContext,
  ...roles: ReadonlyArray<AppRole>
): ActorUser {
  const user = requireAuth(ctx)
  if (!roles.includes(user.role)) {
    throw new AppError(
      'FORBIDDEN',
      `Requires role: ${roles.join(' or ')}`,
    )
  }
  return user
}
