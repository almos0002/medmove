import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'
import { isAdminRole, isOrgMemberRole, isOrgOwner } from '@/lib/permissions'
import { getServerSession } from '@/server/functions/session'
import { AppShell } from '@/components/layout/AppShell'

/**
 * `/org` is the unified workspace for ORG_OWNER and ORG_STAFF — the
 * sidebar items adapt by role/capability rather than splitting routes
 * per role. Admins are also allowed in (as support / impersonation),
 * with a banner reminding them that their actions are recorded under
 * their admin account.
 *
 * Org owners without a primary organisation are forwarded to /onboarding
 * so the rest of the app can assume `primaryOrg` exists.
 */
export const Route = createFileRoute('/org')({
  beforeLoad: async () => {
    const session = await getServerSession()
    if (!session.user) {
      throw redirect({ to: '/sign-in', search: { redirect: '/org' } })
    }
    if (
      !isOrgMemberRole(session.user.role) &&
      !isAdminRole(session.user.role)
    ) {
      throw redirect({ to: '/dashboard' })
    }
    // First-run owner without an org → onboarding.
    if (
      isOrgOwner(session.user.role) &&
      !session.primaryOrg &&
      !isAdminRole(session.user.role)
    ) {
      throw redirect({ to: '/onboarding' })
    }
    // Suspended org → friendly read-only landing. Admins are exempt so they
    // can still inspect the workspace from the support side.
    if (
      session.primaryOrg?.verificationStatus === 'suspended' &&
      !isAdminRole(session.user.role)
    ) {
      throw redirect({ to: '/suspended' })
    }
    return { session }
  },
  head: pageHead({ title: "Workspace", noindex: true }),
  component: OrgLayout,
})

function OrgLayout() {
  const { session } = Route.useRouteContext()
  return (
    <AppShell section="app" session={session}>
      <Outlet />
    </AppShell>
  )
}
