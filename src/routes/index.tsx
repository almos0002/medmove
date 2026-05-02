import { createFileRoute, Link } from '@tanstack/react-router'
import { Sparkles, Zap, Palette, ArrowRight, ShieldCheck } from 'lucide-react'
import { useSession } from '@/lib/auth-client'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b border-slate-200 bg-white/60 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-600" />
            <span className="font-semibold text-slate-900">MedMove</span>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            {session ? (
              <Link
                to="/dashboard"
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link to="/sign-in" className="text-slate-700 hover:text-slate-900">
                  Sign in
                </Link>
                <Link
                  to="/sign-up"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
                >
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-5xl font-bold tracking-tight text-slate-900">
          Welcome to MedMove
        </h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl">
          Connect pharmacies with hospitals and NGOs to redistribute near-expiry
          medicine — reduce waste, save lives.
        </p>

        {!session && (
          <Link
            to="/sign-up"
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
          >
            Create your account <ArrowRight className="h-4 w-4" />
          </Link>
        )}

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <Palette className="h-8 w-8 text-indigo-600" />
            <h2 className="mt-4 text-xl font-semibold">Tailwind v4</h2>
            <p className="mt-2 text-sm text-slate-600">
              Modern utility-first CSS with the new Vite plugin.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <Sparkles className="h-8 w-8 text-amber-500" />
            <h2 className="mt-4 text-xl font-semibold">Lucide Icons</h2>
            <p className="mt-2 text-sm text-slate-600">
              Beautiful, consistent icons as React components.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <Zap className="h-8 w-8 text-emerald-600" />
            <h2 className="mt-4 text-xl font-semibold">Better Auth</h2>
            <p className="mt-2 text-sm text-slate-600">
              Email & password auth with role-based MedMove accounts.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
