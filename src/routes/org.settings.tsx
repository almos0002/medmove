import { createFileRoute, Link } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'
import { Building2, ExternalLink, FileCheck2, Settings2 } from 'lucide-react'
import { getMyOrganization } from '@/server/functions/organizations'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoading } from '@/components/feedback/PageLoading'
import { PageError } from '@/components/feedback/PageError'
import { EmptyState } from '@/components/feedback/EmptyState'
import {
  VerificationStatusBadge,
  type OrgVerificationStatus,
} from '@/components/data/StatusBadge'
import { CapabilityChipRow } from '@/components/data/CapabilityChip'
import { OrgTypeBadge } from '@/components/data/OrgTypeBadge'
import { formatDate, formatDateTime } from '@/lib/dates'

export const Route = createFileRoute('/org/settings')({
  loader: () => getMyOrganization(),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  head: pageHead({ title: "Organization settings", noindex: true }),
  component: OrgSettingsPage,
})

function OrgSettingsPage() {
  const data = Route.useLoaderData()
  const org = data.organization
  const docs = data.documents

  if (!org) {
    return (
      <div className="space-y-6">
        <PageHeader title="Organization settings" />
        <EmptyState
          icon={Building2}
          title="No organization on file"
          description="Register your organization first to see settings."
          action={
            <Button asChild>
              <Link to="/onboarding">Register organization</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const approvedDocs = docs.filter((d) => d.status === 'approved').length
  const pendingDocs = docs.filter((d) => d.status === 'pending').length
  const rejectedDocs = docs.filter((d) => d.status === 'rejected').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization settings"
        description="Capability flags, verification status and the documents on file. To change details, contact MedMove support."
        actions={
          <VerificationStatusBadge
            status={org.verificationStatus as OrgVerificationStatus}
          />
        }
      />

      <Card>
        <CardContent className="space-y-5">
          <SectionHeader icon={Settings2} title="Capabilities" />
          <CapabilityChipRow
            canListMedicine={org.canListMedicine}
            canRequestMedicine={org.canRequestMedicine}
            canDeliverMedicine={org.canDeliverMedicine}
          />
          <p className="text-[12.5px] text-[var(--color-mm-subtle)] leading-relaxed">
            Capabilities are assigned by MedMove admins after verification.
            Pharmacies typically get list + request, clinics & hospitals get
            request, and logistics partners get deliver.
          </p>

          <Separator />

          <SectionHeader icon={Building2} title="Identity" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            <Field label="Name" value={org.name} />
            <Field label="Type" value={<OrgTypeBadge type={org.type} />} />
            <Field label="Licence number" value={org.licenseNumber} mono />
            <Field
              label="Member since"
              value={formatDate(org.createdAt)}
            />
            <Field label="Contact email" value={org.contactEmail} />
            <Field label="Contact phone" value={org.contactPhone} />
            <Field
              label="Address"
              value={
                <span className="space-y-0.5">
                  <div>{org.addressLine1}</div>
                  {org.addressLine2 && <div>{org.addressLine2}</div>}
                  <div>
                    {org.city}
                    {org.state ? `, ${org.state}` : ''}
                    {org.postalCode ? ` ${org.postalCode}` : ''}
                  </div>
                  <div>{org.country}</div>
                </span>
              }
            />
            <Field
              label="Verified at"
              value={
                org.verifiedAt
                  ? formatDateTime(org.verifiedAt)
                  : 'Not yet verified'
              }
            />
          </div>

          {org.rejectionReason && (
            <>
              <Separator />
              <Field
                label="Rejection reason from support"
                value={
                  <span className="text-[var(--color-mm-bad)]">
                    {org.rejectionReason}
                  </span>
                }
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <SectionHeader icon={FileCheck2} title="Verification documents" />
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Approved" value={approvedDocs} tone="ok" />
            <Stat label="Pending" value={pendingDocs} tone="warn" />
            <Stat label="Rejected" value={rejectedDocs} tone="bad" />
          </div>
          <Button asChild variant="secondary" className="self-start">
            <Link to="/org/documents">
              <ExternalLink className="h-4 w-4" />
              Manage documents
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: typeof Settings2
  title: string
}) {
  return (
    <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-[var(--color-mm-subtle)]">
      <Icon className="h-3.5 w-3.5" strokeWidth={1.6} />
      {title}
    </div>
  )
}

function Field({
  label,
  value,
  mono,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="space-y-1">
      <div className="text-[12px] uppercase tracking-wide text-[var(--color-mm-subtle)]">
        {label}
      </div>
      <div
        className={
          mono
            ? 'text-[14px] font-mono text-[var(--color-mm-ink)]'
            : 'text-[14px] text-[var(--color-mm-ink)]'
        }
      >
        {value}
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'ok' | 'warn' | 'bad'
}) {
  const color =
    tone === 'ok'
      ? 'text-[var(--color-mm-ok)]'
      : tone === 'warn'
        ? 'text-[var(--color-mm-warn)]'
        : 'text-[var(--color-mm-bad)]'
  return (
    <div className="bg-[var(--color-mm-canvas)] border border-[var(--color-mm-line)] squircle-sm p-3.5">
      <div className={`font-display text-[24px] leading-none ${color}`}>
        {value}
      </div>
      <div className="text-[12px] text-[var(--color-mm-subtle)] mt-1">
        {label}
      </div>
    </div>
  )
}
