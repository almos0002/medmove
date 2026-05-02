import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react'
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
    <div className="min-h-screen bg-white grid grid-cols-1 lg:grid-cols-2">
      {/* Editorial visual panel */}
      <aside className="hidden lg:flex relative bg-white border-r border-[var(--color-mm-line)] flex-col p-12">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center bg-[var(--color-mm-ink)] text-white squircle-sm">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span className="font-display text-[22px]">MedMove</span>
        </Link>
        <div className="my-12 flex-1 squircle-md overflow-hidden border border-[var(--color-mm-line)]">
          <img src="/img/shelves.jpg" alt="Pharmacy shelves" className="w-full h-full object-cover" />
        </div>
        <div>
          <div className="eyebrow flex items-center gap-3">
            <span className="tick" /> Welcome back
          </div>
          <h2 className="mt-4 font-display text-[clamp(40px,4.5vw,60px)] leading-[0.95] tracking-tight">
            Resume the<br />
            <span className="italic text-[var(--color-mm-accent)]">redirection.</span>
          </h2>
          <p className="mt-5 text-[14px] text-[var(--color-mm-muted)] max-w-sm leading-relaxed">
            Pick up where you left off — your listings, requests, and assigned
            deliveries are waiting.
          </p>
        </div>
      </aside>

      {/* Form panel */}
      <div className="flex flex-col">
        <header className="lg:hidden border-b border-[var(--color-mm-line)] px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center bg-[var(--color-mm-ink)] text-white squircle-xs">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="font-display text-[18px]">MedMove</span>
          </Link>
          <Link to="/sign-up" className="text-sm link-underline">Open an account</Link>
        </header>
        <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-[420px]">
            <div className="eyebrow">Sign in</div>
            <h1 className="mt-5 font-display text-[clamp(40px,5vw,56px)] leading-[0.95] tracking-tight">
              Welcome<br />
              <span className="italic">back.</span>
            </h1>
            <p className="mt-4 text-sm text-[var(--color-mm-muted)] max-w-sm">
              Sign in to your MedMove workspace.
            </p>

            <form onSubmit={handleSubmit} className="mt-12 space-y-8">
              <div className="space-y-2">
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
              <div className="space-y-2">
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
                <div className="text-[13px] text-[var(--color-mm-bad)] border-l-2 border-[var(--color-mm-bad)] pl-3 py-1">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} size="lg" className="w-full">
                {!loading && <>Continue <ArrowRight className="h-4 w-4" /></>}
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              </Button>

              <p className="text-sm text-[var(--color-mm-muted)]">
                Don't have an account?{' '}
                <Link to="/sign-up" className="text-[var(--color-mm-ink)] link-underline font-medium">
                  Open one
                </Link>
              </p>
            </form>
          </div>
        </main>
        <footer className="border-t border-[var(--color-mm-line)] px-6 sm:px-12 py-4 text-[11px] text-[var(--color-mm-muted)] flex items-center justify-between">
          <span>© {new Date().getFullYear()} MedMove</span>
          <span className="font-display italic">Verified-only network</span>
        </footer>
      </div>
    </div>
  )
}
