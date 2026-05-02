import { Badge } from '@/components/ui/badge'
import { Package, Search, Truck } from 'lucide-react'
import { CAPABILITIES, type Capability } from '@/lib/permissions'

const META: Record<
  Capability,
  { label: string; icon: typeof Package }
> = {
  [CAPABILITIES.CAN_LIST_MEDICINE]: { label: 'List medicine', icon: Package },
  [CAPABILITIES.CAN_REQUEST_MEDICINE]: {
    label: 'Request medicine',
    icon: Search,
  },
  [CAPABILITIES.CAN_DELIVER_MEDICINE]: {
    label: 'Deliver medicine',
    icon: Truck,
  },
}

export function CapabilityChip({
  capability,
  enabled,
}: {
  capability: Capability
  enabled: boolean
}) {
  const m = META[capability]
  const Icon = m.icon
  return (
    <Badge tone={enabled ? 'accent' : 'outline'}>
      <Icon className="h-3.5 w-3.5" />
      {m.label}
    </Badge>
  )
}

export function CapabilityChipRow({
  canListMedicine,
  canRequestMedicine,
  canDeliverMedicine,
  showDisabled = true,
}: {
  canListMedicine: boolean
  canRequestMedicine: boolean
  canDeliverMedicine: boolean
  showDisabled?: boolean
}) {
  const items: Array<{ cap: Capability; enabled: boolean }> = [
    { cap: CAPABILITIES.CAN_LIST_MEDICINE, enabled: canListMedicine },
    { cap: CAPABILITIES.CAN_REQUEST_MEDICINE, enabled: canRequestMedicine },
    { cap: CAPABILITIES.CAN_DELIVER_MEDICINE, enabled: canDeliverMedicine },
  ].filter((x) => showDisabled || x.enabled)
  if (items.length === 0) {
    return (
      <span className="text-xs text-[var(--color-mm-subtle)]">
        No capabilities enabled
      </span>
    )
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <CapabilityChip key={it.cap} capability={it.cap} enabled={it.enabled} />
      ))}
    </div>
  )
}
