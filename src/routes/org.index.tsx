import { createFileRoute, Link } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  FileCheck2,
  PauseCircle,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { isOrgOwner } from '@/lib/permissions'
import { getMyOrganization } from '@/server/functions/organizations'
import { getOrgExpirySummaryFn } from '@/server/functions/expiry'
import type { OrgExpirySummary } from '@/server/expiry'
import { ExpiryAlertCards } from '@/components/notifications/ExpiryAlertCards'
import { ExpiringInventoryTable } from '@/components/notifications/ExpiringInventoryTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/feedback/EmptyState'
import { PageLoading } from '@/components/feedback/PageLoading'
import { PageError } from '@/components/feedback/PageError'
import { VerificationStatusBadge } from '@/components/data/StatusBadge'
import type { OrgVerificationStatus } from '@/components/data/StatusBadge'
import {
  CapabilityChipRow,
} from '@/components/data/CapabilityChip'
import { OrgTypeBadge } from '@/components/data/OrgTypeBadge'

export const Route = createFileRoute('/org/')({
  loader: async () => {
    const data = await getMyOrganization()
    let expiry: OrgExpirySummary | null = null
    if (data.organization && data.organization.verificationStatus === 'verified') {
      const res = await getOrgExpirySummaryFn({
        data: { organizationId: data.organization.id },
      })
      expiry = res.summary
    }
    return { ... data, expiry }
  },
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  head: pageHead({ title: "Workspace", noindex: true }),
  component: OrgHome,
})

