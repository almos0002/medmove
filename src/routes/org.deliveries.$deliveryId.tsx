import * as React from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import {
  ArrowLeft,
  Building2,
  Check,
  AlertTriangle,
  XCircle,
  MapPin,
  Phone,
  Ban,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  getDelivery,
  confirmDelivery,
  disputeDelivery,
} from '@/server/functions/deliveries'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoading } from '@/components/feedback/PageLoading'
import { PageError } from '@/components/feedback/PageError'
import type { DeliveryStatus } from '@/components/data/DeliveryStatusBadge'
import { DeliveryStatusBadge } from '@/components/data/DeliveryStatusBadge'
import type { DeliveryEvent } from '@/components/data/DeliveryTimeline'
import {
  DeliveryTimeline,
  DELIVERY_TIMELINE_ICONS,
} from '@/components/data/DeliveryTimeline'

export const Route = createFileRoute('/org/deliveries/$deliveryId')({
  loader: ({ params }) =>
    getDelivery({ data: { deliveryId: params.deliveryId } }),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  component: OrgDeliveryDetailPage,
})

type DetailRow = {
  delivery: {
    id: string
    status: DeliveryStatus
    dispatchMethod: string
    pickupAddress: string
    dropoffAddress: string
    sellerContactName: string
    sellerContactPhone: string
    buyerContactName: string
    buyerContactPhone: string
    courierReference: string | null
    pickupScheduledAt: string | null
    pickedUpAt: string | null
    dispatchedAt: string | null
    receivedAt: string | null
    receivedQuantity: number | null
    receiptNotes: string | null
    failedAt: string | null
    failureReason: string | null
    cancelledAt: string | null
    cancellationReason: string | null
    dispatchNotes: string | null
    createdAt: string
    assignedAt: string | null
  }
  request: { id: string; quantityRequested: number; requesterOrgId: string }
  listing: { id: string; pickupCity: string; pickupCountry: string }
  batch: { id: string; batchNumber: string; expiryDate: string; unit: string }
  medicine: { id: string; name: string; strength: string }
  sellerOrg: { id: string; name: string; type: string }
  requesterOrg: { id: string; name: string; type: string }
  logisticsOrg: { id: string; name: string; type: string } | null
}

