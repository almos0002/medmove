import * as React from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import {
  ArrowLeft,
  AlertTriangle,
  Check,
  X,
  Clock,
  Building2,
  MapPin,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  getTransferRequest,
  adminApproveTransfer,
  adminRejectTransfer,
} from '@/server/functions/transfers'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoading } from '@/components/feedback/PageLoading'
import { PageError } from '@/components/feedback/PageError'
import { ExpiryStatusBadge } from '@/components/data/ExpiryStatusBadge'
import {
  TransferRequestStatusBadge,
  type TransferRequestStatus,
} from '@/components/data/TransferRequestStatusBadge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export const Route = createFileRoute('/admin/requests/$requestId')({
  loader: ({ params }) =>
    getTransferRequest({ data: { id: params.requestId } }),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  component: AdminRequestDetailPage,
})

function AdminRequestDetailPage() {
  const router = useRouter()
  const data = Route.useLoaderData()
  const { request, listing, batch, medicine, sellerOrg, requesterOrg } =
    data as unknown as {
      request: {
        id: string
        status: TransferRequestStatus
        quantityRequested: number
        intendedUse: string
        createdAt: string
        updatedAt: string
        expiresAt: string
        adminReviewedAt: string | null
        adminReviewNotes: string | null
        sellerReviewedAt: string | null
        sellerReviewNotes: string | null
        cancellationReason: string | null
      }
      listing: {
        id: string
        pickupCity: string
        pickupCountry: string
        quantityAvailable: number
        quantityListed: number
        pricePerUnitCents: number | null
        currency: string | null
        status: string
      }
      batch: {
        id: string
        batchNumber: string
        expiryDate: string
        unit: string
      }
      medicine: {
        id: string
        name: string
        strength: string
        genericName: string | null
        form: string
      }
      sellerOrg: {
        id: string
        name: string
        type: string
        verificationStatus: string
      }
      requesterOrg: {
        id: string
        name: string
        type: string
        verificationStatus: string
      }
    }
  const status = request.status

  const [approveOpen, setApproveOpen] = React.useState(false)
  const [approveNotes, setApproveNotes] = React.useState('')

  const [rejectOpen, setRejectOpen] = React.useState(false)
  const [rejectReason, setRejectReason] = React.useState('')
  const [rejectError, setRejectError] = React.useState<string | null>(null)

  const approve = useMutation({
    mutationFn: () =>
      adminApproveTransfer({
        data: {
          transferRequestId: request.id,
          notes: approveNotes.trim() || undefined,
        },
      }),
    onSuccess: async () => {
      toast.success('Forwarded to seller')
      setApproveOpen(false)
      setApproveNotes('')
      await router.invalidate()
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'Could not approve'),
  })

  const reject = useMutation({
    mutationFn: () =>
      adminRejectTransfer({
        data: {
          transferRequestId: request.id,
          reason: rejectReason.trim(),
        },
      }),
    onSuccess: async () => {
      toast.success('Request rejected')
      setRejectOpen(false)
      setRejectReason('')
      setRejectError(null)
      await router.invalidate()
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'Could not reject'),
  })

  const isPending = status === 'pending_admin'
  const totalCents =
    listing.pricePerUnitCents !== null
      ? listing.pricePerUnitCents * request.quantityRequested
      : null

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3">
          <Link to="/admin/requests">
            <ArrowLeft className="h-4 w-4" />
            Back to transfer requests
          </Link>
        </Button>
        <PageHeader
          title={medicine.name}
          description={
            <>
              From{' '}
              <span className="text-[var(--color-mm-ink)]">
                {requesterOrg.name}
              </span>{' '}
              · seller{' '}
              <span className="text-[var(--color-mm-ink)]">
                {sellerOrg.name}
              </span>
            </>
          }
          actions={<TransferRequestStatusBadge status={status} />}
        />
      </div>

      {!isPending && status !== 'rejected' && (
        <Card className="p-4 border-[var(--color-mm-line-strong)]">
          <p className="text-sm text-[var(--color-mm-muted)]">
            This request is no longer in the admin queue. Approve / reject
            actions are disabled.
          </p>
        </Card>
      )}

      {status === 'rejected' && request.adminReviewNotes && (
        <Card className="p-4 border-[var(--color-mm-bad)]">
          <div className="flex gap-3">
            <AlertTriangle className="h-4 w-4 text-[var(--color-mm-bad)] shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-[var(--color-mm-ink)] mb-1">
                Rejected
              </div>
              <p className="whitespace-pre-wrap text-[var(--color-mm-muted)]">
                {request.adminReviewNotes}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Stat
          label="Quantity requested"
          value={
            <>
              {request.quantityRequested.toLocaleString()}{' '}
              <span className="text-[var(--color-mm-subtle)] text-sm font-normal">
                {batch.unit}
              </span>
            </>
          }
          sub={`${listing.quantityAvailable.toLocaleString()} of ${listing.quantityListed.toLocaleString()} still available on listing`}
        />
        <Stat
          label="Estimated total"
          value={
            totalCents === null ? (
              <span className="text-[var(--color-mm-ok)]">Free</span>
            ) : (
              <>
                {(totalCents / 100).toFixed(2)}{' '}
                <span className="text-[var(--color-mm-subtle)] text-sm font-normal">
                  {listing.currency ?? 'USD'}
                </span>
              </>
            )
          }
          sub={
            listing.pricePerUnitCents === null
              ? 'Donation listing'
              : `${(listing.pricePerUnitCents / 100).toFixed(2)} ${listing.currency ?? 'USD'} / ${batch.unit}`
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
          Intended use
        </h2>
        <p className="whitespace-pre-wrap text-sm text-[var(--color-mm-muted)]">
          {request.intendedUse}
        </p>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-display text-[18px] text-[var(--color-mm-ink)] flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[var(--color-mm-subtle)]" />
          Requester
        </h2>
        <Row label="Name" value={requesterOrg.name} />
        <Row
          label="Type"
          value={
            <span className="capitalize">
              {requesterOrg.type.replace(/_/g, ' ')}
            </span>
          }
        />
        <Row
          label="Verification"
          value={
            <span className="capitalize">
              {requesterOrg.verificationStatus.replace(/_/g, ' ')}
            </span>
          }
        />
        <div className="pt-1">
          <Button asChild variant="secondary" size="sm">
            <Link
              to="/admin/organizations/$orgId"
              params={{ orgId: requesterOrg.id }}
            >
              Open organization
            </Link>
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-display text-[18px] text-[var(--color-mm-ink)] flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[var(--color-mm-subtle)]" />
          Seller
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
              {sellerOrg.verificationStatus.replace(/_/g, ' ')}
            </span>
          }
        />
        <Row
          label="Pickup"
          value={
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[var(--color-mm-subtle)]" />
              {listing.pickupCity}, {listing.pickupCountry}
            </span>
          }
        />
        <div className="pt-1 flex gap-2 flex-wrap">
          <Button asChild variant="secondary" size="sm">
            <Link
              to="/admin/organizations/$orgId"
              params={{ orgId: sellerOrg.id }}
            >
              Open organization
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link
              to="/admin/listings/$listingId"
              params={{ listingId: listing.id }}
            >
              Open listing
            </Link>
          </Button>
        </div>
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
              <span>{format(new Date(batch.expiryDate), 'd MMM yyyy')}</span>
              <ExpiryStatusBadge expiryDate={batch.expiryDate} showDays />
            </div>
          }
        />
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-display text-[18px] text-[var(--color-mm-ink)]">
          Timeline
        </h2>
        <Row
          label="Submitted"
          value={format(new Date(request.createdAt), 'd MMM yyyy, HH:mm')}
        />
        {request.adminReviewedAt && (
          <Row
            label={status === 'rejected' ? 'Admin rejected' : 'Admin approved'}
            value={format(
              new Date(request.adminReviewedAt),
              'd MMM yyyy, HH:mm',
            )}
          />
        )}
        {request.sellerReviewedAt && (
          <Row
            label={
              status === 'declined' ? 'Seller declined' : 'Seller accepted'
            }
            value={format(
              new Date(request.sellerReviewedAt),
              'd MMM yyyy, HH:mm',
            )}
          />
        )}
        <Row
          label="Expires"
          value={
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[var(--color-mm-subtle)]" />
              {format(new Date(request.expiresAt), 'd MMM yyyy, HH:mm')}
            </span>
          }
        />
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
                <DialogTitle>Reject transfer request</DialogTitle>
                <DialogDescription>
                  The requester will see this reason on their request page.
                  Rejection is terminal — they’ll need to submit a new request
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
                  placeholder="e.g. Requester org type isn't appropriate for this medicine class."
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
                        'Give the requester at least a short reason (min 5 chars).',
                      )
                      return
                    }
                    reject.mutate()
                  }}
                  disabled={reject.isPending}
                >
                  {reject.isPending ? 'Rejecting…' : 'Reject request'}
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
                <DialogTitle>Approve and forward to seller</DialogTitle>
                <DialogDescription>
                  Approving moves this request to “pending seller”. The seller
                  can then accept (which reserves the quantity on the listing)
                  or decline.
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
                  {approve.isPending ? 'Approving…' : 'Approve & forward'}
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
