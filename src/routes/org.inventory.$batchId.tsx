import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { getInventoryBatch } from '@/server/functions/inventory'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoading } from '@/components/feedback/PageLoading'
import { PageError } from '@/components/feedback/PageError'
import { ExpiryStatusBadge } from '@/components/data/ExpiryStatusBadge'
import { SealedStatusBadge } from '@/components/data/SealedStatusBadge'
import { StorageTypeBadge } from '@/components/data/StorageTypeBadge'
import { MedicineFormLabel } from '@/components/data/MedicineFormLabel'
import { formatExpiryRelative } from '@/lib/expiry'

export const Route = createFileRoute('/org/inventory/$batchId')({
  loader: ({ params }) => getInventoryBatch({ data: { id: params.batchId } }),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => <PageError error={error} reset={reset} />,
  component: OrgInventoryDetailPage,
})

function OrgInventoryDetailPage() {
  const { batch, medicine, organization } = Route.useLoaderData()

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3">
          <Link to="/org/inventory">
            <ArrowLeft className="h-4 w-4" />
            Back to inventory
          </Link>
        </Button>
        <PageHeader
          title={medicine.name}
          description={
            <>
              Batch{' '}
              <span className="text-[var(--color-mm-ink)]">
                {batch.batchNumber}
              </span>{' '}
              · {organization.name}
            </>
          }
          actions={<ExpiryStatusBadge expiryDate={batch.expiryDate as unknown as string} showDays />}
        />
      </div>

      <Card className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Stat
          label="Quantity on hand"
          value={
            <>
              {batch.quantityOnHand.toLocaleString()}{' '}
              <span className="text-[var(--color-mm-subtle)] text-sm font-normal">
                {batch.unit}
              </span>
            </>
          }
        />
        <Stat
          label="Expiry"
          value={format(new Date(batch.expiryDate as unknown as string), 'd MMM yyyy')}
          sub={formatExpiryRelative(batch.expiryDate as unknown as string)}
        />
        <Stat
          label="Recorded"
          value={format(new Date(batch.createdAt), 'd MMM yyyy')}
          sub={`Updated ${format(new Date(batch.updatedAt), 'd MMM yyyy')}`}
        />
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-display text-[18px] text-[var(--color-mm-ink)]">
          Medicine
        </h2>
        <Row label="Name" value={medicine.name} />
        <Row label="Strength" value={medicine.strength} />
        <Row label="Form" value={<MedicineFormLabel form={medicine.form} />} />
        {medicine.genericName && <Row label="Generic name" value={medicine.genericName} />}
        {medicine.manufacturer && <Row label="Manufacturer" value={medicine.manufacturer} />}
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-display text-[18px] text-[var(--color-mm-ink)]">
          Batch
        </h2>
        <Row
          label="Batch number"
          value={<span>{batch.batchNumber}</span>}
        />
        {batch.manufactureDate && (
          <Row
            label="Manufactured"
            value={format(new Date(batch.manufactureDate as unknown as string), 'd MMM yyyy')}
          />
        )}
        <Row
          label="Sealed status"
          value={<SealedStatusBadge sealed={batch.sealedStatus as 'sealed' | 'opened'} />}
        />
        <Row
          label="Storage"
          value={<StorageTypeBadge type={batch.storageType} />}
        />
        {batch.notes && (
          <Row
            label="Notes"
            value={
              <p className="whitespace-pre-wrap text-[var(--color-mm-muted)]">
                {batch.notes}
              </p>
            }
          />
        )}
      </Card>
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
}) {
  return (
    <div>
      <div className="eyebrow mb-2">{label}</div>
      <div className="font-display text-[24px] leading-tight text-[var(--color-mm-ink)]">
        {value}
      </div>
      {sub && (
        <div className="text-xs text-[var(--color-mm-subtle)] mt-1">{sub}</div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 sm:gap-6 items-start">
      <div className="text-[12px] uppercase tracking-wide text-[var(--color-mm-subtle)] font-medium pt-0.5">
        {label}
      </div>
      <div className="text-sm text-[var(--color-mm-ink)]">{value}</div>
    </div>
  )
}
