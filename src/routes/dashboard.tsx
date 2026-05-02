import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { LogOut, ShieldCheck } from 'lucide-react'
import { ROLES, homePathForRole, type AppRole } from '@/lib/permissions'
import { signOut } from '@/lib/auth-client'
import { getServerSession } from '@/server/functions/session'

/**
 * /dashboard is the universal post-sign-in landing pad. It redirects to the
 * role-specific console, falling back to a stub page only when the role is
 * unknown (defensive — should not happen given the role coercion in
 * `getRequestContext`).
 */
export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const session = await getServerSession()
    if (!session.user) {
      throw redirect({ to: '/sign-in' })
    }
    const home = homePathForRole(session.user.role)
    if (home !== '/dashboard') {
      throw redirect({ to: home })
    }
    return { session }
  },
  component: DashboardPage,
})

const ROLE_LABEL: Record<AppRole, string> = {
  [ROLES.SUPER_ADMIN]: 'Super admin',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.SELLER]: 'Seller',
  [ROLES.BUYER]: 'Buyer',
  [ROLES.LOGISTICS_USER]: 'Logistics',
}

function DashboardPage() {
  const navigate = useNavigate()
  const { session } = Route.useRouteContext()
  const user = session.user!

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-600" />
            <span className="font-semibold text-slate-900">MedMove</span>
          </div>
          <button
            onClick={() => signOut().then(() => navigate({ to: '/sign-in' }))}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome, {user.email}
        </h1>
        <p className="text-sm text-slate-600">
          Account type:{' '}
          <span className="font-medium text-slate-900">
            {ROLE_LABEL[user.role] ?? user.role}
          </span>
        </p>
      </main>
    </div>
  )
}
