import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { ADMIN_ROLES } from '@/lib/permissions'
import { getServerSession } from '@/server/functions/session'

/**
 * Layout guard for everything under /admin/*. Runs on the server during SSR
 * and on the client during navigation. Throwing `redirect()` from beforeLoad
 * is the canonical way to enforce auth in TanStack Router.
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
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-6xl mx-auto text-sm font-medium text-slate-700">
          MedMove — Admin
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
