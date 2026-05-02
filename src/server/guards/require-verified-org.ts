import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { organizations } from '@/lib/schema'
import { AppError } from '../errors'
import type { ActorUser, RequestContext } from '../context'
import { requireOrgMember, type Membership } from './require-org'

export type OrgRow = typeof organizations.$inferSelect

export async function requireVerifiedOrg(
  ctx: RequestContext,
  orgId: string,
): Promise<{ user: ActorUser; membership: Membership; org: OrgRow }> {
  const { user, membership } = await requireOrgMember(ctx, orgId)
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
  return { user, membership, org }
}
