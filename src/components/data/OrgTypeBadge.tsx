import { Badge } from '@/components/ui/badge'
import { ORG_TYPES, type OrgType } from '@/lib/permissions'

const LABEL: Record<OrgType, string> = {
  [ORG_TYPES.PHARMACY]: 'Pharmacy',
  [ORG_TYPES.CLINIC]: 'Clinic',
  [ORG_TYPES.HOSPITAL]: 'Hospital',
  [ORG_TYPES.NGO]: 'NGO',
  [ORG_TYPES.DISTRIBUTOR]: 'Distributor',
  [ORG_TYPES.LOGISTICS_PARTNER]: 'Logistics partner',
}

export function OrgTypeLabel({ type }: { type: OrgType }) {
  return <span>{LABEL[type] ?? type}</span>
}

export function OrgTypeBadge({ type }: { type: OrgType }) {
  return <Badge tone="neutral">{LABEL[type] ?? type}</Badge>
}
