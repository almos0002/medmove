import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { signUp } from '@/lib/auth-client'
import { ROLES, type AppRole, homePathForRole } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/sign-up')({ component: SignUpPage })

const ROLES_FOR_SIGNUP: ReadonlyArray<{
  value: AppRole
  label: string
  description: string
}> = [
  {
    value: ROLES.ORG_OWNER,
    label: 'Organization owner',
    description: 'Register a new pharmacy, clinic, hospital, NGO, or distributor.',
  },
  {
    value: ROLES.ORG_STAFF,
    label: 'Organization staff',
    description: 'Join an existing organization that already uses MedMove.',
  },
  {
    value: ROLES.LOGISTICS_STAFF,
    label: 'Logistics staff',
    description: 'Field driver / dispatcher for a logistics partner.',
  },
]

function SignUpPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<AppRole>(ROLES.ORG_OWNER)
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
    } as Parameters<typeof signUp.email>[0])
    setLoading(false)
    if (err) {
      setError(err.message ?? 'Sign-up failed')
      return
    }
    // Org owners go straight to onboarding to register their organization.
    // Staff/logistics go to the standard dashboard which redirects by role.
    if (role === ROLES.ORG_OWNER) {
      navigate({ to: '/onboarding' })
    } else {
      navigate({ to: homePathForRole(role) })
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: brand panel */}
      <aside className="hidden lg:flex lg:w-1/2 bg-[var(--color-mm-accent)] text-white p-12 flex-col justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 inline-flex items-center justify-center bg-white/15 squircle">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="font-semibold">MedMove</span>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-snug">
            Verified medicine, redirected to where it’s needed.
          </h2>
          <p className="mt-4 text-sm text-white/80">
            MedMove is a closed network for healthcare organizations. Every
            organization is reviewed before it can list, request, or deliver
            medicine.
          </p>
        </div>
        <p className="text-xs text-white/60">
          © {new Date().getFullYear()} MedMove. Verified-only network.
        </p>
      </aside>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[var(--color-mm-canvas)]">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold text-[var(--color-mm-ink)]">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-[var(--color-mm-muted)]">
            We’ll review and verify your organization before any medicine
            actions are unlocked.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 bg-[var(--color-mm-surface)] border border-[var(--color-mm-line)] squircle-md p-6 space-y-5"
          >
            <div className="space-y-2">
              <Label>I am signing up as…</Label>
              <div className="grid grid-cols-1 gap-2">
                {ROLES_FOR_SIGNUP.map((r) => (
                  <button
                    type="button"
                    key={r.value}
                    onClick={() => setRole(r.value)}
                    className={cn(
                      'text-left px-3.5 py-2.5 squircle-sm border text-sm transition-colors',
                      role === r.value
                        ? 'border-[var(--color-mm-accent)] bg-[var(--color-mm-accent-soft)]'
                        : 'border-[var(--color-mm-line)] hover:border-[var(--color-mm-line-strong)]',
                    )}
                  >
                    <div className="font-medium text-[var(--color-mm-ink)]">
                      {r.label}
                    </div>
                    <div className="text-[12px] text-[var(--color-mm-muted)] mt-0.5">
                      {r.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                autoComplete="name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@your-organization.org"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="text-sm text-[var(--color-mm-bad)] bg-[var(--color-mm-bad-soft)] border border-[var(--color-mm-bad-soft)] px-3 py-2 squircle-sm">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full">
              {!loading && <span>Create account</span>}
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            </Button>

            <p className="text-center text-sm text-[var(--color-mm-muted)]">
              Already have an account?{' '}
              <Link
                to="/sign-in"
                search={{}}
                className="text-[var(--color-mm-accent)] font-medium hover:underline"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
