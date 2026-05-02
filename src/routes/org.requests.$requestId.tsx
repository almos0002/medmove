import * as React from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'
import { useMutation } from '@tanstack/react-query'
import {
  ArrowLeft,
  AlertTriangle,
  Ban,
  Clock,
  Building2,
  MapPin,
  CheckCircle2,
  Check,
  XCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  getTransferRequest,
  cancelTransfer,
  sellerAcceptTransfer,
  sellerDeclineTransfer,
} from '@/server/functions/transfers'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoading } from '@/components/feedback/PageLoading'
import { PageError } from '@/components/feedback/PageError'
import { ExpiryStatusBadge } from '@/components/data/ExpiryStatusBadge'
import { MedicineFormLabel } from '@/components/data/MedicineFormLabel'
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

export const Route = createFileRoute('/org/requests/$requestId')({
  loader: ({ params }) =>
    getTransferRequest({ data: { id: params.requestId } }),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  head: pageHead({ title: "Request", noindex: true }),
  component: OrgRequestDetailPage,
})

const CANCELLABLE: ReadonlyArray<TransferRequestStatus> = [
  'pending_admin',
  'pending_seller',
  'accepted',
  'awaiting_handoff',
]

function OrgRequestDetailPage() {
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
        requesterOrgId: string
      }
      listing: {
        id: string
        pickupCity: string
        pickupCountry: string
        pricePerUnitCents: number | null
        currency: string | null
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
      sellerOrg: { id: string; name: string; type: string }
      requesterOrg: { id: string; name: string; type: string }
    }
  const status = request.status
  const { session } = Route.useRouteContext() as {
    session: {
      user: { role: string } | null
      primaryOrg: { id: string } | null
    }
  }
  const isAdmin =
    session.user?.role === 'admin' || session.user?.role === 'super_admin'
  const viewerOrgId = session.primaryOrg?.id ?? null
  const viewerIsRequester =
    !!viewerOrgId && viewerOrgId === request.requesterOrgId
  const viewerIsSeller =
    !!viewerOrgId && viewerOrgId === sellerOrg.id

  const [cancelOpen, setCancelOpen] = React.useState(false)
  const [cancelReason, setCancelReason] = React.useState('')
  const [cancelError, setCancelError] = React.useState<string | null>(null)

  const cancel = useMutation({
    mutationFn: () =>
      cancelTransfer({
        data: {
          transferRequestId: request.id,
          reason: cancelReason.trim(),
        },
      }),
    onSuccess: async () => {
      toast.success('Transfer request cancelled')
      setCancelOpen(false)
      setCancelReason('')
      setCancelError(null)
      await router.invalidate()
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'Could not cancel'),
  })

  // ─── Seller-side accept / decline (only when viewer is the seller and
  //     request is awaiting them). Admins are not given seller buttons here
  //     — they have their own admin queue.
  const [acceptOpen, setAcceptOpen] = React.useState(false)
  const [acceptNotes, setAcceptNotes] = React.useState('')
  const [declineOpen, setDeclineOpen] = React.useState(false)
  const [declineReason, setDeclineReason] = React.useState('')
  const [declineError, setDeclineError] = React.useState<string | null>(null)

  const accept = useMutation({
    mutationFn: () =>
      sellerAcceptTransfer({
        data: {
          transferRequestId: request.id,
          notes: acceptNotes.trim() || undefined,
        },
      }),
    onSuccess: async () => {
      toast.success('Request accepted — coordination for handoff is next.')
      setAcceptOpen(false)
      setAcceptNotes('')
      await router.invalidate()
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'Could not accept'),
  })

  const decline = useMutation({
    mutationFn: () =>
      sellerDeclineTransfer({
        data: {
          transferRequestId: request.id,
          reason: declineReason.trim(),
        },
      }),
    onSuccess: async () => {
      toast.success('Request declined')
      setDeclineOpen(false)
      setDeclineReason('')
      setDeclineError(null)
      await router.invalidate()
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'Could not decline'),
  })

  const canCancel = viewerIsRequester && CANCELLABLE.includes(status)
  const canSellerAct =
    viewerIsSeller && !isAdmin && status === 'pending_seller'
  const totalCents =
    listing.pricePerUnitCents !== null
      ? listing.pricePerUnitCents * request.quantityRequested
      : null

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3">
          <Link
            to={
              viewerIsSeller
                ? '/org/requests/incoming'
                : '/org/requests/outgoing'
            }
          >
            <ArrowLeft className="h-4 w-4" />
            {viewerIsSeller ? 'Back to incoming requests' : 'Back to my requests'}
          </Link>
        </Button>
        <PageHeader
          title={medicine.name}
          description={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span>{medicine.strength}</span>
              <span className="text-[var(--color-mm-subtle)]">·</span>
              <MedicineFormLabel form={medicine.form} />
              <span className="text-[var(--color-mm-subtle)]">·</span>
              <span>Batch {batch.batchNumber}</span>
              {viewerIsSeller && (
                <>
                  <span className="text-[var(--color-mm-subtle)]">·</span>
                  <span className="text-[var(--color-mm-accent)] font-medium">
                    Incoming request
                  </span>
                </>
              )}
            </span>
          }
          actions={<TransferRequestStatusBadge status={status} />}
        />
      </div>

      {status === 'rejected' && request.adminReviewNotes && (
        <Banner
          tone="bad"
          title="Rejected by admin"
          body={request.adminReviewNotes}
        />
      )}
      {status === 'declined' && request.sellerReviewNotes && (
        <Banner
          tone="bad"
          title="Declined by seller"
          body={request.sellerReviewNotes}
        />
      )}
      {status === 'cancelled' && request.cancellationReason && (
        <Banner
          tone="cool"
          title="Request cancelled"
          body={request.cancellationReason}
        />
      )}
      {status === 'expired' && (
        <Banner
          tone="cool"
          title="Request expired"
          body="The request was not actioned in time and has expired automatically."
        />
      )}
      {status === 'pending_admin' && (
        <Banner
          tone="warn"
          title="Awaiting admin review"
          body="MedMove admins will verify the request and forward it to the seller."
        />
      )}
      {status === 'pending_seller' && (
        <Banner
          tone="warn"
          title={
            viewerIsSeller
              ? 'Awaiting your response'
              : 'Awaiting seller response'
          }
          body={
            viewerIsSeller
              ? 'A buyer is requesting stock from your listing. Accept to reserve the quantity, or decline with a short reason.'
              : 'The admin has approved your request. The seller will accept or decline shortly.'
          }
        />
      )}
      {status === 'accepted' && (
        <Banner
          tone="ok"
          title="Accepted"
          body={
            viewerIsSeller
              ? 'You have accepted this request. Coordination for handoff is next; an admin will arrange the delivery.'
              : 'The seller has accepted your request and reserved the quantity. Coordination for handoff is next.'
          }
        />
      )}

      <Card className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Stat
          label="Quantity"
          value={
            <>
              {request.quantityRequested.toLocaleString()}{' '}
              <span className="text-[var(--color-mm-subtle)] text-sm font-normal">
                {batch.unit}
              </span>
            </>
          }
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
          {viewerIsSeller ? 'Requester' : 'Seller'}
        </h2>
        <Row
          label="Name"
          value={viewerIsSeller ? requesterOrg.name : sellerOrg.name}
        />
        <Row
          label="Type"
          value={
            <span className="capitalize">
              {(viewerIsSeller ? requesterOrg.type : sellerOrg.type).replace(
                /_/g,
                ' ',
              )}
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

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        {!viewerIsSeller && (
          <Button asChild variant="ghost">
            <Link
              to="/org/marketplace/$listingId"
              params={{ listingId: listing.id }}
            >
              View listing
            </Link>
          </Button>
        )}
        {viewerIsSeller && (
          <Button asChild variant="ghost">
            <Link to="/org/listings">View my listings</Link>
          </Button>
        )}
        {canSellerAct && (
          <>
            <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" disabled={decline.isPending}>
                  <XCircle className="h-4 w-4" />
                  Decline
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Decline this request?</DialogTitle>
                  <DialogDescription>
                    The requester and admin will be notified. The reason you
                    give is shown to the requester.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-1.5">
                  <Label>
                    Reason{' '}
                    <span className="text-[var(--color-mm-bad)]">*</span>
                  </Label>
                  <Textarea
                    rows={3}
                    value={declineReason}
                    onChange={(e) => {
                      setDeclineReason(e.target.value)
                      if (declineError) setDeclineError(null)
                    }}
                    placeholder="e.g. Stock no longer available, batch quarantined, etc."
                  />
                  {declineError && (
                    <p className="text-xs text-[var(--color-mm-bad)]">
                      {declineError}
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setDeclineOpen(false)}
                    disabled={decline.isPending}
                  >
                    Keep open
                  </Button>
                  <Button
                    onClick={() => {
                      if (declineReason.trim().length < 1) {
                        setDeclineError('A short reason is required.')
                        return
                      }
                      decline.mutate()
                    }}
                    disabled={decline.isPending}
                  >
                    {decline.isPending ? 'Declining…' : 'Decline request'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
              <DialogTrigger asChild>
                <Button disabled={accept.isPending}>
                  <Check className="h-4 w-4" />
                  Accept request
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Accept this request?</DialogTitle>
                  <DialogDescription>
                    Accepting reserves{' '}
                    {request.quantityRequested.toLocaleString()} {batch.unit}{' '}
                    from this listing for the requester. An admin will arrange
                    the handoff next.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-1.5">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    rows={3}
                    value={acceptNotes}
                    onChange={(e) => setAcceptNotes(e.target.value)}
                    placeholder="Anything the requester or admin should know."
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setAcceptOpen(false)}
                    disabled={accept.isPending}
                  >
                    Not yet
                  </Button>
                  <Button
                    onClick={() => accept.mutate()}
                    disabled={accept.isPending}
                  >
                    {accept.isPending ? 'Accepting…' : 'Accept request'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
        {canCancel && (
          <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" disabled={cancel.isPending}>
                <Ban className="h-4 w-4" />
                Cancel request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel transfer request?</DialogTitle>
                <DialogDescription>
                  {(['accepted', 'awaiting_handoff'] as TransferRequestStatus[]).includes(
                    status,
                  )
                    ? 'Cancelling now will release the reserved quantity back to the listing.'
                    : 'The seller and admin will be notified that the request has been cancelled.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label>
                  Reason{' '}
                  <span className="text-[var(--color-mm-bad)]">*</span>
                </Label>
                <Textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value)
                    if (cancelError) setCancelError(null)
                  }}
                  placeholder="Help the seller understand why."
                />
                {cancelError && (
                  <p className="text-xs text-[var(--color-mm-bad)]">
                    {cancelError}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setCancelOpen(false)}
                  disabled={cancel.isPending}
                >
                  Keep request
                </Button>
                <Button
                  onClick={() => {
                    if (cancelReason.trim().length < 5) {
                      setCancelError('Give a short reason (min 5 chars).')
                      return
                    }
                    cancel.mutate()
                  }}
                  disabled={cancel.isPending}
                >
                  {cancel.isPending ? 'Cancelling…' : 'Cancel request'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}

function Banner({
  tone,
  title,
  body,
}: {
  tone: 'bad' | 'warn' | 'ok' | 'cool'
  title: string
  body: string
}) {
  const colorMap = {
    bad: {
      border: 'border-[var(--color-mm-bad)]',
      text: 'text-[var(--color-mm-bad)]',
      icon: AlertTriangle,
    },
    warn: {
      border: 'border-[var(--color-mm-warn)]',
      text: 'text-[var(--color-mm-warn)]',
      icon: Clock,
    },
    ok: {
      border: 'border-[var(--color-mm-ok)]',
      text: 'text-[var(--color-mm-ok)]',
      icon: CheckCircle2,
    },
    cool: {
      border: 'border-[var(--color-mm-line-strong)]',
      text: 'text-[var(--color-mm-subtle)]',
      icon: AlertTriangle,
    },
  }[tone]
  const Icon = colorMap.icon
  return (
    <Card className={`p-4 ${colorMap.border}`}>
      <div className="flex gap-3">
        <Icon className={`h-4 w-4 ${colorMap.text} shrink-0 mt-0.5`} />
        <div className="text-sm">
          <div className={`font-medium ${colorMap.text} mb-1`}>{title}</div>
          <p className="whitespace-pre-wrap text-[var(--color-mm-muted)]">
            {body}
          </p>
        </div>
      </div>
    </Card>
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
