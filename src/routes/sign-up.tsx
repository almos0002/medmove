import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowRight, ShieldCheck, Check } from 'lucide-react'
import { signUp } from '@/lib/auth-client'
import { useSiteName } from '@/lib/use-site-name'
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
    description: 'Register a new pharmacy, clinic, hospital, NGO or distributor.',
  },
  {
    value: ROLES.ORG_STAFF,
    label: 'Organization staff',
    description: 'Join an existing organization that already uses MedMove.',
  },
  {
    value: ROLES.LOGISTICS_STAFF,
    label: 'Logistics staff',
    description: 'Field driver or dispatcher for a logistics partner.',
  },
]

function SignUpPage() {
  const siteName = useSiteName()
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
    if (role === ROLES.ORG_OWNER) {
      navigate({ to: '/onboarding' })
    } else {
      navigate({ to: homePathForRole(role) })
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-[var(--color-mm-line)]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-[72px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center bg-[var(--color-mm-accent)] text-white squircle-sm">
              <ShieldCheck className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <span className="font-display text-[20px] text-[var(--color-mm-accent)]">
              {siteName}
            </span>
          </Link>
          <Link
            to="/sign-in"
            search={{}}
            className="text-[14px] font-medium text-[var(--color-mm-ink)] hover:text-[var(--color-mm-accent)]"
          >
            Log in
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[520px]">
          <div className="text-center mb-8">
            <h1 className="font-display text-[32px] leading-tight text-[var(--color-mm-ink)]">
              Create your account
            </h1>
            <p className="mt-2 text-[15px] text-[var(--color-mm-subtle)]">
              We'll review your organization before unlocking medicine actions.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white border border-[var(--color-mm-line-strong)] squircle-md p-6 sm:p-8 space-y-6"
          >
            <div className="space-y-2.5">
              <Label>I'm signing up as</Label>
              <div className="grid grid-cols-1 gap-2.5">
                {ROLES_FOR_SIGNUP.map((r) => (
                  <button
                    type="button"
                    key={r.value}
                    onClick={() => setRole(r.value)}
                    className={cn(
                      'text-left px-4 py-3.5 squircle-sm border bg-white text-sm transition-colors',
                      role === r.value
                        ? 'border-[var(--color-mm-accent)]'
                        : 'border-[var(--color-mm-line-strong)] hover:border-[var(--color-mm-ink)]',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[14px] font-semibold text-[var(--color-mm-ink)]">
                          {r.label}
                        </div>
                        <div className="text-[12.5px] text-[var(--color-mm-subtle)] mt-1 leading-relaxed">
                          {r.description}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                          role === r.value
                            ? 'bg-[var(--color-mm-accent)] border-[var(--color-mm-accent)] text-white'
                            : 'border-[var(--color-mm-line-strong)]',
                        )}
                      >
                        {role === r.value && (
                          <Check className="h-3 w-3" strokeWidth={3} />
                        )}
                      </span>
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
              <div className="text-[13px] text-[var(--color-mm-bad)] bg-white border border-[var(--color-mm-bad)] squircle-xs px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} size="lg" className="w-full">
              Create account <ArrowRight className="h-4 w-4" />
            </Button>

            <div className="text-center text-[14px] text-[var(--color-mm-subtle)]">
              Already have an account?{' '}
              <Link
                to="/sign-in"
                search={{}}
                className="text-[var(--color-mm-accent)] font-medium hover:underline"
              >
                Log in
              </Link>
            </div>
          </form>

          <p className="mt-6 text-center text-[12px] text-[var(--color-mm-subtle)]">
            By creating an account you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  )
}
