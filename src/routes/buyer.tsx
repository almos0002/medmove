import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { ROLES, isAdminRole } from '@/lib/permissions'
import { getServerSession } from '@/server/functions/session'

export const Route = createFileRoute('/buyer')({
  beforeLoad: async () => {
    const session = await getServerSession()
    if (!session.user) {
      throw redirect({ to: '/sign-in', search: { redirect: '/buyer' } })
    }
    if (
      session.user.role !== ROLES.BUYER &&
      !isAdminRole(session.user.role)
    ) {
      throw redirect({ to: '/dashboard' })
    }
    return { session }
  },
  component: BuyerLayout,
})

function BuyerLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-6xl mx-auto text-sm font-medium text-slate-700">
          MedMove — Buyer
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
