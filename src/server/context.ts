import { eq } from 'drizzle-orm'
import { getRequest, getRequestIP } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { organizationMembers, organizations } from '@/lib/schema'

export type AppRole = 'pharmacy' | 'hospital_ngo' | 'admin'

export type ActorUser = {
  id: string
  email: string
  role: AppRole
}

export type PrimaryOrg = {
  id: string
  type: 'pharmacy' | 'hospital' | 'clinic' | 'ngo'
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'suspended'
}

export type RequestContext = {
  ip: string | null
  userAgent: string | null
  user: ActorUser | null
  primaryOrg: PrimaryOrg | null
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
          role: ((session.user as { role?: string }).role ??
            'pharmacy') as AppRole,
        }
      : null,
    primaryOrg,
  }
}
