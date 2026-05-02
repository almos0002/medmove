import { Lock, Unlock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function SealedStatusBadge({
  sealed,
}: {
  sealed: 'sealed' | 'opened'
}) {
  if (sealed === 'sealed') {
    return (
      <Badge tone="success">
        <Lock className="h-3.5 w-3.5" />
        Sealed
      </Badge>
    )
  }
  return (
    <Badge tone="danger">
      <Unlock className="h-3.5 w-3.5" />
      Opened
    </Badge>
  )
}
