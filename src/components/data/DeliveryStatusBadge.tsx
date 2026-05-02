import type { LucideIcon } from 'lucide-react'
import {
  Clock3,
  CalendarClock,
  Package,
  Truck,
  PackageCheck,
  XCircle,
  Ban,
  AlertTriangle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export type DeliveryStatus =
  | 'pending'
  | 'pickup_scheduled'
  | 'picked_up'
  | 'scheduled'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'cancelled'
  | 'disputed'

const MAP: Record<
  DeliveryStatus,
  {
    tone: 'neutral' | 'warn' | 'success' | 'danger' | 'outline' | 'accent'
    label: string
    icon: LucideIcon
  }
> = {
  pending: { tone: 'warn', label: 'Pending pickup', icon: Clock3 },
  pickup_scheduled: {
    tone: 'accent',
    label: 'Pickup scheduled',
    icon: CalendarClock,
  },
  picked_up: { tone: 'accent', label: 'Picked up', icon: Package },
  scheduled: { tone: 'accent', label: 'Scheduled', icon: CalendarClock },
  in_transit: { tone: 'accent', label: 'In transit', icon: Truck },
  delivered: { tone: 'success', label: 'Delivered', icon: PackageCheck },
  failed: { tone: 'danger', label: 'Failed', icon: AlertTriangle },
  cancelled: { tone: 'outline', label: 'Cancelled', icon: Ban },
  disputed: { tone: 'danger', label: 'Disputed', icon: XCircle },
}

export function DeliveryStatusBadge({
  status,
  className,
}: {
  status: DeliveryStatus
  className?: string
}) {
  const m = MAP[status]
  const Icon = m.icon
  return (
    <Badge tone={m.tone} className={className}>
      <Icon className="h-3.5 w-3.5" />
      {m.label}
    </Badge>
  )
}

export const DELIVERY_STATUS_FILTERS: ReadonlyArray<{
  value: DeliveryStatus
  label: string
}> = [
  { value: 'pending', label: 'Pending pickup' },
  { value: 'pickup_scheduled', label: 'Pickup scheduled' },
  { value: 'picked_up', label: 'Picked up' },
  { value: 'in_transit', label: 'In transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'disputed', label: 'Disputed' },
]

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> =
  Object.fromEntries(
    (Object.keys(MAP) as DeliveryStatus[]).map((k) => [k, MAP[k].label]),
  ) as Record<DeliveryStatus, string>
