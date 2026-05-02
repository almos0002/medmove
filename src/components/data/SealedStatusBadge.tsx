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

const STORAGE_LABEL: Record<string, string> = {
  room_temperature: 'Room temperature',
  cool_dry_place: 'Cool, dry place',
  refrigerated: 'Refrigerated',
}

export function StorageTypeBadge({ type }: { type: string }) {
  return <Badge tone="outline">{STORAGE_LABEL[type] ?? type}</Badge>
}

const FORM_LABEL: Record<string, string> = {
  tablet: 'Tablet',
  capsule: 'Capsule',
  syrup: 'Syrup',
  suspension: 'Suspension',
  injection: 'Injection',
  cream: 'Cream',
  ointment: 'Ointment',
  drops: 'Drops',
  inhaler: 'Inhaler',
  patch: 'Patch',
  powder: 'Powder',
  sachet: 'Sachet',
  other: 'Other',
}

export function MedicineFormLabel({ form }: { form: string }) {
  return <span>{FORM_LABEL[form] ?? form}</span>
}

export const MEDICINE_FORMS = Object.entries(FORM_LABEL).map(([value, label]) => ({
  value,
  label,
}))

export const STORAGE_TYPES = Object.entries(STORAGE_LABEL).map(([value, label]) => ({
  value,
  label,
}))
