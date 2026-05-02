import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, FileCheck2, Repeat, ShieldCheck } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-[var(--color-mm-canvas)]">
      <header className="border-b border-[var(--color-mm-line)] bg-[var(--color-mm-surface)]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 inline-flex items-center justify-center bg-[var(--color-mm-accent)] text-white squircle">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="font-semibold text-[var(--color-mm-ink)]">
              MedMove
            </span>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            {session ? (
              <Button asChild variant="primary" size="sm">
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/sign-in" search={{}}>Sign in</Link>
                </Button>
                <Button asChild variant="primary" size="sm">
                  <Link to="/sign-up">Get started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="inline-flex items-center gap-2 bg-[var(--color-mm-accent-soft)] text-[var(--color-mm-accent)] text-xs font-medium px-3 py-1 squircle">
          <ShieldCheck className="h-3.5 w-3.5" />
          Verified-only network
        </div>
        <h1 className="mt-4 text-5xl font-bold tracking-tight text-[var(--color-mm-ink)] max-w-3xl">
          Verified medicine, redirected to where it’s needed.
        </h1>
        <p className="mt-4 text-lg text-[var(--color-mm-muted)] max-w-2xl">
          MedMove connects pharmacies, clinics, hospitals, NGOs and
          distributors so near-expiry medicine moves to the patients who
          need it instead of going to waste.
        </p>

        {!session && (
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/sign-up">
                Create your account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/sign-in" search={{}}>Sign in</Link>
            </Button>
          </div>
        )}

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          <FeatureCard
            icon={ShieldCheck}
            title="Verified organizations"
            body="Every pharmacy, clinic, hospital, NGO, distributor and logistics partner is reviewed by MedMove before it can list, request or deliver medicine."
          />
          <FeatureCard
            icon={Repeat}
            title="Closed-loop transfers"
            body="Listings → requests → admin approval → assigned delivery. A full audit trail at every step."
          />
          <FeatureCard
            icon={FileCheck2}
            title="Document-first onboarding"
            body="Upload your pharmacy licence and business registration once. Capabilities unlock the moment we verify."
          />
        </div>
      </main>

      <footer className="border-t border-[var(--color-mm-line)] mt-12">
        <div className="max-w-5xl mx-auto px-6 py-6 text-xs text-[var(--color-mm-subtle)] flex items-center justify-between">
          <span>© {new Date().getFullYear()} MedMove</span>
          <span>Verified-only network</span>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ShieldCheck
  title: string
  body: string
}) {
  return (
    <div className="bg-[var(--color-mm-surface)] border border-[var(--color-mm-line)] squircle-md p-6">
      <div className="h-10 w-10 inline-flex items-center justify-center bg-[var(--color-mm-accent-soft)] text-[var(--color-mm-accent)] squircle">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-[var(--color-mm-ink)]">
        {title}
      </h2>
      <p className="mt-2 text-sm text-[var(--color-mm-muted)] leading-relaxed">
        {body}
      </p>
    </div>
  )
}