function OrgHome() {
  const { session } = Route.useRouteContext()
  const data = Route.useLoaderData()
  const org = data.organization
  const documents = data.documents
  const expiry = data.expiry

  if (!org) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Welcome"
          description="Your account isn’t linked to an organization yet."
        />
        <EmptyState
          icon={Building2}
          title="No organization on file"
          description={
            isOrgOwner(session.user?.role)
              ? 'Register your organization to start the verification process.'
              : 'Ask your organization owner to add you, or contact MedMove support.'
          }
          action={
            isOrgOwner(session.user?.role) ? (
              <Button asChild>
                <Link to="/onboarding">
                  Register organization
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : null
          }
        />
      </div>
    )
  }

  const pendingDocs = documents.filter((d) => d.status === 'pending').length
  const approvedDocs = documents.filter((d) => d.status === 'approved').length
  const rejectedDocs = documents.filter((d) => d.status === 'rejected').length

  return (
    <div className="space-y-6">
      <PageHeader
        title={org.name}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <OrgTypeBadge type={org.type} />
            <span className="text-[var(--color-mm-subtle)]">·</span>
            <span>{org.city}, {org.country}</span>
          </span>
        }
        actions={
          <VerificationStatusBadge
            status={org.verificationStatus}
          />
        }
      />

      <StatusBanner
        status={org.verificationStatus}
        rejectionReason={org.rejectionReason ?? undefined}
        suspensionReason={org.suspensionReason ?? undefined}
        documentsPending={pendingDocs}
        documentsApproved={approvedDocs}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          icon={CheckCircle2}
          label="Capabilities"
          value={
            [
              org.canListMedicine && 'List',
              org.canRequestMedicine && 'Request',
              org.canDeliverMedicine && 'Deliver',
            ]
              .filter(Boolean)
              .join(' · ') || '—'
          }
          muted={
            org.verificationStatus !== 'verified'
              ? 'Activates after verification'
              : undefined
          }
        />
        <SummaryCard
          icon={FileCheck2}
          label="Documents"
          value={`${approvedDocs} approved · ${pendingDocs} pending${
            rejectedDocs ? ` · ${rejectedDocs} rejected` : ''
          }`}
          muted={documents.length === 0 ? 'None uploaded yet' : undefined}
        />
        <SummaryCard
          icon={Building2}
          label="Licence"
          value={org.licenseNumber}
        />
      </div>

      <Card>
        <CardContent className="space-y-3">
          <div className="text-xs uppercase tracking-wide text-[var(--color-mm-subtle)]">
            Active capabilities
          </div>
          <CapabilityChipRow
            canListMedicine={org.canListMedicine}
            canRequestMedicine={org.canRequestMedicine}
            canDeliverMedicine={org.canDeliverMedicine}
          />
          <p className="text-xs text-[var(--color-mm-subtle)]">
            Capabilities are administered by MedMove. They activate only
            once your organization is <strong>verified</strong>.
          </p>
        </CardContent>
      </Card>

      {expiry && (
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <div className="eyebrow">Expiry watch</div>
              <h2 className="text-base font-semibold text-[var(--color-mm-ink)]">
                Inventory expiry overview
              </h2>
            </div>
            <Link
              to="/org/inventory"
              className="text-xs text-[var(--color-mm-accent)] hover:underline inline-flex items-center gap-1"
            >
              Open inventory <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ExpiryAlertCards totals={expiry.totals} />
          <ExpiringInventoryTable rows={expiry.topExpiring} />
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary">
          <Link to="/org/profile">View profile</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/org/documents">
            Verification documents
            {pendingDocs > 0 && (
              <span className="ml-1 inline-flex items-center justify-center bg-[var(--color-mm-warn-soft)] text-[var(--color-mm-warn)] text-[10px] font-semibold px-1.5 py-0.5 squircle">
                {pendingDocs}
              </span>
            )}
          </Link>
        </Button>
      </div>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  muted,
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  muted?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3">
        <div className="h-9 w-9 inline-flex items-center justify-center bg-[var(--color-mm-canvas)] squircle shrink-0">
          <Icon className="h-4 w-4 text-[var(--color-mm-muted)]" />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-[var(--color-mm-subtle)]">
            {label}
          </div>
          <div className="text-sm font-medium text-[var(--color-mm-ink)] mt-0.5 break-words">
            {value}
          </div>
          {muted && (
            <div className="text-[11px] text-[var(--color-mm-subtle)] mt-1">
              {muted}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBanner({
  status,
  rejectionReason,
  suspensionReason,
  documentsPending,
  documentsApproved,
}: {
  status: OrgVerificationStatus
  rejectionReason?: string
  suspensionReason?: string
  documentsPending: number
  documentsApproved: number
}) {
  const COMMON =
    'flex items-start gap-3 px-5 py-4 squircle-md border'
  switch (status) {
    case 'pending':
      return (
        <div
          className={`${COMMON} bg-[var(--color-mm-warn-soft)] border-[var(--color-mm-warn-soft)]`}
        >
          <Clock className="h-5 w-5 text-[var(--color-mm-warn)] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-sm font-semibold text-[var(--color-mm-warn)]">
              Awaiting verification
            </div>
            <p className="text-sm text-[var(--color-mm-warn)]/90">
              {documentsApproved === 0 && documentsPending === 0
                ? 'Upload your verification documents to begin admin review.'
                : `${documentsApproved} document(s) approved, ${documentsPending} awaiting review. Medicine actions unlock once your organization is verified.`}
            </p>
            <div>
              <Link
                to="/org/documents"
                className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-mm-warn)] underline-offset-4 hover:underline"
              >
                Manage documents
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )
    case 'verified':
      return (
        <div
          className={`${COMMON} bg-[var(--color-mm-ok-soft)] border-[var(--color-mm-ok-soft)]`}
        >
          <CheckCircle2 className="h-5 w-5 text-[var(--color-mm-ok)] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="text-sm font-semibold text-[var(--color-mm-ok)]">
              Verified by MedMove
            </div>
            <p className="text-sm text-[var(--color-mm-ok)]/90">
              Your enabled capabilities are now active.
            </p>
          </div>
        </div>
      )
    case 'rejected':
      return (
        <div
          className={`${COMMON} bg-[var(--color-mm-bad-soft)] border-[var(--color-mm-bad-soft)]`}
        >
          <XCircle className="h-5 w-5 text-[var(--color-mm-bad)] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-sm font-semibold text-[var(--color-mm-bad)]">
              Verification rejected
            </div>
            {rejectionReason && (
              <p className="text-sm text-[var(--color-mm-bad)]/90">
                <span className="font-medium">Reason:</span> {rejectionReason}
              </p>
            )}
            <p className="text-sm text-[var(--color-mm-bad)]/90">
              Update your details or upload corrected documents and the
              organization will return to pending review.
            </p>
            <div className="flex gap-3">
              <Link
                to="/org/profile"
                className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-mm-bad)] underline-offset-4 hover:underline"
              >
                Update profile
              </Link>
              <Link
                to="/org/documents"
                className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-mm-bad)] underline-offset-4 hover:underline"
              >
                Re-upload documents
              </Link>
            </div>
          </div>
        </div>
      )
    case 'suspended':
      return (
        <div className={`${COMMON} bg-[var(--color-mm-cool-soft)] border-[var(--color-mm-cool-soft)]`}>
          <PauseCircle className="h-5 w-5 text-[var(--color-mm-cool)] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-sm font-semibold text-[var(--color-mm-cool)]">
              Account suspended
            </div>
            {suspensionReason && (
              <p className="text-sm text-[var(--color-mm-cool)]/90">
                <span className="font-medium">Reason:</span> {suspensionReason}
              </p>
            )}
            <p className="text-sm text-[var(--color-mm-cool)]/90">
              All medicine actions are paused. Contact MedMove support to
              resolve.
            </p>
          </div>
        </div>
      )
    default:
      return (
        <div className={`${COMMON} bg-[var(--color-mm-canvas)] border-[var(--color-mm-line)]`}>
          <AlertTriangle className="h-5 w-5 text-[var(--color-mm-muted)] shrink-0 mt-0.5" />
          <div className="text-sm">Unknown status — contact support.</div>
        </div>
      )
  }
}
