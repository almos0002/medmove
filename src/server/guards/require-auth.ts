import { AppError } from '../errors'
import type { ActorUser, RequestContext } from '../context'

export function requireAuth(ctx: RequestContext): ActorUser {
  if (!ctx.user) throw new AppError('UNAUTHENTICATED', 'Sign in required')
  return ctx.user
}
