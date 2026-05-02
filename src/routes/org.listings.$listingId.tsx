import * as React from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Send, Archive, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  getListing,
  submitListing,
  withdrawListing,
} from '@/server/functions/listings'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoading } from '@/components/feedback/PageLoading'
import { PageError } from '@/components/feedback/PageError'
import { ExpiryStatusBadge } from '@/components/data/ExpiryStatusBadge'
import {
  ListingStatusBadge,
  type ListingStatus,
} from '@/components/data/ListingStatusBadge'
import { MedicineFormLabel } from '@/components/data/MedicineFormLabel'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export const Route = createFileRoute('/org/listings/$listingId')({
  loader: ({ params }) => getListing({ data: { id: params.listingId } }),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => <PageError error={error} reset={reset} />,
  head: pageHead({ title: "Listing", noindex: true }),
  component: OrgListingDetailPage,
})

function OrgListingDetailPage() {
  const router = useRouter()
  const { listing, batch, medicine, sellerOrg } = Route.useLoaderData()
  const status = listing.status as ListingStatus

  const submit = useMutation({
    mutationFn: () => submitListing({ data: { listingId: listing.id } }),
    onSuccess: () => {
      toast.success('Submitted for admin review')
      router.invalidate()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Could not submit')
    },
  })

  const withdraw = useMutation({
    mutationFn: () => withdrawListing({ data: { listingId: listing.id } }),
    onSuccess: () => {
      toast.success('Listing withdrawn')
      router.invalidate()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Could not withdraw')
    },
  })

  const canSubmit = status === 'draft'
  const canWithdraw =
    status === 'draft' || status === 'pending_admin' || status === 'active'

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3">
          <Link to="/org/listings">
            <ArrowLeft className="h-4 w-4" />
            Back to listings
          </Link>
        </Button>
        <PageHeader
          title={medicine.name}
          description={
            <>
              Listing from batch{' '}
              <span className="text-[var(--color-mm-ink)]">
                {batch.batchNumber}
              </span>{' '}
              · {sellerOrg.name}
            </>
          }
          actions={<ListingStatusBadge status={status} />}
        />
      </div>

      {Array.isArray(listing.photoUrls) && listing.photoUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {(listing.photoUrls as string[]).slice(0, 8).map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="aspect-square overflow-hidden squircle-md border border-[var(--color-mm-line-strong)] block bg-[var(--color-mm-canvas)] photo-card"
            >
              <img
                src={url}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </a>
          ))}
        </div>
      )}

      {status === 'rejected' && listing.rejectionReason && (
        <Card className="p-4 border-[var(--color-mm-bad)]">
          <div className="flex gap-3">
            <AlertTriangle className="h-4 w-4 text-[var(--color-mm-bad)] shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-[var(--color-mm-ink)] mb-1">
                Rejected by admin
              </div>
              <p className="whitespace-pre-wrap text-[var(--color-mm-muted)]">
                {listing.rejectionReason}
              </p>
            </div>
          </div>
        </Card>
      )}

      {status === 'pending_admin' && (
        <Card className="p-4 border-[var(--color-mm-warn)]">
          <p className="text-sm text-[var(--color-mm-muted)]">
            Awaiting admin review. Submitted{' '}
            {listing.submittedAt
              ? format(new Date(listing.submittedAt), 'd MMM yyyy, HH:mm')
              : '—'}
            . You can withdraw at any time before approval.
          </p>
        </Card>
      )}

      <Card className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Stat
          label="Available / listed"
          value={
            <>
              {listing.quantityAvailable.toLocaleString()}
              <span className="text-[var(--color-mm-subtle)] text-sm font-normal">
                {' '}
                / {listing.quantityListed.toLocaleString()} {batch.unit}
              </span>
            </>
          }
        />
        <Stat
          label="Price"
          value={
            listing.pricePerUnitCents === null ? (
              <span className="text-[var(--color-mm-ok)]">Free</span>
            ) : (
              <>
                {(listing.pricePerUnitCents / 100).toFixed(2)}{' '}
                <span className="text-[var(--color-mm-subtle)] text-sm font-normal">
                  {listing.currency ?? 'USD'} / {batch.unit}
                </span>
              </>
            )
          }
        />
        <Stat
          label="Pickup"
          value={
            <span className="text-[20px]">
              {listing.pickupCity}
            </span>
          }
          sub={listing.pickupCountry}
        />
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-display text-[18px] text-[var(--color-mm-ink)]">
          Medicine
        </h2>
        <Row label="Name" value={medicine.name} />
        <Row label="Strength" value={medicine.strength} />
        <Row
          label="Form"
          value={<MedicineFormLabel form={medicine.form} />}
        />
        {medicine.genericName && (
          <Row label="Generic name" value={medicine.genericName} />
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-display text-[18px] text-[var(--color-mm-ink)]">
          Batch
        </h2>
        <Row
          label="Batch number"
          value={<span>{batch.batchNumber}</span>}
        />
        <Row
          label="Expiry"
          value={
            <div className="flex items-center gap-3">
              <span>
                {format(
                  new Date(batch.expiryDate as unknown as string),
                  'd MMM yyyy',
                )}
              </span>
              <ExpiryStatusBadge
                expiryDate={batch.expiryDate as unknown as string}
                showDays
              />
            </div>
          }
        />
        <Row
          label="Quantity on hand"
          value={`${batch.quantityOnHand.toLocaleString()} ${batch.unit}`}
        />
      </Card>

      {listing.notes && (
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-[18px] text-[var(--color-mm-ink)]">
            Listing details
          </h2>
          <Row
            label="Notes"
            value={
              <p className="whitespace-pre-wrap text-[var(--color-mm-muted)]">
                {listing.notes}
              </p>
            }
          />
        </Card>
      )}

      <Card className="p-6 space-y-4">
        <h2 className="font-display text-[18px] text-[var(--color-mm-ink)]">
          Timeline
        </h2>
        <Row
          label="Created"
          value={format(new Date(listing.createdAt), 'd MMM yyyy, HH:mm')}
        />
        {listing.submittedAt && (
          <Row
            label="Submitted"
            value={format(new Date(listing.submittedAt), 'd MMM yyyy, HH:mm')}
          />
        )}
        {listing.approvedAt && (
          <Row
            label="Approved"
            value={format(new Date(listing.approvedAt), 'd MMM yyyy, HH:mm')}
          />
        )}
        <Row
          label="Last update"
          value={format(new Date(listing.updatedAt), 'd MMM yyyy, HH:mm')}
        />
      </Card>

      {(canSubmit || canWithdraw) && (
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          {canWithdraw && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" disabled={withdraw.isPending}>
                  <Archive className="h-4 w-4" />
                  Withdraw listing
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Withdraw this listing?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Withdrawn listings can’t be reactivated. You’ll need to
                    create a new listing if you change your mind. Listings with
                    in-flight transfer requests can’t be withdrawn.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => withdraw.mutate()}
                    disabled={withdraw.isPending}
                  >
                    {withdraw.isPending ? 'Withdrawing…' : 'Withdraw'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {canSubmit && (
            <Button
              onClick={() => submit.mutate()}
              disabled={submit.isPending}
            >
              <Send className="h-4 w-4" />
              {submit.isPending ? 'Submitting…' : 'Submit for review'}
            </Button>
          )}
        </div>
      )}
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
