import { CheckCircle2, Clock, AlertTriangle, XCircle, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { classifyExpiry, type ExpiryStatus } from '@/lib/expiry'

const MAP: Record<
  ExpiryStatus,
  { tone: 'success' | 'neutral' | 'warn' | 'danger'; label: string; icon: LucideIcon }
> = {
  safe: { tone: 'success', label: 'Safe', icon: CheckCircle2 },
  expiring_soon: { tone: 'warn', label: 'Expiring soon', icon: Clock },
  critical: { tone: 'warn', label: 'Critical', icon: AlertTriangle },
  expired: { tone: 'danger', label: 'Expired', icon: XCircle },
}

export function ExpiryStatusBadge({
  expiryDate,
  showDays = false,
  className,
}: {
  expiryDate: string
  showDays?: boolean
  className?: string
}) {
  const { status, daysLeft } = classifyExpiry(expiryDate)
  const m = MAP[status]
  const Icon = m.icon
  return (
    <Badge tone={m.tone} className={className}>
      <Icon className="h-3.5 w-3.5" />
      {m.label}
      {showDays && status !== 'expired' && (
        <span className="opacity-70">· {daysLeft}d</span>
      )}
    </Badge>
  )
}
