import { Badge } from '@/components/ui/badge'
import { auditActionLabel, auditActionTone } from '@/lib/audit-events'

/**
 * Compact pill summarising one audit-log row's action with a tone derived
 * from the verb (approval = success, rejection = danger, etc).
 */
export function AuditEventBadge({
  action,
  className,
}: {
  action: string
  className?: string
}) {
  return (
    <Badge tone={auditActionTone(action)} className={className}>
      {auditActionLabel(action)}
    </Badge>
  )
}
