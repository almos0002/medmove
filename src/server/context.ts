import { eq } from 'drizzle-orm'
import { getRequest, getRequestIP } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { organizationMembers, organizations } from '@/lib/schema'
import { ROLES, type AppRole, type OrgType } from '@/lib/permissions'

export type { AppRole } from '@/lib/permissions'

export type ActorUser = {
  id: string
  email: string
  role: AppRole
}

export type PrimaryOrg = {
  id: string
  type: OrgType
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'suspended'
}

export type RequestContext = {
  ip: string | null
  userAgent: string | null
  user: ActorUser | null
  primaryOrg: PrimaryOrg | null
}

/**
 * Coerce the role string from Better Auth into a known AppRole. Unknown values
 * are demoted to BUYER (the lowest-trust authenticated role) so a corrupted
 * row can never accidentally grant admin powers.
 */
function coerceRole(input: unknown): AppRole {
  const allowed: ReadonlyArray<string> = [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.SELLER,
    ROLES.BUYER,
    ROLES.LOGISTICS_USER,
  ]
  if (typeof input === 'string' && allowed.includes(input)) {
    return input as AppRole
  }
  return ROLES.BUYER
}

export async function getRequestContext(): Promise<RequestContext> {
  const req = getRequest()
  const session = await auth.api.getSession({ headers: req.headers })

  let primaryOrg: PrimaryOrg | null = null
  if (session?.user) {
    const row = await db
      .select({
        id: organizations.id,
        type: organizations.type,
        verificationStatus: organizations.verificationStatus,
      })
      .from(organizationMembers)
      .innerJoin(
        organizations,
        eq(organizations.id, organizationMembers.organizationId),
      )
      .where(eq(organizationMembers.userId, session.user.id))
      .limit(1)
    primaryOrg = row[0] ?? null
  }

  let ip: string | null = null
  try {
    ip = getRequestIP({ xForwardedFor: true }) ?? null
  } catch {
    ip = null
  }

  return {
    ip,
    userAgent: req.headers.get('user-agent'),
    user: session?.user
      ? {
          id: session.user.id,
          email: session.user.email,
          role: coerceRole((session.user as { role?: unknown }).role),
        }
      : null,
    primaryOrg,
  }
}
