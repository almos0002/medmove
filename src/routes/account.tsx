import { createFileRoute, Link, Outlet, redirect } from '@tanstack/react-router'
import { ArrowLeft, Bell, KeyRound, ShieldCheck, User as UserIcon } from 'lucide-react'
import { getServerSession } from '@/server/functions/session'
import { getMyAccount } from '@/server/functions/account'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoading } from '@/components/feedback/PageLoading'
import { PageError } from '@/components/feedback/PageError'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/account')({
  beforeLoad: async () => {
    const session = await getServerSession()
    if (!session.user) {
      throw redirect({ to: '/sign-in', search: { redirect: '/account' } })
    }
    return { session }
  },
  loader: () => getMyAccount(),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  component: AccountLayout,
})

const TABS = [
  { to: '/account', label: 'Security', icon: KeyRound, exact: true },
  { to: '/account/notifications', label: 'Notifications', icon: Bell, exact: false },
] as const

function AccountLayout() {
  const data = Route.useLoaderData()
  const acc = data.account
  return (
    <div className="min-h-screen bg-white">
      <main className="px-5 sm:px-8 py-10 max-w-4xl mx-auto space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>

        <PageHeader
          title="Account & security"
          description={`Signed in as ${acc.email}`}
          actions={
            <Button asChild variant="secondary" size="sm">
              <Link to="/profile">
                <UserIcon className="h-4 w-4" />
                Edit profile
              </Link>
            </Button>
          }
        />

        <nav className="flex flex-wrap gap-1.5">
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <Link
                key={t.to}
                to={t.to}
                activeOptions={{ exact: t.exact }}
                activeProps={{
                  className:
                    'bg-[var(--color-mm-accent)] text-white border-[var(--color-mm-accent)]',
                }}
                className={cn(
                  'inline-flex items-center gap-2 px-3 h-9 text-[13px] font-medium squircle-xs border border-[var(--color-mm-line-strong)] text-[var(--color-mm-ink)] bg-white',
                  'hover:bg-black/[0.03]',
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.6} />
                {t.label}
              </Link>
            )
          })}
        </nav>

        <Outlet />
      </main>
    </div>
  )
}

export function AccountSummaryCard({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-2.5 text-[var(--color-mm-subtle)]">
          <ShieldCheck className="h-4 w-4" strokeWidth={1.6} />
          <span className="text-[12px] uppercase tracking-wide">
            Account & security
          </span>
        </div>
        {children}
      </CardContent>
    </Card>
  )
}
