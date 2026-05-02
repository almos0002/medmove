import {
  CheckCircle2,
  Clock3,
  FilePen,
  PackageX,
  XCircle,
  CalendarX,
  Archive,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export type ListingStatus =
  | 'draft'
  | 'pending_admin'
  | 'active'
  | 'rejected'
  | 'sold_out'
  | 'expired'
  | 'withdrawn'

const MAP: Record<
  ListingStatus,
  {
    tone: 'neutral' | 'warn' | 'success' | 'danger' | 'outline'
    label: string
    icon: LucideIcon
  }
> = {
  draft: { tone: 'outline', label: 'Draft', icon: FilePen },
  pending_admin: { tone: 'warn', label: 'Pending review', icon: Clock3 },
  active: { tone: 'success', label: 'Active', icon: CheckCircle2 },
  rejected: { tone: 'danger', label: 'Rejected', icon: XCircle },
  sold_out: { tone: 'neutral', label: 'Sold out', icon: PackageX },
  expired: { tone: 'danger', label: 'Expired', icon: CalendarX },
  withdrawn: { tone: 'outline', label: 'Withdrawn', icon: Archive },
}

export function ListingStatusBadge({
  status,
  className,
}: {
  status: ListingStatus
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

export const LISTING_STATUS_FILTERS: ReadonlyArray<{
  value: ListingStatus
  label: string
}> = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_admin', label: 'Pending review' },
  { value: 'active', label: 'Active' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'sold_out', label: 'Sold out' },
  { value: 'expired', label: 'Expired' },
  { value: 'withdrawn', label: 'Withdrawn' },
]

export type ListingTypeValue = 'donation' | 'sale'
export const LISTING_TYPE_FILTERS: ReadonlyArray<{
  value: ListingTypeValue
  label: string
}> = [
  { value: 'donation', label: 'Donation (free)' },
  { value: 'sale', label: 'Sale (priced)' },
]

export type ListingExpiryWindowValue =
  | 'expired'
  | 'critical'
  | 'expiring_soon'
  | 'safe'
export const LISTING_EXPIRY_WINDOW_FILTERS: ReadonlyArray<{
  value: ListingExpiryWindowValue
  label: string
}> = [
  { value: 'expired', label: 'Expired' },
  { value: 'critical', label: '≤ 30 days' },
  { value: 'expiring_soon', label: '31–90 days' },
  { value: 'safe', label: '> 90 days' },
]

/**
 * Marketplace discovery filter — only positive (non-expired) windows are
 * exposed because expired listings are always filtered out by the server.
 */
export const MARKETPLACE_EXPIRY_WINDOW_FILTERS: ReadonlyArray<{
  value: Exclude<ListingExpiryWindowValue, 'expired'>
  label: string
}> = [
  { value: 'critical', label: '1–30 days' },
  { value: 'expiring_soon', label: '31–90 days' },
  { value: 'safe', label: '91+ days' },
]

export type MarketplaceSortValue =
  | 'expiry_asc'
  | 'newest'
  | 'quantity_desc'
  | 'location'
export const MARKETPLACE_SORT_OPTIONS: ReadonlyArray<{
  value: MarketplaceSortValue
  label: string
}> = [
  { value: 'expiry_asc', label: 'Nearest expiry' },
  { value: 'newest', label: 'Newest listings' },
  { value: 'quantity_desc', label: 'Highest quantity' },
  { value: 'location', label: 'By city (A–Z)' },
]

/**
 * Marketplace listing-type chips. The server treats listings with
 * `pricePerUnitCents = NULL` as donations and any priced listing as a
 * discounted sale (since regulators may forbid full-margin resale of
 * near-expiry stock).
 */
export const MARKETPLACE_LISTING_TYPE_FILTERS: ReadonlyArray<{
  value: ListingTypeValue
  label: string
}> = [
  { value: 'donation', label: 'Donation' },
  { value: 'sale', label: 'Discounted sale' },
]

export const MARKETPLACE_QUANTITY_FILTERS: ReadonlyArray<{
  value: number
  label: string
}> = [
  { value: 10, label: '10+' },
  { value: 50, label: '50+' },
  { value: 100, label: '100+' },
  { value: 500, label: '500+' },
]
