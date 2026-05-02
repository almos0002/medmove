import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  Clock,
  PauseCircle,
  XCircle,
  type LucideIcon,
} from 'lucide-react'

export type OrgVerificationStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'suspended'

const MAP: Record<
  OrgVerificationStatus,
  {
    tone: 'warn' | 'success' | 'danger' | 'neutral'
    label: string
    icon: LucideIcon
  }
> = {
  pending: { tone: 'warn', label: 'Pending review', icon: Clock },
  verified: { tone: 'success', label: 'Verified', icon: CheckCircle2 },
  rejected: { tone: 'danger', label: 'Rejected', icon: XCircle },
  suspended: { tone: 'neutral', label: 'Suspended', icon: PauseCircle },
}

export function VerificationStatusBadge({
  status,
  className,
}: {
  status: OrgVerificationStatus
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

export type DocStatus = 'pending' | 'approved' | 'rejected'

const DOC_MAP: Record<
  DocStatus,
  { tone: 'warn' | 'success' | 'danger'; label: string; icon: LucideIcon }
> = {
  pending: { tone: 'warn', label: 'Pending review', icon: Clock },
  approved: { tone: 'success', label: 'Approved', icon: CheckCircle2 },
  rejected: { tone: 'danger', label: 'Rejected', icon: XCircle },
}

export function DocStatusBadge({ status }: { status: DocStatus }) {
  const m = DOC_MAP[status]
  const Icon = m.icon
  return (
    <Badge tone={m.tone}>
      <Icon className="h-3.5 w-3.5" />
      {m.label}
    </Badge>
  )
}
