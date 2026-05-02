import { createFileRoute, redirect } from '@tanstack/react-router'
import { homePathForRole } from '@/lib/permissions'
import { getServerSession } from '@/server/functions/session'

/**
 * /dashboard is the universal post-sign-in landing pad. It always
 * redirects — we never render anything here. Logic:
 *
 *   - No session → /sign-in
 *   - Org owner without a primary org → /onboarding (first-run flow)
 *   - Otherwise → role-specific home (/admin, /org, /logistics)
 *
 * This keeps every other route free of duplicate "where should this user
 * land?" branching.
 */
export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const session = await getServerSession()
    if (!session.user) {
      throw redirect({ to: '/sign-in', search: {} })
    }
    // First-run org owners need to register an organization first.
    if (
      session.user.role === 'org_owner' &&
      !session.primaryOrg
    ) {
      throw redirect({ to: '/onboarding' })
    }
    throw redirect({ to: homePathForRole(session.user.role) })
  },
})
