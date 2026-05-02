import * as React from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Check, X, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  adminApproveListing,
  adminRejectListing,
  getListing,
} from '@/server/functions/listings'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export const Route = createFileRoute('/admin/listings/$listingId')({
  loader: ({ params }) => getListing({ data: { id: params.listingId } }),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => <PageError error={error} reset={reset} />,
  component: AdminListingDetailPage,
})

function AdminListingDetailPage() {
  const router = useRouter()
  const { listing, batch, medicine, sellerOrg } = Route.useLoaderData()
  const status = listing.status as ListingStatus

  const [approveOpen, setApproveOpen] = React.useState(false)
  const [approveNotes, setApproveNotes] = React.useState('')

  const [rejectOpen, setRejectOpen] = React.useState(false)
  const [rejectReason, setRejectReason] = React.useState('')
  const [rejectError, setRejectError] = React.useState<string | null>(null)

  const approve = useMutation({
    mutationFn: () =>
      adminApproveListing({
        data: {
          listingId: listing.id,
          notes: approveNotes.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success('Listing approved')
      setApproveOpen(false)
      setApproveNotes('')
      router.invalidate()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Could not approve')
    },
  })

  const reject = useMutation({
    mutationFn: () =>
      adminRejectListing({
        data: { listingId: listing.id, reason: rejectReason.trim() },
      }),
    onSuccess: () => {
      toast.success('Listing rejected')
      setRejectOpen(false)
      setRejectReason('')
      setRejectError(null)
      router.invalidate()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Could not reject')
    },
  })

  const isPending = status === 'pending_admin'

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3">
          <Link to="/admin/listings">
            <ArrowLeft className="h-4 w-4" />
            Back to listings review
          </Link>
        </Button>
        <PageHeader
          title={medicine.name}
          description={
            <>
              Submitted by{' '}
              <span className="text-[var(--color-mm-ink)]">
                {sellerOrg.name}
              </span>{' '}
              · batch {batch.batchNumber}
            </>
          }
          actions={<ListingStatusBadge status={status} />}
        />
      </div>

      {!isPending && status !== 'rejected' && (
        <Card className="p-4 border-[var(--color-mm-line-strong)]">
          <p className="text-sm text-[var(--color-mm-muted)]">
            This listing is no longer in the review queue. Approve / reject
            actions are disabled.
          </p>
        </Card>
      )}

      {status === 'rejected' && listing.rejectionReason && (
        <Card className="p-4 border-[var(--color-mm-bad)]">
          <div className="flex gap-3">
            <AlertTriangle className="h-4 w-4 text-[var(--color-mm-bad)] shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-[var(--color-mm-ink)] mb-1">
                Rejected
              </div>
              <p className="whitespace-pre-wrap text-[var(--color-mm-muted)]">
                {listing.rejectionReason}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Stat
          label="Quantity listed"
          value={
            <>
              {listing.quantityListed.toLocaleString()}
              <span className="text-[var(--color-mm-subtle)] text-sm font-normal">
                {' '}
                {batch.unit}
              </span>
            </>
          }
          sub={`${listing.quantityAvailable.toLocaleString()} still available`}
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
          value={<span className="text-[20px]">{listing.pickupCity}</span>}
          sub={listing.pickupCountry}
        />
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-display text-[18px] text-[var(--color-mm-ink)]">
          Medicine
        </h2>
        <Row label="Name" value={medicine.name} />
        <Row label="Strength" value={medicine.strength} />
        <Row label="Form" value={<MedicineFormLabel form={medicine.form} />} />
        {medicine.genericName && (
          <Row label="Generic name" value={medicine.genericName} />
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-display text-[18px] text-[var(--color-mm-ink)]">
          Batch
        </h2>
        <Row label="Batch number" value={batch.batchNumber} />
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

      <Card className="p-6 space-y-4">
        <h2 className="font-display text-[18px] text-[var(--color-mm-ink)]">
          Seller organization
        </h2>
        <Row label="Name" value={sellerOrg.name} />
        <Row
          label="Type"
          value={
            <span className="capitalize">
              {sellerOrg.type.replace(/_/g, ' ')}
            </span>
          }
        />
        <Row
          label="Verification"
          value={
            <span className="capitalize">
              {sellerOrg.verificationStatus?.replace(/_/g, ' ') ?? '—'}
            </span>
          }
        />
        <div className="pt-1">
          <Button asChild variant="secondary" size="sm">
            <Link
              to="/admin/organizations/$orgId"
              params={{ orgId: sellerOrg.id }}
            >
              Open organization
            </Link>
          </Button>
        </div>
      </Card>

      {(listing.notes ||
        (Array.isArray(listing.photoUrls) && listing.photoUrls.length > 0)) && (
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-[18px] text-[var(--color-mm-ink)]">
            Listing details
          </h2>
          {listing.notes && (
            <Row
              label="Notes"
              value={
                <p className="whitespace-pre-wrap text-[var(--color-mm-muted)]">
                  {listing.notes}
                </p>
              }
            />
          )}
          {Array.isArray(listing.photoUrls) && listing.photoUrls.length > 0 && (
            <Row
              label="Photo URLs"
              value={
                <ul className="space-y-1">
                  {(listing.photoUrls as string[]).map((url) => (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-[var(--color-mm-accent)] hover:underline break-all"
                      >
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              }
            />
          )}
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
      </Card>

      {isPending && (
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" disabled={reject.isPending}>
                <X className="h-4 w-4" />
                Reject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject listing</DialogTitle>
                <DialogDescription>
                  The seller will see this reason on their listing detail page.
                  Rejection is terminal — they’ll need to create a new listing
                  to try again.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label>
                  Reason{' '}
                  <span className="text-[var(--color-mm-bad)]">*</span>
                </Label>
                <Textarea
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value)
                    if (rejectError) setRejectError(null)
                  }}
                  placeholder="e.g. Photos don't show batch number; please re-list with clearer images of the box and expiry."
                />
                {rejectError && (
                  <p className="text-xs text-[var(--color-mm-bad)]">
                    {rejectError}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setRejectOpen(false)}
                  disabled={reject.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (rejectReason.trim().length < 5) {
                      setRejectError(
                        'Give the seller at least a short reason (min 5 chars).',
                      )
                      return
                    }
                    reject.mutate()
                  }}
                  disabled={reject.isPending}
                >
                  {reject.isPending ? 'Rejecting…' : 'Reject listing'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
            <DialogTrigger asChild>
              <Button disabled={approve.isPending}>
                <Check className="h-4 w-4" />
                Approve
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Approve listing</DialogTitle>
                <DialogDescription>
                  Approving makes this listing visible to verified
                  request-enabled organizations. Optional notes are recorded in
                  the audit log only.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Textarea
                  rows={3}
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  placeholder="Internal notes for the audit log."
                />
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setApproveOpen(false)}
                  disabled={approve.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => approve.mutate()}
                  disabled={approve.isPending}
                >
                  {approve.isPending ? 'Approving…' : 'Approve listing'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
