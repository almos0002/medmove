import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Building2,
  CheckCircle2,
  Download,
  Inbox,
  Package,
  PauseCircle,
  ScrollText,
  ShieldCheck,
  Tags,
  Truck,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
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

export const Route = createFileRoute('/admin/reports')({
  loader: async () => {
    const [metrics, recent] = await Promise.all([
      getAdminReportMetrics(),
      listRecentActivity({ data: { limit: 12 } }),
    ])
    return { metrics, recent }
  },
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  component: AdminReportsPage,
})

function AdminReportsPage() {
  const { metrics, recent } = Route.useLoaderData()
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
        eyebrow="Step 11 · Reports"
        title="Platform reports"
        description="Live operational metrics across organizations, listings, transfers and deliveries."
        actions={
          <Button
            variant="secondary"
            size="sm"
            disabled
            title="CSV export — coming soon"
            onClick={() => toast.info('CSV export is coming soon')}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <Section
        title="Organizations"
        description="Verification pipeline at a glance."
      >
        <Grid>
          <MetricCard
            icon={CheckCircle2}
            label="Verified"
            value={metrics.organizations.verified}
            tone="success"
            to="/admin/organizations"
            search={{ status: 'verified' }}
          />
          <MetricCard
            icon={ShieldCheck}
            label="Pending verification"
            value={metrics.organizations.pending}
            tone={metrics.organizations.pending > 0 ? 'warn' : 'neutral'}
            to="/admin/organizations"
            search={{ status: 'pending' }}
            hint={
              metrics.organizations.pending > 0
                ? 'Awaiting admin review'
                : 'Inbox is clear'
            }
          />
          <MetricCard
            icon={XCircle}
            label="Rejected"
            value={metrics.organizations.rejected}
            tone="neutral"
            to="/admin/organizations"
            search={{ status: 'rejected' }}
          />
          <MetricCard
            icon={PauseCircle}
            label="Suspended"
            value={metrics.organizations.suspended}
            tone="neutral"
            to="/admin/organizations"
            search={{ status: 'suspended' }}
          />
        </Grid>
      </Section>

      <Section title="Marketplace" description="Listing and transfer state.">
        <Grid>
          <MetricCard
            icon={Tags}
            label="Active listings"
            value={metrics.listings.active}
            tone="success"
            to="/admin/listings"
            search={{ status: 'active' }}
          />
          <MetricCard
            icon={Inbox}
            label="Listings pending review"
            value={metrics.listings.pendingReview}
            tone={metrics.listings.pendingReview > 0 ? 'warn' : 'neutral'}
            to="/admin/listings"
            search={{ status: 'pending_admin' }}
          />
          <MetricCard
            icon={Inbox}
            label="Pending transfers"
            value={metrics.transfers.pending}
            tone={metrics.transfers.pending > 0 ? 'warn' : 'neutral'}
            hint="Pending admin or seller review"
            to="/admin/requests"
          />
          <MetricCard
            icon={Activity}
            label="In-flight transfers"
            value={metrics.transfers.inFlight}
            tone="neutral"
            hint="Accepted, awaiting handoff or dispatched"
            to="/admin/requests"
          />
        </Grid>
      </Section>

      <Section
        title="Logistics & impact"
        description="What we've moved and what we've prevented from going to waste."
      >
        <Grid>
          <MetricCard
            icon={Truck}
            label="Transfers completed"
            value={metrics.transfers.completed}
            tone="success"
            to="/admin/requests"
          />
          <MetricCard
            icon={AlertTriangle}
            label="Failed deliveries"
            value={metrics.deliveries.failed}
            tone={metrics.deliveries.failed > 0 ? 'danger' : 'neutral'}
            to="/admin/deliveries"
          />
          <MetricCard
            icon={Package}
            label="Units rescued"
            value={metrics.impact.unitsRescued.toLocaleString()}
            tone="accent"
            hint={`${metrics.impact.donatedUnits.toLocaleString()} donated`}
          />
          <MetricCard
            icon={Boxes}
            label="Stock value saved"
            value={`$${Number(stockValueDollars).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            tone="accent"
            hint="Sum of received qty × paid listing price"
          />
        </Grid>
      </Section>

      <div>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="font-display text-[20px] text-[var(--color-mm-ink)] leading-tight">
              Recent activity
            </h2>
            <p className="text-[13px] text-[var(--color-mm-subtle)] mt-1">
              Most recent events across the platform.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/audit-logs">
              <ScrollText className="h-4 w-4" />
              All audit logs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            <RecentActivityFeed
              items={recent.items as never}
              onSelect={setSelectedId}
              emptyTitle="No platform activity yet"
              emptyDescription="As organizations sign up and start moving stock, events appear here."
            />
          </CardContent>
        </Card>
      </div>

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

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-[20px] text-[var(--color-mm-ink)] leading-tight flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[var(--color-mm-subtle)] hidden" />
          {title}
        </h2>
        {description && (
          <p className="text-[13px] text-[var(--color-mm-subtle)] mt-1">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {children}
    </div>
  )
}
