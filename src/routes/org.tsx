import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { isAdminRole, isOrgMemberRole } from '@/lib/permissions'
import { getServerSession } from '@/server/functions/session'

/**
 * `/org` is the unified console for ORG_OWNER and ORG_STAFF — both roles
 * see the same workspace because business actions are gated by their org's
 * capability flags (can_list_medicine / can_request_medicine /
 * can_deliver_medicine), not by user role. Owners get extra UI for inviting
 * staff and editing the org profile (rendered conditionally inside).
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
    return { session }
  },
  component: OrgLayout,
})

function OrgLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-6xl mx-auto text-sm font-medium text-slate-700">
          MedMove — Organization
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
