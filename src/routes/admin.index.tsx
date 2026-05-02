import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Building2, FileCheck2, ShieldCheck } from 'lucide-react'
import { adminListOrganizations } from '@/server/functions/organizations'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoading } from '@/components/feedback/PageLoading'
import { PageError } from '@/components/feedback/PageError'

export const Route = createFileRoute('/admin/')({
  loader: async () => {
    // Pull a tiny snapshot to power the dashboard counters.
    const [pending, allRecent] = await Promise.all([
      adminListOrganizations({ data: { status: 'pending', limit: 5 } }),
      adminListOrganizations({ data: { limit: 5 } }),
    ])
    return {
      pendingTotal: pending.total,
      pending: pending.organizations,
      recent: allRecent.organizations,
    }
  },
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  component: AdminHome,
})

function AdminHome() {
  const { session } = Route.useRouteContext()
  const data = Route.useLoaderData()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin overview"
        description={
          <>
            Signed in as{' '}
            <span className="font-medium text-[var(--color-mm-ink)]">
              {session.user?.email}
            </span>
            .
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat
          icon={Building2}
          label="Pending organizations"
          value={data.pendingTotal}
          to="/admin/organizations"
          accent
        />
        <Stat
          icon={FileCheck2}
          label="Listings queue"
          value="—"
          hint="Coming next milestone"
        />
        <Stat
          icon={ShieldCheck}
          label="Transfer requests"
          value="—"
          hint="Coming next milestone"
        />
      </div>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-mm-ink)]">
                Awaiting verification
              </h2>
              <p className="text-xs text-[var(--color-mm-muted)]">
                Most recent organizations submitted for review.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/organizations" search={{ status: 'pending' }}>
                Open queue
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          {data.pending.length === 0 ? (
            <p className="text-sm text-[var(--color-mm-subtle)]">
              No organizations are pending review.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-mm-line)] -mx-6">
              {data.pending.map((org) => (
                <li key={org.id} className="px-6 py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/admin/organizations/$orgId"
                      params={{ orgId: org.id }}
                      className="text-sm font-medium text-[var(--color-mm-ink)] hover:underline"
                    >
                      {org.name}
                    </Link>
                    <div className="text-xs text-[var(--color-mm-muted)]">
                      {org.type} · {org.city}, {org.country} ·{' '}
                      {org.pendingDocCount} document(s) pending
                    </div>
                  </div>
                  <Link
                    to="/admin/organizations/$orgId"
                    params={{ orgId: org.id }}
                    className="text-xs font-medium text-[var(--color-mm-accent)] hover:underline"
                  >
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  to,
  accent,
}: {
  icon: typeof Building2
  label: string
  value: React.ReactNode
  hint?: string
  to?: string
  accent?: boolean
}) {
  const inner = (
    <Card>
      <CardContent className="flex items-start gap-3">
        <div
          className={
            (accent
              ? 'bg-[var(--color-mm-accent-soft)] text-[var(--color-mm-accent)]'
              : 'bg-[var(--color-mm-canvas)] text-[var(--color-mm-muted)]') +
            ' h-9 w-9 inline-flex items-center justify-center squircle shrink-0'
          }
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--color-mm-subtle)]">
            {label}
          </div>
          <div className="text-2xl font-semibold text-[var(--color-mm-ink)] mt-0.5 leading-none">
            {value}
          </div>
          {hint && (
            <div className="text-[11px] text-[var(--color-mm-subtle)] mt-1">
              {hint}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
  return to ? (
    <Link to={to} className="block">
      {inner}
    </Link>
  ) : (
    inner
  )
}
