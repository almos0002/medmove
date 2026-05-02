import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/sign-in')({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => {
    const r = s.redirect
    if (typeof r === 'string' && r.startsWith('/')) return { redirect: r }
    return {}
  },
  component: SignInPage,
})

function SignInPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-[var(--color-mm-line)]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-[72px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center bg-[var(--color-mm-accent)] text-white squircle-sm">
              <ShieldCheck className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <span className="font-display text-[20px] text-[var(--color-mm-accent)]">
              MedMove
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
              Log in to your MedMove workspace.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white border border-[var(--color-mm-line-strong)] squircle-md p-6 sm:p-8 space-y-5"
          >
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
