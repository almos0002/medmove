import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'
import { ADMIN_ROLES } from '@/lib/permissions'
import { getServerSession } from '@/server/functions/session'
import { AppShell } from '@/components/layout/AppShell'

/**
 * Layout guard for everything under /admin/*. Runs on the server during SSR
 * and on the client during navigation.
 */
export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const session = await getServerSession()
    if (!session.user) {
      throw redirect({ to: '/sign-in', search: { redirect: '/admin' } })
    }
    if (!ADMIN_ROLES.includes(session.user.role)) {
      throw redirect({ to: '/dashboard' })
    }
    return { session }
  },
  head: pageHead({ title: "Admin", noindex: true }),
  component: AdminLayout,
})

function AdminLayout() {
  const { session } = Route.useRouteContext()
  return (
    <AppShell section="admin" session={session}>
      <Outlet />
    </AppShell>
  )
}