function OrgDeliveryDetailPage() {
  const router = useRouter()
  const data = Route.useLoaderData()
  const row = (data as unknown as { delivery: DetailRow }).delivery
  const d = row.delivery

  const refresh = async () => {
    await router.invalidate()
  }
  const onErr = (e: unknown) =>
    toast.error(e instanceof Error ? e.message : 'Action failed')

  // ─── Receiver: confirm ───────────────────────────────────────────────
  const expectedQty = row.request.quantityRequested
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [confirmQty, setConfirmQty] = React.useState<number>(expectedQty)
  const [confirmNotes, setConfirmNotes] = React.useState('')
  const confirmM = useMutation({
    mutationFn: () =>
      confirmDelivery({
        data: {
          deliveryId: d.id,
          receivedQuantity: confirmQty,
          receiptNotes: confirmNotes.trim() || undefined,
        },
      }),
    onSuccess: async () => {
      toast.success('Delivery confirmed')
      setConfirmOpen(false)
      setConfirmNotes('')
      await refresh()
    },
    onError: onErr,
  })

  // ─── Receiver: dispute ───────────────────────────────────────────────
  const [disputeOpen, setDisputeOpen] = React.useState(false)
  const [disputeReason, setDisputeReason] = React.useState('')
  const [disputeErr, setDisputeErr] = React.useState<string | null>(null)
  const disputeM = useMutation({
    mutationFn: () =>
      disputeDelivery({
        data: { deliveryId: d.id, reason: disputeReason.trim() },
      }),
    onSuccess: async () => {
      toast.success('Dispute raised')
      setDisputeOpen(false)
      setDisputeReason('')
      setDisputeErr(null)
      await refresh()
    },
    onError: onErr,
  })

  const canConfirm = d.status === 'in_transit'
  const canDispute = d.status === 'in_transit' || d.status === 'delivered'

  const events = buildTimeline(row)

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3">
          <Link to="/org">
            <ArrowLeft className="h-4 w-4" />
            Back to workspace
          </Link>
        </Button>
        <PageHeader
          title={row.medicine.name}
          description={
            <>
              {row.medicine.strength} ·{' '}
              {row.request.quantityRequested.toLocaleString()} {row.batch.unit}{' '}
              · batch {row.batch.batchNumber}
            </>
          }
          actions={<DeliveryStatusBadge status={d.status} />}
        />
      </div>

      {d.status === 'pending' && (
        <Banner
          tone="warn"
          title="Pickup not yet scheduled"
          body="The MedMove team is coordinating the pickup window with the seller."
        />
      )}
      {d.status === 'pickup_scheduled' && d.pickupScheduledAt && (
        <Banner
          tone="cool"
          title="Pickup scheduled"
          body={`Courier will collect on ${format(new Date(d.pickupScheduledAt), 'd MMM yyyy, HH:mm')}.`}
        />
      )}
      {d.status === 'picked_up' && (
        <Banner
          tone="cool"
          title="Goods picked up"
          body="The courier has collected the goods from the seller."
        />
      )}
      {d.status === 'in_transit' && (
        <Banner
          tone="ok"
          title="On its way"
          body="Confirm receipt as soon as the package arrives."
        />
      )}
      {d.status === 'delivered' && d.receivedAt && (
        <Banner
          tone="ok"
          title="Delivered"
          body={`Confirmed ${format(new Date(d.receivedAt), 'd MMM yyyy, HH:mm')}.`}
        />
      )}
      {d.status === 'failed' && d.failureReason && (
        <Banner tone="bad" title="Delivery failed" body={d.failureReason} />
      )}
      {d.status === 'cancelled' && d.cancellationReason && (
        <Banner
          tone="cool"
          title="Delivery cancelled"
          body={d.cancellationReason}
        />
      )}
      {d.status === 'disputed' && (
        <Banner
          tone="bad"
          title="Disputed"
          body={d.receiptNotes ?? 'A dispute has been raised on this delivery.'}
        />
      )}

      <Card className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Stat
          label="Quantity"
          value={
            <>
              {row.request.quantityRequested.toLocaleString()}{' '}
              <span className="text-[var(--color-mm-subtle)] text-sm font-normal">
                {row.batch.unit}
              </span>
            </>
          }
        />
        <Stat
          label="Method"
          value={
            <span className="capitalize text-[20px]">
              {d.dispatchMethod.replace(/_/g, ' ')}
            </span>
          }
        />
        <Stat
          label="Courier"
          value={
            row.logisticsOrg ? (
              <span className="text-[18px]">{row.logisticsOrg.name}</span>
            ) : (
              <span className="text-[18px] text-[var(--color-mm-subtle)]">
                Not assigned
              </span>
            )
          }
          sub={d.courierReference ? `Ref: ${d.courierReference}` : null}
        />
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <PartyCard
          title="Pickup (seller)"
          orgName={row.sellerOrg.name}
          orgType={row.sellerOrg.type}
          contactName={d.sellerContactName}
          contactPhone={d.sellerContactPhone}
          address={d.pickupAddress}
        />
        <PartyCard
          title="Drop-off (receiver)"
          orgName={row.requesterOrg.name}
          orgType={row.requesterOrg.type}
          contactName={d.buyerContactName}
          contactPhone={d.buyerContactPhone}
          address={d.dropoffAddress}
        />
      </div>

      <Card className="p-6 space-y-5">
        <h2 className="font-display text-[18px] text-[var(--color-mm-ink)]">
          Timeline
        </h2>
        <DeliveryTimeline events={events} />
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-display text-[18px] text-[var(--color-mm-ink)]">
          Linked records
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link
              to="/org/requests/$requestId"
              params={{ requestId: row.request.id }}
            >
              Open transfer request
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link
              to="/org/marketplace/$listingId"
              params={{ listingId: row.listing.id }}
            >
              View listing
            </Link>
          </Button>
        </div>
      </Card>

      {(canConfirm || canDispute) && (
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          {canDispute && (
            <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" disabled={disputeM.isPending}>
                  <XCircle className="h-4 w-4" />
                  Raise dispute
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Raise a dispute</DialogTitle>
                  <DialogDescription>
                    Use this if the shipment is damaged, short, or otherwise
                    not as expected. An admin will review.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-1.5">
                  <Label>
                    Reason{' '}
                    <span className="text-[var(--color-mm-bad)]">*</span>
                  </Label>
                  <Textarea
                    rows={4}
                    value={disputeReason}
                    onChange={(e) => {
                      setDisputeReason(e.target.value)
                      if (disputeErr) setDisputeErr(null)
                    }}
                    placeholder="Describe what's wrong with the shipment."
                  />
                  {disputeErr && (
                    <p className="text-xs text-[var(--color-mm-bad)]">
                      {disputeErr}
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setDisputeOpen(false)}
                    disabled={disputeM.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (disputeReason.trim().length < 5) {
                        setDisputeErr('Give a short reason (min 5 chars).')
                        return
                      }
                      disputeM.mutate()
                    }}
                    disabled={disputeM.isPending}
                  >
                    {disputeM.isPending ? 'Saving…' : 'Raise dispute'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {canConfirm && (
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogTrigger asChild>
                <Button disabled={confirmM.isPending}>
                  <Check className="h-4 w-4" />
                  Confirm delivery
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm receipt</DialogTitle>
                  <DialogDescription>
                    Confirm only when you have physical possession of the
                    goods. The quantity must match the request — if it
                    doesn’t, raise a dispute instead.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>
                      Received quantity{' '}
                      <span className="text-[var(--color-mm-bad)]">*</span>
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={confirmQty}
                      onChange={(e) =>
                        setConfirmQty(Number(e.target.value || 0))
                      }
                    />
                    <p className="text-xs text-[var(--color-mm-subtle)]">
                      Expected: {expectedQty.toLocaleString()} {row.batch.unit}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      rows={3}
                      value={confirmNotes}
                      onChange={(e) => setConfirmNotes(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setConfirmOpen(false)}
                    disabled={confirmM.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => confirmM.mutate()}
                    disabled={
                      confirmM.isPending || !confirmQty || confirmQty < 1
                    }
                  >
                    {confirmM.isPending ? 'Saving…' : 'Confirm receipt'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </div>
  )
}

function buildTimeline(row: DetailRow): DeliveryEvent[] {
  const d = row.delivery
  const I = DELIVERY_TIMELINE_ICONS
  return [
    {
      id: 'created',
      label: 'Delivery created',
      at: d.createdAt,
      icon: I.created,
      tone: 'neutral',
    },
    {
      id: 'assigned',
      label: row.logisticsOrg
        ? `Assigned to ${row.logisticsOrg.name}`
        : 'Assigned to courier',
      at: d.assignedAt,
      icon: I.assigned,
      tone: 'accent',
    },
    {
      id: 'pickup_scheduled',
      label: 'Pickup scheduled',
      at: d.pickupScheduledAt,
      icon: I.pickupScheduled,
      tone: 'accent',
    },
    {
      id: 'picked_up',
      label: 'Picked up by courier',
      at: d.pickedUpAt,
      icon: I.pickedUp,
      tone: 'accent',
    },
    {
      id: 'in_transit',
      label: 'In transit',
      at: d.dispatchedAt,
      icon: I.inTransit,
      detail: d.courierReference ? `Ref: ${d.courierReference}` : null,
      tone: 'accent',
    },
    {
      id: 'delivered',
      label: 'Delivered',
      at: d.receivedAt,
      icon: I.delivered,
      detail:
        d.receivedQuantity != null
          ? `Received ${d.receivedQuantity.toLocaleString()} ${row.batch.unit}${
              d.receiptNotes ? ` — ${d.receiptNotes}` : ''
            }`
          : d.receiptNotes,
      tone: 'good',
    },
    {
      id: 'failed',
      label: 'Failed',
      at: d.failedAt,
      icon: I.failed,
      detail: d.failureReason,
      tone: 'bad',
    },
    {
      id: 'cancelled',
      label: 'Cancelled',
      at: d.cancelledAt,
      icon: I.cancelled,
      detail: d.cancellationReason,
      tone: 'neutral',
    },
  ]
}

function PartyCard({
  title,
  orgName,
  orgType,
  contactName,
  contactPhone,
  address,
}: {
  title: string
  orgName: string
  orgType: string
  contactName: string
  contactPhone: string
  address: string
}) {
  return (
    <Card className="p-6 space-y-4">
      <h2 className="font-display text-[16px] text-[var(--color-mm-ink)] flex items-center gap-2">
        <Building2 className="h-4 w-4 text-[var(--color-mm-subtle)]" />
        {title}
      </h2>
      <div>
        <div className="text-sm font-medium text-[var(--color-mm-ink)]">
          {orgName}
        </div>
        <div className="text-xs text-[var(--color-mm-subtle)] capitalize mt-0.5">
          {orgType.replace(/_/g, ' ')}
        </div>
      </div>
      <div className="text-sm text-[var(--color-mm-muted)] space-y-2">
        <div className="flex gap-2">
          <MapPin className="h-3.5 w-3.5 text-[var(--color-mm-subtle)] shrink-0 mt-0.5" />
          <span className="whitespace-pre-wrap">{address}</span>
        </div>
        <div className="flex gap-2 items-center">
          <Phone className="h-3.5 w-3.5 text-[var(--color-mm-subtle)] shrink-0" />
          <span>
            {contactName} · {contactPhone}
          </span>
        </div>
      </div>
    </Card>
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
      icon: AlertTriangle,
    },
    ok: {
      border: 'border-[var(--color-mm-ok)]',
      text: 'text-[var(--color-mm-ok)]',
      icon: Check,
    },
    cool: {
      border: 'border-[var(--color-mm-line-strong)]',
      text: 'text-[var(--color-mm-subtle)]',
      icon: Ban,
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
