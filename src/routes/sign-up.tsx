import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react'
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
    if (role === ROLES.ORG_OWNER) {
      navigate({ to: '/onboarding' })
    } else {
      navigate({ to: homePathForRole(role) })
    }
  }

  return (
    <div className="min-h-screen bg-white grid grid-cols-1 lg:grid-cols-12">
      {/* Editorial visual panel */}
      <aside className="hidden lg:flex lg:col-span-5 relative bg-white border-r border-[var(--color-mm-line)] flex-col p-12">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center bg-[var(--color-mm-ink)] text-white squircle-sm">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span className="font-display text-[22px]">MedMove</span>
        </Link>

        <div className="mt-12">
          <div className="eyebrow flex items-center gap-3">
            <span className="tick" /> Open an account
          </div>
          <h2 className="mt-5 font-display text-[clamp(44px,4.8vw,68px)] leading-[0.92] tracking-tight">
            Join the<br />
            <span className="italic text-[var(--color-mm-accent)]">network.</span>
          </h2>
          <p className="mt-6 text-[14px] text-[var(--color-mm-muted)] max-w-sm leading-relaxed">
            MedMove is a closed-loop, verified network. Once your documents
            are approved, your organization is unlocked across the entire ledger.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3">
          <div className="squircle-sm overflow-hidden border border-[var(--color-mm-line)] aspect-[4/5]">
            <img src="/img/doctor.jpg" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="squircle-sm overflow-hidden border border-[var(--color-mm-line)] aspect-[4/5]">
            <img src="/img/aid.jpg" alt="" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="mt-auto pt-10 border-t border-[var(--color-mm-line)] grid grid-cols-3 gap-4 text-[var(--color-mm-muted)]">
          <Stat n="184" l="Verified orgs" />
          <Stat n="9" l="Countries" />
          <Stat n="11hr" l="Median dispatch" />
        </div>
      </aside>

      {/* Form panel */}
      <div className="lg:col-span-7 flex flex-col">
        <header className="lg:hidden border-b border-[var(--color-mm-line)] px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center bg-[var(--color-mm-ink)] text-white squircle-xs">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="font-display text-[18px]">MedMove</span>
          </Link>
          <Link to="/sign-in" search={{}} className="text-sm link-underline">Sign in</Link>
        </header>
        <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-[520px]">
            <div className="eyebrow">Step 01 — your account</div>
            <h1 className="mt-5 font-display text-[clamp(40px,5vw,60px)] leading-[0.95] tracking-tight">
              Create your<br /><span className="italic">account.</span>
            </h1>
            <p className="mt-4 text-sm text-[var(--color-mm-muted)] max-w-md">
              We'll review and verify your organization before any medicine
              actions are unlocked.
            </p>

            <form onSubmit={handleSubmit} className="mt-12 space-y-8">
              <div className="space-y-3">
                <Label>I am signing up as</Label>
                <div className="grid grid-cols-1 gap-2">
                  {ROLES_FOR_SIGNUP.map((r) => (
                    <button
                      type="button"
                      key={r.value}
                      onClick={() => setRole(r.value)}
                      className={cn(
                        'text-left px-4 py-3 squircle-sm border text-sm transition-colors',
                        role === r.value
                          ? 'border-[var(--color-mm-ink)] bg-white'
                          : 'border-[var(--color-mm-line-strong)] hover:border-[var(--color-mm-ink)]',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-[var(--color-mm-ink)]">{r.label}</div>
                        <span
                          className={cn(
                            'inline-flex h-4 w-4 squircle-xs border',
                            role === r.value
                              ? 'bg-[var(--color-mm-accent)] border-[var(--color-mm-accent)]'
                              : 'border-[var(--color-mm-line-strong)]',
                          )}
                        />
                      </div>
                      <div className="text-[12px] text-[var(--color-mm-muted)] mt-1">{r.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
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

              <div className="space-y-2">
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

              <div className="space-y-2">
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
                <div className="text-[13px] text-[var(--color-mm-bad)] border-l-2 border-[var(--color-mm-bad)] pl-3 py-1">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} size="lg" className="w-full">
                {!loading && <>Create account <ArrowRight className="h-4 w-4" /></>}
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              </Button>

              <p className="text-sm text-[var(--color-mm-muted)]">
                Already have an account?{' '}
                <Link to="/sign-in" search={{}} className="text-[var(--color-mm-ink)] link-underline font-medium">
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="font-display text-[28px] leading-none text-[var(--color-mm-ink)]">{n}</div>
      <div className="text-[11px] uppercase tracking-[0.14em] mt-1.5">{l}</div>
    </div>
  )
}
