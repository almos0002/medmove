import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { organizationMembers } from '@/lib/schema'
import { AppError } from '../errors'
import type { ActorUser, RequestContext } from '../context'
import { requireAuth } from './require-auth'

export type Membership = {
  id: string
  role: 'owner' | 'member'
}

export async function requireOrgMember(
  ctx: RequestContext,
  orgId: string,
): Promise<{ user: ActorUser; membership: Membership }> {
  const user = requireAuth(ctx)
  const rows = await db
    .select({
      id: organizationMembers.id,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, user.id),
        eq(organizationMembers.organizationId, orgId),
      ),
    )
    .limit(1)
  const membership = rows[0]
  if (!membership) {
    throw new AppError('FORBIDDEN', 'Not a member of this organization')
  }
  return { user, membership }
}
