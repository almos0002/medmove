/**
 * Single import surface for guards.
 *
 *   import { requireAuth, requireRole, requireAdmin } from '@/server/guards'
 */
export { getRequestContext } from '../context'
export type {
  ActorUser,
  AppRole,
  PrimaryOrg,
  RequestContext,
} from '../context'

export { requireAuth } from './require-auth'
export { requireRole } from './require-role'
export { requireAdmin } from './require-admin'
export { requireOrgMember, type Membership } from './require-org'
export { requireVerifiedOrg, type OrgRow } from './require-verified-org'
export { requireOrganizationAccess } from './require-org-access'
export { requireCapability } from './require-capability'

/**
 * Returns the actor user or null. Use in places where it's legitimate to
 * branch on "logged in vs not" without throwing (e.g. public pages with
 * personalisation, server functions that return public data).
 */
export function getCurrentUser(
  ctx: import('../context').RequestContext,
): import('../context').ActorUser | null {
  return ctx.user
}
