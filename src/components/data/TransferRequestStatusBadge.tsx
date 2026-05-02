import {
  Clock3,
  ShieldCheck,
  CheckCircle2,
  Truck,
  PackageCheck,
  XCircle,
  Ban,
  CalendarX,
  PackageSearch,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export type TransferRequestStatus =
  | 'pending_admin'
  | 'rejected'
  | 'pending_seller'
  | 'declined'
  | 'accepted'
  | 'awaiting_handoff'
  | 'dispatched'
  | 'completed'
  | 'expired'
  | 'cancelled'

const MAP: Record<
  TransferRequestStatus,
  {
    tone: 'neutral' | 'warn' | 'success' | 'danger' | 'outline' | 'accent'
    label: string
    icon: LucideIcon
  }
> = {
  pending_admin: { tone: 'warn', label: 'Pending admin review', icon: Clock3 },
  rejected: { tone: 'danger', label: 'Rejected by admin', icon: XCircle },
  pending_seller: {
    tone: 'warn',
    label: 'Pending seller',
    icon: ShieldCheck,
  },
  declined: { tone: 'danger', label: 'Declined by seller', icon: XCircle },
  accepted: { tone: 'success', label: 'Accepted', icon: CheckCircle2 },
  awaiting_handoff: {
    tone: 'accent',
    label: 'Awaiting handoff',
    icon: PackageSearch,
  },
  dispatched: { tone: 'accent', label: 'Dispatched', icon: Truck },
  completed: { tone: 'success', label: 'Completed', icon: PackageCheck },
  expired: { tone: 'outline', label: 'Expired', icon: CalendarX },
  cancelled: { tone: 'outline', label: 'Cancelled', icon: Ban },
}

export function TransferRequestStatusBadge({
  status,
  className,
}: {
  status: TransferRequestStatus
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

export const TRANSFER_REQUEST_STATUS_FILTERS: ReadonlyArray<{
  value: TransferRequestStatus
  label: string
}> = [
  { value: 'pending_admin', label: 'Pending admin review' },
  { value: 'pending_seller', label: 'Pending seller' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'awaiting_handoff', label: 'Awaiting handoff' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'declined', label: 'Declined' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
]
