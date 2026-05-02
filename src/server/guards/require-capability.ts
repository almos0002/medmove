import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { organizations } from '@/lib/schema'
import {
  hasCapability,
  isAdminRole,
  type Capability,
} from '@/lib/permissions'
import { AppError } from '../errors'
import type { ActorUser, RequestContext } from '../context'
import { requireAuth } from './require-auth'
import { requireOrgMember, type Membership } from './require-org'

export type OrgRow = typeof organizations.$inferSelect

/**
 * The single capability check that guards every business action.
 *
 * Requirements (in order):
 *   1. There is an authenticated user (`requireAuth`).
 *   2. EITHER the user is an admin/super_admin (full bypass — allowed for
 *      operational / support reasons), OR
 *      a) the user is a member of `orgId` (`requireOrgMember`),
 *      b) the org's verificationStatus is 'verified', AND
 *      c) the org has the requested capability flag set to `true`.
 *
 * Returns the user, membership, and the loaded org row so callers don't need
 * a second SELECT for the same org. For admins the membership is a synthetic
 * sentinel ({ id: '__admin__', role: 'owner' }) — callers should check
 * `isAdminRole(user.role)` if they need to distinguish.
 */
export async function requireCapability(
  ctx: RequestContext,
  orgId: string,
  capability: Capability,
): Promise<{ user: ActorUser; membership: Membership; org: OrgRow }> {
  const user = requireAuth(ctx)

  // Admin bypass — load the org for return convenience, but skip membership
  // and capability checks. Admins still see NOT_FOUND if the org doesn't
  // exist (no information leak).
  if (isAdminRole(user.role)) {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1)
    if (!org) throw new AppError('NOT_FOUND', 'Organization not found')
    return {
      user,
      membership: { id: '__admin__', role: 'owner' },
      org,
    }
  }

  // Non-admins: real membership lookup, real org load, capability check.
  const { membership } = await requireOrgMember(ctx, orgId)
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)
  if (!org) throw new AppError('NOT_FOUND', 'Organization not found')
  if (org.verificationStatus !== 'verified') {
    throw new AppError(
      'ORG_NOT_VERIFIED',
      `Organization is not verified (status: ${org.verificationStatus})`,
    )
  }
  if (!hasCapability(org, capability)) {
    throw new AppError(
      'FORBIDDEN',
      `Organization is not enabled for capability '${capability}'`,
    )
  }
  return { user, membership, org }
}
