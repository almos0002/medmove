import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Building2 } from 'lucide-react'
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
import { OrgTypeBadge } from '@/components/data/OrgTypeBadge'
import { CapabilityChipRow } from '@/components/data/CapabilityChip'

export const Route = createFileRoute('/org/profile')({
  loader: () => getMyOrganization(),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  component: ProfilePage,
})

function ProfilePage() {
  const data = Route.useLoaderData()
  const org = data.organization

  if (!org) {
    return (
      <div className="space-y-6">
        <PageHeader title="Organization profile" />
        <EmptyState
          icon={Building2}
          title="No organization on file"
          description="Register your organization to set up your profile."
          action={
            <Button asChild>
              <Link to="/onboarding">Register organization</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="self-start -ml-2">
        <Link to="/org">
          <ArrowLeft className="h-4 w-4" />
          Back to overview
        </Link>
      </Button>

      <PageHeader
        title="Organization profile"
        description="Read-only snapshot of the information MedMove has on file. To request changes, contact support."
        actions={
          <VerificationStatusBadge
            status={org.verificationStatus as OrgVerificationStatus}
          />
        }
      />

      <Card>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <Field label="Name" value={org.name} />
          <Field label="Type" value={<OrgTypeBadge type={org.type} />} />
          <Field label="Licence number" value={org.licenseNumber} mono />
          <Field
            label="Member since"
            value={new Date(org.createdAt).toLocaleDateString()}
          />
          <Field label="Contact email" value={org.contactEmail} />
          <Field label="Contact phone" value={org.contactPhone} />
        </CardContent>
        <Separator />
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <Field
            label="Address"
            value={
              <div className="space-y-0.5 text-sm">
                <div>{org.addressLine1}</div>
                {org.addressLine2 && <div>{org.addressLine2}</div>}
                <div>
                  {org.city}
                  {org.state ? `, ${org.state}` : ''}
                  {org.postalCode ? ` ${org.postalCode}` : ''}
                </div>
                <div>{org.country}</div>
              </div>
            }
          />
          <Field
            label="Capabilities"
            value={
              <CapabilityChipRow
                canListMedicine={org.canListMedicine}
                canRequestMedicine={org.canRequestMedicine}
                canDeliverMedicine={org.canDeliverMedicine}
              />
            }
          />
        </CardContent>

        {org.rejectionReason && (
          <>
            <Separator />
            <CardContent>
              <Field
                label="Rejection reason"
                value={
                  <span className="text-[var(--color-mm-bad)]">
                    {org.rejectionReason}
                  </span>
                }
              />
            </CardContent>
          </>
        )}
        {org.suspensionReason && (
          <>
            <Separator />
            <CardContent>
              <Field
                label="Suspension reason"
                value={
                  <span className="text-[var(--color-mm-cool)]">
                    {org.suspensionReason}
                  </span>
                }
              />
            </CardContent>
          </>
        )}
      </Card>

      <p className="text-xs text-[var(--color-mm-subtle)]">
        Profile editing will arrive in a future release. For now, contact
        MedMove admin support to update incorrect details.
      </p>
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
    <div>
      <div className="text-xs uppercase tracking-wide text-[var(--color-mm-subtle)] mb-1">
        {label}
      </div>
      <div
        className={
          mono
            ? 'text-sm text-[var(--color-mm-ink)] break-all'
            : 'text-sm text-[var(--color-mm-ink)]'
        }
      >
        {value}
      </div>
    </div>
  )
}
