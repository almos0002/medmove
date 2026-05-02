import * as React from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import {
  ArrowLeft,
  Building2,
  Package,
  Truck,
  AlertTriangle,
  MapPin,
  Phone,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  getDelivery,
  markPickedUp,
  markInTransit,
  markDeliveryFailed,
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

export const Route = createFileRoute('/logistics/$deliveryId')({
  loader: ({ params }) =>
    getDelivery({ data: { deliveryId: params.deliveryId } }),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  component: LogisticsDeliveryDetailPage,
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
  request: { id: string; quantityRequested: number }
  batch: { batchNumber: string; unit: string }
  medicine: { name: string; strength: string }
  sellerOrg: { id: string; name: string; type: string }
  requesterOrg: { id: string; name: string; type: string }
  logisticsOrg: { id: string; name: string } | null
}

function LogisticsDeliveryDetailPage() {
  const router = useRouter()
  const data = Route.useLoaderData()
  const row = (data as unknown as { delivery: DetailRow }).delivery
  const d = row.delivery

  const refresh = async () => {
    await router.invalidate()
  }
  const onErr = (e: unknown) =>
    toast.error(e instanceof Error ? e.message : 'Action failed')

  const [pickedOpen, setPickedOpen] = React.useState(false)
  const [pickedNotes, setPickedNotes] = React.useState('')
  const picked = useMutation({
    mutationFn: () =>
      markPickedUp({
        data: { deliveryId: d.id, notes: pickedNotes.trim() || undefined },
      }),
    onSuccess: async () => {
      toast.success('Marked as picked up')
      setPickedOpen(false)
      setPickedNotes('')
      await refresh()
    },
    onError: onErr,
  })

  const [transitOpen, setTransitOpen] = React.useState(false)
  const [courierRef, setCourierRef] = React.useState('')
  const [transitNotes, setTransitNotes] = React.useState('')
  const transit = useMutation({
    mutationFn: () =>
      markInTransit({
        data: {
          deliveryId: d.id,
          courierReference: courierRef.trim() || undefined,
          dispatchNotes: transitNotes.trim() || undefined,
        },
      }),
    onSuccess: async () => {
      toast.success('Marked in transit')
      setTransitOpen(false)
      setCourierRef('')
      setTransitNotes('')
      await refresh()
    },
    onError: onErr,
  })

  const [failOpen, setFailOpen] = React.useState(false)
  const [failReason, setFailReason] = React.useState('')
  const [failErr, setFailErr] = React.useState<string | null>(null)
  const fail = useMutation({
    mutationFn: () =>
      markDeliveryFailed({
        data: { deliveryId: d.id, reason: failReason.trim() },
      }),
    onSuccess: async () => {
      toast.success('Delivery marked failed')
      setFailOpen(false)
      setFailReason('')
      setFailErr(null)
      await refresh()
    },
    onError: onErr,
  })

  const canMarkPicked = d.status === 'pickup_scheduled'
  const canMarkTransit = d.status === 'picked_up'
  const canFail = d.status === 'picked_up' || d.status === 'in_transit'

  const events: DeliveryEvent[] = (() => {
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
        label: 'Assigned to you',
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
        label: 'Picked up',
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
  })()

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3">
          <Link to="/logistics">
            <ArrowLeft className="h-4 w-4" />
            Back to assigned deliveries
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

      <Card className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Stat
          label="Method"
          value={
            <span className="capitalize text-[20px]">
              {d.dispatchMethod.replace(/_/g, ' ')}
            </span>
          }
        />
        <Stat
          label="Pickup window"
          value={
            d.pickupScheduledAt ? (
              <span className="text-[18px]">
                {format(new Date(d.pickupScheduledAt), 'd MMM yyyy')}
              </span>
            ) : (
              <span className="text-[18px] text-[var(--color-mm-subtle)]">
                Not scheduled
              </span>
            )
          }
          sub={
            d.pickupScheduledAt
              ? format(new Date(d.pickupScheduledAt), 'HH:mm')
              : null
          }
        />
        <Stat
          label="Reference"
          value={
            d.courierReference ? (
              <span className="text-[18px]">{d.courierReference}</span>
            ) : (
              <span className="text-[18px] text-[var(--color-mm-subtle)]">
                —
              </span>
            )
          }
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

      {d.dispatchNotes && (
        <Card className="p-6 space-y-3">
          <h2 className="font-display text-[16px] text-[var(--color-mm-ink)]">
            Notes from admin
          </h2>
          <p className="whitespace-pre-wrap text-sm text-[var(--color-mm-muted)]">
            {d.dispatchNotes}
          </p>
        </Card>
      )}

      <Card className="p-6 space-y-5">
        <h2 className="font-display text-[18px] text-[var(--color-mm-ink)]">
          Timeline
        </h2>
        <DeliveryTimeline events={events} />
      </Card>

      {(canMarkPicked || canMarkTransit || canFail) && (
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          {canFail && (
            <Dialog open={failOpen} onOpenChange={setFailOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" disabled={fail.isPending}>
                  <AlertTriangle className="h-4 w-4" />
                  Mark failed
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Mark delivery as failed?</DialogTitle>
                  <DialogDescription>
                    Use this if the pickup or transit cannot be completed.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-1.5">
                  <Label>
                    Reason{' '}
                    <span className="text-[var(--color-mm-bad)]">*</span>
                  </Label>
                  <Textarea
                    rows={3}
                    value={failReason}
                    onChange={(e) => {
                      setFailReason(e.target.value)
                      if (failErr) setFailErr(null)
                    }}
                    placeholder="What went wrong?"
                  />
                  {failErr && (
                    <p className="text-xs text-[var(--color-mm-bad)]">
                      {failErr}
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setFailOpen(false)}
                    disabled={fail.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (failReason.trim().length < 5) {
                        setFailErr('Give a short reason (min 5 chars).')
                        return
                      }
                      fail.mutate()
                    }}
                    disabled={fail.isPending}
                  >
                    {fail.isPending ? 'Saving…' : 'Mark failed'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {canMarkPicked && (
            <Dialog open={pickedOpen} onOpenChange={setPickedOpen}>
              <DialogTrigger asChild>
                <Button disabled={picked.isPending}>
                  <Package className="h-4 w-4" />
                  Mark picked up
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm pickup</DialogTitle>
                  <DialogDescription>
                    Logs that you have collected the goods from the seller.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-1.5">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    rows={3}
                    value={pickedNotes}
                    onChange={(e) => setPickedNotes(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setPickedOpen(false)}
                    disabled={picked.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => picked.mutate()}
                    disabled={picked.isPending}
                  >
                    {picked.isPending ? 'Saving…' : 'Mark picked up'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {canMarkTransit && (
            <Dialog open={transitOpen} onOpenChange={setTransitOpen}>
              <DialogTrigger asChild>
                <Button disabled={transit.isPending}>
                  <Truck className="h-4 w-4" />
                  Mark in transit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Mark as in transit</DialogTitle>
                  <DialogDescription>
                    Notifies the receiver that the package is on its way.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Courier reference (optional)</Label>
                    <Input
                      value={courierRef}
                      onChange={(e) => setCourierRef(e.target.value)}
                      placeholder="Tracking / waybill number"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      rows={3}
                      value={transitNotes}
                      onChange={(e) => setTransitNotes(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setTransitOpen(false)}
                    disabled={transit.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => transit.mutate()}
                    disabled={transit.isPending}
                  >
                    {transit.isPending ? 'Saving…' : 'Mark in transit'}
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
