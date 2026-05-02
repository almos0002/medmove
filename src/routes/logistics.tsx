import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { ROLES, isAdminRole } from '@/lib/permissions'
import { getServerSession } from '@/server/functions/session'
import { AppShell } from '@/components/layout/AppShell'

export const Route = createFileRoute('/logistics')({
  beforeLoad: async () => {
    const session = await getServerSession()
    if (!session.user) {
      throw redirect({ to: '/sign-in', search: { redirect: '/logistics' } })
    }
    if (
      session.user.role !== ROLES.LOGISTICS_STAFF &&
      !isAdminRole(session.user.role)
    ) {
      throw redirect({ to: '/dashboard' })
    }
    return { session }
  },
  component: LogisticsLayout,
})

function LogisticsLayout() {
  const { session } = Route.useRouteContext()
  return (
    <AppShell section="logistics" session={session}>
      <Outlet />
    </AppShell>
  )
}
