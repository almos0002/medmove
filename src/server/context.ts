import { eq } from 'drizzle-orm'
import { getRequest, getRequestIP } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { organizationMembers, organizations } from '@/lib/schema'
import {
  ALL_ROLES,
  ROLES,
  type AppRole,
  type OrgType,
} from '@/lib/permissions'

export type { AppRole } from '@/lib/permissions'

export type ActorUser = {
  id: string
  email: string
  role: AppRole
}

/**
 * Snapshot of the user's "primary" org membership for use in pages and
 * dashboards. Capability flags are exposed so the UI can decide what to show
 * — but the **server functions must always re-check capability** via
 * `requireCapability` since this snapshot is request-cached.
 */
export type PrimaryOrg = {
  id: string
  type: OrgType
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'suspended'
  canListMedicine: boolean
  canRequestMedicine: boolean
  canDeliverMedicine: boolean
}

export type RequestContext = {
  ip: string | null
  userAgent: string | null
  user: ActorUser | null
  primaryOrg: PrimaryOrg | null
}

/**
 * Coerce the role string from Better Auth into a known AppRole. Unknown
 * values are demoted to ORG_STAFF (the lowest-trust authenticated role that
 * still maps to an org membership) so a corrupted row can never accidentally
 * grant admin or logistics powers.
 */
function coerceRole(input: unknown): AppRole {
  if (typeof input === 'string' && (ALL_ROLES as ReadonlyArray<string>).includes(input)) {
    return input as AppRole
  }
  return ROLES.ORG_STAFF
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
        canListMedicine: organizations.canListMedicine,
        canRequestMedicine: organizations.canRequestMedicine,
        canDeliverMedicine: organizations.canDeliverMedicine,
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
