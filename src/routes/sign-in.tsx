import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Loader2, Mail, ShieldCheck } from 'lucide-react'
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
    <div className="min-h-screen bg-[var(--color-mm-canvas)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 inline-flex h-10 w-10 items-center justify-center bg-[var(--color-mm-accent)] text-white squircle">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--color-mm-ink)]">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-[var(--color-mm-muted)]">
            Sign in to your MedMove account.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[var(--color-mm-surface)] squircle-md border border-[var(--color-mm-line)] p-6 space-y-5"
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-mm-subtle)] pointer-events-none" />
              <Input
                id="email"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
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
            <div className="text-sm text-[var(--color-mm-bad)] bg-[var(--color-mm-bad-soft)] border border-[var(--color-mm-bad-soft)] px-3 py-2 squircle-sm">
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full">
            {!loading && <span>Sign in</span>}
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </Button>

          <p className="text-center text-sm text-[var(--color-mm-muted)]">
            Don’t have an account?{' '}
            <Link
              to="/sign-up"
              className="text-[var(--color-mm-accent)] font-medium hover:underline"
            >
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
