import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { organizations } from '@/lib/schema'
import { isAdminRole } from '@/lib/permissions'
import { AppError } from '../errors'
import type { ActorUser, RequestContext } from '../context'
import { requireAuth } from './require-auth'
import { requireOrgMember, type Membership } from './require-org'
import { requireVerifiedOrg, type OrgRow } from './require-verified-org'

/**
 * Convenience guard: an admin (admin/super_admin) may access any org without
 * being a member. Otherwise the user must be a member of a *verified* org by
 * default. Pass `requireVerified: false` to allow members of unverified orgs
 * (used during onboarding flows).
 */
export async function requireOrganizationAccess(
  ctx: RequestContext,
  orgId: string,
  options: { requireVerified?: boolean } = {},
): Promise<{
  user: ActorUser
  membership: Membership | null
  org: OrgRow
}> {
  const user = requireAuth(ctx)

  if (isAdminRole(user.role)) {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1)
    if (!org) throw new AppError('NOT_FOUND', 'Organization not found')
    return { user, membership: null, org }
  }

  if (options.requireVerified === false) {
    const { membership } = await requireOrgMember(ctx, orgId)
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1)
    if (!org) throw new AppError('NOT_FOUND', 'Organization not found')
    return { user, membership, org }
  }

  const r = await requireVerifiedOrg(ctx, orgId)
  return { user: r.user, membership: r.membership, org: r.org }
}
