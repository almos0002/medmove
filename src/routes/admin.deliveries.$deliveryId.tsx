import * as React from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Package,
  Truck,
  Ban,
  AlertTriangle,
  UserCheck,
  MapPin,
  Phone,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  getDelivery,
  schedulePickup,
  markPickedUp,
  markInTransit,
  markDeliveryFailed,
  cancelDelivery,
  adminAssignDeliveryLogistics,
  adminListLogisticsCandidates,
} from '@/server/functions/deliveries'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

export const Route = createFileRoute('/admin/deliveries/$deliveryId')({
  loader: ({ params }) =>
    getDelivery({ data: { deliveryId: params.deliveryId } }),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  component: AdminDeliveryDetailPage,
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
    transferRequestId: string
  }
  request: { id: string; quantityRequested: number }
  listing: { id: string; pickupCity: string; pickupCountry: string }
  batch: { id: string; batchNumber: string; expiryDate: string; unit: string }
  medicine: { id: string; name: string; strength: string }
  sellerOrg: { id: string; name: string; type: string }
  requesterOrg: { id: string; name: string; type: string }
  logisticsOrg: { id: string; name: string; type: string } | null
  logisticsUser: { id: string; email: string; name: string | null } | null
}

function AdminDeliveryDetailPage() {
  const router = useRouter()
  const data = Route.useLoaderData()
  const row = (data as unknown as { delivery: DetailRow }).delivery
  const d = row.delivery

  // ─── Mutations ─────────────────────────────────────────────────────────
  const refresh = async () => {
    await router.invalidate()
  }
  const onErr = (e: unknown) =>
    toast.error(e instanceof Error ? e.message : 'Action failed')

  const [pickupOpen, setPickupOpen] = React.useState(false)
  const [pickupAt, setPickupAt] = React.useState('')
  const [pickupNotes, setPickupNotes] = React.useState('')
  const [pickupErr, setPickupErr] = React.useState<string | null>(null)
  const schedule = useMutation({
    mutationFn: () =>
      schedulePickup({
        data: {
          deliveryId: d.id,
          pickupScheduledAt: new Date(pickupAt),
          notes: pickupNotes.trim() || undefined,
        },
      }),
    onSuccess: async () => {
      toast.success('Pickup scheduled')
      setPickupOpen(false)
      setPickupAt('')
      setPickupNotes('')
      setPickupErr(null)
      await refresh()
    },
    onError: onErr,
  })

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

  const [cancelOpen, setCancelOpen] = React.useState(false)
  const [cancelReason, setCancelReason] = React.useState('')
  const [cancelErr, setCancelErr] = React.useState<string | null>(null)
  const cancel = useMutation({
    mutationFn: () =>
      cancelDelivery({
        data: { deliveryId: d.id, reason: cancelReason.trim() },
      }),
    onSuccess: async () => {
      toast.success('Delivery cancelled')
      setCancelOpen(false)
      setCancelReason('')
      setCancelErr(null)
      await refresh()
    },
    onError: onErr,
  })

  const [assignOpen, setAssignOpen] = React.useState(false)
  const [pickedAssignment, setPickedAssignment] = React.useState<string>('')
  const [assignNotes, setAssignNotes] = React.useState('')
  const candidatesQ = useQuery({
    queryKey: ['logistics-candidates'],
    queryFn: () => adminListLogisticsCandidates({ data: {} }),
    enabled: assignOpen,
  })
  type Candidate = {
    userId: string
    userEmail: string
    userName: string | null
    orgId: string
    orgName: string
  }
  const candidates = (candidatesQ.data?.items ?? []) as Candidate[]
  const assign = useMutation({
    mutationFn: () => {
      const sel = candidates.find(
        (c) => `${c.userId}|${c.orgId}` === pickedAssignment,
      )
      if (!sel) throw new Error('Pick a logistics user')
      return adminAssignDeliveryLogistics({
        data: {
          deliveryId: d.id,
          logisticsUserId: sel.userId,
          logisticsOrgId: sel.orgId,
          notes: assignNotes.trim() || undefined,
        },
      })
    },
    onSuccess: async () => {
      toast.success('Logistics assigned')
      setAssignOpen(false)
      setPickedAssignment('')
      setAssignNotes('')
      await refresh()
    },
    onError: onErr,
  })

  // ─── Allowed actions for current state ─────────────────────────────────
  const canSchedule = d.status === 'pending'
  const canMarkPicked = d.status === 'pickup_scheduled'
  const canMarkTransit = d.status === 'picked_up'
  const canFail = d.status === 'picked_up' || d.status === 'in_transit'
  const canCancel = d.status === 'pending' || d.status === 'pickup_scheduled'
  const canAssign = d.status === 'pending' || d.status === 'pickup_scheduled'

  const events = buildTimeline(row)

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3">
          <Link to="/admin/deliveries">
            <ArrowLeft className="h-4 w-4" />
            Back to deliveries
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
          label="Created"
          value={
            <span className="text-[18px]">
              {format(new Date(d.createdAt), 'd MMM yyyy')}
            </span>
          }
          sub={format(new Date(d.createdAt), 'HH:mm')}
        />
        <Stat
          label="Assigned to"
          value={
            row.logisticsOrg ? (
              <span className="text-[18px]">{row.logisticsOrg.name}</span>
            ) : (
              <span className="text-[18px] text-[var(--color-mm-subtle)]">
                Not assigned
              </span>
            )
          }
          sub={row.logisticsUser?.email ?? null}
        />
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <PartyCard
          title="Pickup (seller)"
          orgName={row.sellerOrg.name}
          orgType={row.sellerOrg.type}
          orgId={row.sellerOrg.id}
          contactName={d.sellerContactName}
          contactPhone={d.sellerContactPhone}
          address={d.pickupAddress}
        />
        <PartyCard
          title="Drop-off (receiver)"
          orgName={row.requesterOrg.name}
          orgType={row.requesterOrg.type}
          orgId={row.requesterOrg.id}
          contactName={d.buyerContactName}
          contactPhone={d.buyerContactPhone}
          address={d.dropoffAddress}
        />
      </div>

      {(d.dispatchNotes || d.courierReference) && (
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-[18px] text-[var(--color-mm-ink)]">
            Courier
          </h2>
          {d.courierReference && (
            <Row label="Reference" value={d.courierReference} />
          )}
          {d.dispatchNotes && (
            <Row
              label="Notes"
              value={
                <p className="whitespace-pre-wrap">{d.dispatchNotes}</p>
              }
            />
          )}
        </Card>
      )}

      {d.failureReason && (
        <Card className="p-4 border-[var(--color-mm-bad)]">
          <div className="flex gap-3">
            <AlertTriangle className="h-4 w-4 text-[var(--color-mm-bad)] shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-[var(--color-mm-bad)] mb-1">
                Failure reason
              </div>
              <p className="whitespace-pre-wrap text-[var(--color-mm-muted)]">
                {d.failureReason}
              </p>
            </div>
          </div>
        </Card>
      )}
      {d.cancellationReason && (
        <Card className="p-4 border-[var(--color-mm-line-strong)]">
          <div className="flex gap-3">
            <Ban className="h-4 w-4 text-[var(--color-mm-subtle)] shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-[var(--color-mm-ink)] mb-1">
                Cancellation reason
              </div>
              <p className="whitespace-pre-wrap text-[var(--color-mm-muted)]">
                {d.cancellationReason}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 space-y-5">
        <h2 className="font-display text-[18px] text-[var(--color-mm-ink)]">
          Timeline
        </h2>
        <DeliveryTimeline events={events} />
      </Card>

      <Card className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[18px] text-[var(--color-mm-ink)]">
            Linked records
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link
              to="/admin/requests/$requestId"
              params={{ requestId: row.request.id }}
            >
              Open transfer request
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link
              to="/admin/listings/$listingId"
              params={{ listingId: row.listing.id }}
            >
              Open listing
            </Link>
          </Button>
        </div>
      </Card>

      {(canSchedule ||
        canMarkPicked ||
        canMarkTransit ||
        canFail ||
        canCancel ||
        canAssign) && (
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          {canCancel && (
            <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" disabled={cancel.isPending}>
                  <Ban className="h-4 w-4" />
                  Cancel delivery
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cancel delivery?</DialogTitle>
                  <DialogDescription>
                    Cancelling now also cancels the underlying transfer
                    request and releases the reserved quantity back to the
                    listing.
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
                      if (cancelErr) setCancelErr(null)
                    }}
                    placeholder="What changed?"
                  />
                  {cancelErr && (
                    <p className="text-xs text-[var(--color-mm-bad)]">
                      {cancelErr}
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setCancelOpen(false)}
                    disabled={cancel.isPending}
                  >
                    Keep delivery
                  </Button>
                  <Button
                    onClick={() => {
                      if (cancelReason.trim().length < 5) {
                        setCancelErr('Give a short reason (min 5 chars).')
                        return
                      }
                      cancel.mutate()
                    }}
                    disabled={cancel.isPending}
                  >
                    {cancel.isPending ? 'Cancelling…' : 'Cancel delivery'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

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
                    Use this when pickup or transit cannot be completed. The
                    transfer request stays where it is — you can cancel it
                    separately to release the reservation.
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
                    Keep open
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

          {canAssign && (
            <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" disabled={assign.isPending}>
                  <UserCheck className="h-4 w-4" />
                  {row.logisticsUser ? 'Reassign logistics' : 'Assign logistics'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign delivery to a courier</DialogTitle>
                  <DialogDescription>
                    Only verified logistics_partner / distributor orgs and
                    their logistics_staff users are listed.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>
                      Courier{' '}
                      <span className="text-[var(--color-mm-bad)]">*</span>
                    </Label>
                    <Select
                      value={pickedAssignment}
                      onValueChange={setPickedAssignment}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            candidatesQ.isLoading
                              ? 'Loading…'
                              : candidates.length === 0
                                ? 'No verified couriers found'
                                : 'Pick a logistics user'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {candidates.map((c) => (
                          <SelectItem
                            key={`${c.userId}|${c.orgId}`}
                            value={`${c.userId}|${c.orgId}`}
                          >
                            {c.orgName} — {c.userEmail}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      rows={3}
                      value={assignNotes}
                      onChange={(e) => setAssignNotes(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setAssignOpen(false)}
                    disabled={assign.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => assign.mutate()}
                    disabled={assign.isPending || !pickedAssignment}
                  >
                    {assign.isPending ? 'Assigning…' : 'Assign'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {canSchedule && (
            <Dialog open={pickupOpen} onOpenChange={setPickupOpen}>
              <DialogTrigger asChild>
                <Button disabled={schedule.isPending}>
                  <CalendarClock className="h-4 w-4" />
                  Schedule pickup
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule pickup window</DialogTitle>
                  <DialogDescription>
                    Confirm the time the courier will collect the goods from
                    the seller. The seller and receiver can both see the
                    window on their delivery pages.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>
                      Pickup time{' '}
                      <span className="text-[var(--color-mm-bad)]">*</span>
                    </Label>
                    <Input
                      type="datetime-local"
                      value={pickupAt}
                      onChange={(e) => {
                        setPickupAt(e.target.value)
                        if (pickupErr) setPickupErr(null)
                      }}
                    />
                    {pickupErr && (
                      <p className="text-xs text-[var(--color-mm-bad)]">
                        {pickupErr}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      rows={3}
                      value={pickupNotes}
                      onChange={(e) => setPickupNotes(e.target.value)}
                      placeholder="Anything the courier or seller should know."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setPickupOpen(false)}
                    disabled={schedule.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (!pickupAt) {
                        setPickupErr('Pick a date & time.')
                        return
                      }
                      schedule.mutate()
                    }}
                    disabled={schedule.isPending}
                  >
                    {schedule.isPending ? 'Scheduling…' : 'Schedule pickup'}
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
                    Logs that the courier has collected the goods from the
                    seller.
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
                    Moves the underlying transfer request to “dispatched” and
                    notifies the receiver to expect arrival.
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
      detail: row.logisticsUser?.email ?? null,
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
  orgId,
  contactName,
  contactPhone,
  address,
}: {
  title: string
  orgName: string
  orgType: string
  orgId: string
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
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/admin/organizations/$orgId" params={{ orgId }}>
            Open organization
          </Link>
        </Button>
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
