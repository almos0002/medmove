import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Building2, Mail, Lock, User, Loader2 } from 'lucide-react'
import { signUp } from '@/lib/auth-client'
import { ROLES, type AppRole } from '@/lib/permissions'

export const Route = createFileRoute('/sign-up')({ component: SignUpPage })

/**
 * Public signup intentionally does NOT expose admin/super_admin. Those roles
 * are bootstrapped via the seed script (or, in production, via an admin-only
 * back-office endpoint).
 */
const ROLES_FOR_SIGNUP: ReadonlyArray<{ value: AppRole; label: string }> = [
  { value: ROLES.SELLER, label: 'Seller (pharmacy)' },
  { value: ROLES.BUYER, label: 'Buyer (hospital / NGO)' },
  { value: ROLES.LOGISTICS_USER, label: 'Logistics' },
]

function SignUpPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [role, setRole] = useState<AppRole>(ROLES.BUYER)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await signUp.email({
      email,
      password,
      name,
      role,
      organizationName,
    } as Parameters<typeof signUp.email>[0])
    setLoading(false)
    if (err) {
      setError(err.message ?? 'Sign-up failed')
      return
    }
    navigate({ to: '/dashboard' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Join MedMove to start redistributing medicine.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Account type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES_FOR_SIGNUP.map((r) => (
                <button
                  type="button"
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`px-3 py-2 text-sm rounded-lg border font-medium transition ${
                    role === r.value
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <Field icon={User} label="Full name">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="Jane Doe"
            />
          </Field>

          <Field icon={Building2} label="Organization name">
            <input
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="City Pharmacy / St Mary's Hospital"
            />
          </Field>

          <Field icon={Mail} label="Email">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="you@example.com"
            />
          </Field>

          <Field icon={Lock} label="Password">
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="At least 8 characters"
            />
          </Field>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create account
          </button>

          <p className="text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link
              to="/sign-in"
              className="text-indigo-600 font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        {children}
      </div>
    </div>
  )
}
