import { Badge } from '@/components/ui/badge'

const STORAGE_LABEL: Record<string, string> = {
  room_temperature: 'Room temperature',
  cool_dry_place: 'Cool, dry place',
  refrigerated: 'Refrigerated',
}

export function StorageTypeBadge({ type }: { type: string }) {
  return <Badge tone="outline">{STORAGE_LABEL[type] ?? type}</Badge>
}

export const STORAGE_TYPES = Object.entries(STORAGE_LABEL).map(([value, label]) => ({
  value,
  label,
}))
