import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { LogOut, ShieldCheck, Loader2 } from 'lucide-react'
import { useSession, signOut } from '@/lib/auth-client'

export const Route = createFileRoute('/dashboard')({ component: DashboardPage })

const ROLE_LABEL: Record<string, string> = {
  pharmacy: 'Pharmacy',
  hospital_ngo: 'Hospital / NGO',
  admin: 'Admin',
}

function DashboardPage() {
  const navigate = useNavigate()
  const { data: session, isPending } = useSession()

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: '/sign-in' })
    }
  }, [isPending, session, navigate])

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!session) return null

  const user = session.user as typeof session.user & {
    role?: string
    organizationName?: string
  }

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

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-slate-900">Welcome, {user.name}</h1>
        <p className="mt-2 text-slate-600">
          You're signed in as a{' '}
          <span className="font-medium text-slate-900">
            {ROLE_LABEL[user.role ?? 'pharmacy']}
          </span>
          {user.organizationName ? ` — ${user.organizationName}` : ''}.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Stat label="Email" value={user.email} />
          <Stat label="Account type" value={ROLE_LABEL[user.role ?? 'pharmacy']} />
          <Stat
            label="Organization"
            value={user.organizationName || 'Not set'}
          />
          <Stat
            label="Member since"
            value={new Date(user.createdAt).toLocaleDateString()}
          />
        </div>
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-slate-900 font-medium">{value}</div>
    </div>
  )
}
