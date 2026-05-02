import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { ROLES, isAdminRole } from '@/lib/permissions'
import { getServerSession } from '@/server/functions/session'

export const Route = createFileRoute('/seller')({
  beforeLoad: async () => {
    const session = await getServerSession()
    if (!session.user) {
      throw redirect({ to: '/sign-in', search: { redirect: '/seller' } })
    }
    // Sellers see their own pages; admins are allowed to read seller views
    // for support, but we intentionally do not let buyers/logistics users in.
    if (
      session.user.role !== ROLES.SELLER &&
      !isAdminRole(session.user.role)
    ) {
      throw redirect({ to: '/dashboard' })
    }
    return { session }
  },
  component: SellerLayout,
})

function SellerLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-6xl mx-auto text-sm font-medium text-slate-700">
          MedMove — Seller
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
