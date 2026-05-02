import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  Inbox,
  Package,
  ScrollText,
  ShieldCheck,
  Tags,
  Truck,
} from 'lucide-react'
import { adminListOrganizations } from '@/server/functions/organizations'
import { getAdminReportMetrics } from '@/server/functions/reports'
import {
  getAuditLog,
  listRecentActivity,
} from '@/server/functions/audit'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageError } from '@/components/feedback/PageError'
import { PageLoading } from '@/components/feedback/PageLoading'
import { MetricCard } from '@/components/data/MetricCard'
import { RecentActivityFeed } from '@/components/data/RecentActivityFeed'
import {
  AuditLogDetailDialog,
  type AuditLogDetailRow,
} from '@/components/data/AuditLogDetailDialog'

export const Route = createFileRoute('/admin/')({
  loader: async () => {
    const [pending, metrics, recent] = await Promise.all([
      adminListOrganizations({ data: { status: 'pending', limit: 5 } }),
      getAdminReportMetrics(),
      listRecentActivity({ data: { limit: 8 } }),
    ])
    return {
      pendingTotal: pending.total,
      pending: pending.organizations,
      metrics,
      recent,
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
  const { pending, metrics, recent } = Route.useLoaderData()
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const detailQuery = useQuery({
    enabled: !!selectedId,
    queryKey: ['audit-log', selectedId],
    queryFn: () =>
      selectedId
        ? getAuditLog({ data: { id: selectedId } })
        : Promise.resolve(null),
  })

  const stockValueDollars = (metrics.impact.stockValueSavedCents / 100).toFixed(
    2,
  )

  return (
    <div className="space-y-8">
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
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link to="/admin/reports">
              <BarChart3 className="h-4 w-4" />
              Full reports
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          icon={ShieldCheck}
          label="Pending orgs"
          value={metrics.organizations.pending}
          tone={metrics.organizations.pending > 0 ? 'warn' : 'neutral'}
          to="/admin/organizations"
          search={{ status: 'pending' }}
        />
        <MetricCard
          icon={Inbox}
          label="Listings to review"
          value={metrics.listings.pendingReview}
          tone={metrics.listings.pendingReview > 0 ? 'warn' : 'neutral'}
          to="/admin/listings"
          search={{ status: 'pending_admin' }}
        />
        <MetricCard
          icon={Inbox}
          label="Transfers pending"
          value={metrics.transfers.pending}
          tone={metrics.transfers.pending > 0 ? 'warn' : 'neutral'}
          to="/admin/requests"
        />
        <MetricCard
          icon={Truck}
          label="Awaiting delivery setup"
          value={metrics.transfers.awaitingDelivery}
          tone={metrics.transfers.awaitingDelivery > 0 ? 'warn' : 'neutral'}
          to="/admin/requests"
          search={{ status: 'accepted' }}
          hint="Seller accepted — create delivery"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Failed deliveries"
          value={metrics.deliveries.failed}
          tone={metrics.deliveries.failed > 0 ? 'danger' : 'neutral'}
          to="/admin/deliveries"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={CheckCircle2}
          label="Verified orgs"
          value={metrics.organizations.verified}
          tone="success"
          to="/admin/organizations"
          search={{ status: 'verified' }}
        />
        <MetricCard
          icon={Tags}
          label="Active listings"
          value={metrics.listings.active}
          tone="success"
          to="/admin/listings"
          search={{ status: 'active' }}
        />
        <MetricCard
          icon={Truck}
          label="Transfers completed"
          value={metrics.transfers.completed}
          tone="success"
          to="/admin/requests"
        />
        <MetricCard
          icon={Package}
          label="Units rescued"
          value={metrics.impact.unitsRescued.toLocaleString()}
          tone="accent"
          hint={`$${Number(stockValueDollars).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} stock value saved`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <Link
                  to="/admin/organizations"
                  search={{ status: 'pending' }}
                >
                  Open queue
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            {pending.length === 0 ? (
              <p className="text-sm text-[var(--color-mm-subtle)]">
                No organizations are pending review.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-mm-line)] -mx-6">
                {pending.map((org) => (
                  <li
                    key={org.id}
                    className="px-6 py-3 flex items-center gap-3"
                  >
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

        <Card>
          <CardContent className="space-y-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-mm-ink)] flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[var(--color-mm-subtle)]" />
                  Recent activity
                </h2>
                <p className="text-xs text-[var(--color-mm-muted)]">
                  Latest events across the platform.
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin/audit-logs">
                  <ScrollText className="h-4 w-4" />
                  All logs
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="-mx-6 -mb-4">
              <RecentActivityFeed
                items={recent.items as never}
                onSelect={setSelectedId}
                emptyTitle="Quiet for now"
                emptyDescription="Recent platform events will appear here."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 inline-flex items-center justify-center bg-[var(--color-mm-canvas)] squircle-sm">
              <Boxes className="h-5 w-5 text-[var(--color-mm-muted)]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--color-mm-ink)]">
                Need a deeper look?
              </div>
              <p className="text-[12.5px] text-[var(--color-mm-subtle)]">
                The reports page breaks every metric down by category, and the
                audit logs page lets you filter the full event history.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link to="/admin/reports">
                <BarChart3 className="h-4 w-4" />
                Reports
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to="/admin/audit-logs">
                <ScrollText className="h-4 w-4" />
                Audit logs
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <AuditLogDetailDialog
        row={(detailQuery.data ?? null) as AuditLogDetailRow | null}
        open={!!selectedId}
        onOpenChange={(o) => {
          if (!o) setSelectedId(null)
        }}
      />
    </div>
  )
}
