import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowRight, ShieldCheck, FlaskConical } from 'lucide-react'
import { signIn } from '@/lib/auth-client'
import { useSiteName } from '@/lib/use-site-name'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TEST_ACCOUNTS,
  formatRoleLabel,
} from '@/lib/dev/test-accounts'

export const Route = createFileRoute('/sign-in')({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => {
    const r = s.redirect
    if (typeof r === 'string' && r.startsWith('/')) return { redirect: r }
    return {}
  },
  component: SignInPage,
})

// Buildathon mode: keep the test-accounts picker visible in production so
// judges/reviewers can sign in with seeded credentials without typing them.
// Flip back to `import.meta.env.DEV` once the project is no longer being
// demoed publicly.
const SHOW_TEST_PICKER = true

function SignInPage() {
  const siteName = useSiteName()
  const navigate = useNavigate()
  const search = Route.useSearch()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pickerValue, setPickerValue] = useState<string>('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await signIn.email({ email, password })
    setLoading(false)
    if (err) {
      setError(err.message ?? 'Sign-in failed')
      return
    }
    navigate({ to: search.redirect ?? '/dashboard' })
  }

  function handlePickAccount(emailValue: string) {
    const account = TEST_ACCOUNTS.find((a) => a.email === emailValue)
    if (!account) return
    setPickerValue(emailValue)
    setEmail(account.email)
    setPassword(account.password)
    setError(null)
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
            to="/sign-up"
            className="text-[14px] font-medium text-[var(--color-mm-ink)] hover:text-[var(--color-mm-accent)]"
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[420px]">
          <div className="text-center mb-8">
            <h1 className="font-display text-[32px] leading-tight text-[var(--color-mm-ink)]">
              Welcome back
            </h1>
            <p className="mt-2 text-[15px] text-[var(--color-mm-subtle)]">
              Log in to your {siteName} workspace.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white border border-[var(--color-mm-line-strong)] squircle-md p-6 sm:p-8 space-y-5"
          >
            {SHOW_TEST_PICKER && (
              <div className="space-y-1.5 -mx-2 -mt-2 p-3 squircle-sm bg-[var(--color-mm-canvas)] border border-dashed border-[var(--color-mm-line-strong)]">
                <Label className="flex items-center gap-1.5 text-[12px] text-[var(--color-mm-subtle)]">
                  <FlaskConical className="h-3.5 w-3.5" />
                  Dev only · Test accounts
                </Label>
                <Select
                  value={pickerValue}
                  onValueChange={handlePickAccount}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Pick a seeded account…" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEST_ACCOUNTS.map((a) => (
                      <SelectItem key={a.email} value={a.email}>
                        <span className="flex flex-col gap-0.5 py-0.5">
                          <span className="text-[13px] font-medium text-[var(--color-mm-ink)]">
                            {a.name}
                          </span>
                          <span className="text-[11.5px] text-[var(--color-mm-subtle)]">
                            {formatRoleLabel(a.role)} · {a.orgLabel}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11.5px] text-[var(--color-mm-subtle)]">
                  Fills email + password from <code>scripts/seed.ts</code>.
                  Hidden in production builds.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@your-organization.org"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <a
                  href="#"
                  className="text-[12.5px] font-medium text-[var(--color-mm-accent)] hover:underline"
                >
                  Forgot password?
                </a>
              </div>
              <Input
                id="password"
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="text-[13px] text-[var(--color-mm-bad)] bg-white border border-[var(--color-mm-bad)] squircle-xs px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} size="lg" className="w-full">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>

            <div className="text-center text-[14px] text-[var(--color-mm-subtle)]">
              Don't have an account?{' '}
              <Link
                to="/sign-up"
                className="text-[var(--color-mm-accent)] font-medium hover:underline"
              >
                Sign up
              </Link>
            </div>
          </form>

          <p className="mt-6 text-center text-[12px] text-[var(--color-mm-subtle)]">
            By continuing you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  )
}
