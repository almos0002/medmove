import { Link } from '@tanstack/react-router'
import { Tags, MapPin, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { Card } from '@/components/ui/card'
import { ExpiryStatusBadge } from '@/components/data/ExpiryStatusBadge'
import { MedicineFormLabel } from '@/components/data/MedicineFormLabel'

export type MarketplaceListingRow = {
  listing: {
    id: string
    quantityAvailable: number
    quantityListed: number
    pricePerUnitCents: number | null
    currency: string | null
    pickupCity: string
    pickupCountry: string
    photoUrls: string[] | null
  }
  batch: {
    id: string
    batchNumber: string
    expiryDate: string
    unit: string
  }
  medicine: {
    id: string
    name: string
    strength: string
    genericName: string | null
    form: string
    manufacturer: string | null
  }
  sellerOrg: { id: string; name: string; type: string }
}

export function ListingCard({
  row,
  eligible,
}: {
  row: MarketplaceListingRow
  eligible: boolean
}) {
  const { listing, batch, medicine, sellerOrg } = row
  const photo = Array.isArray(listing.photoUrls)
    ? listing.photoUrls[0]
    : undefined
  return (
    <Link
      to="/org/marketplace/$listingId"
      params={{ listingId: listing.id }}
      className="block"
    >
      <Card className="photo-card overflow-hidden h-full flex flex-col">
        {photo ? (
          <div className="aspect-[4/3] bg-[var(--color-mm-canvas)] overflow-hidden border-b border-[var(--color-mm-line)]">
            <img src={photo} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-[4/3] bg-[var(--color-mm-canvas)] border-b border-[var(--color-mm-line)] flex items-center justify-center">
            <Tags className="h-7 w-7 text-[var(--color-mm-subtle)]" />
          </div>
        )}
        <div className="p-5 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold text-[var(--color-mm-ink)] leading-tight truncate">
                {medicine.name}
              </h3>
              <div className="text-xs text-[var(--color-mm-subtle)] mt-0.5 truncate">
                {medicine.strength} ·{' '}
                <MedicineFormLabel form={medicine.form} />
                {medicine.genericName ? ` · ${medicine.genericName}` : ''}
              </div>
            </div>
            <PriceTag
              cents={listing.pricePerUnitCents}
              currency={listing.currency ?? 'USD'}
              unit={batch.unit}
            />
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--color-mm-subtle)]">
            <MapPin className="h-3.5 w-3.5" />
            {listing.pickupCity}, {listing.pickupCountry}
          </div>
          <div className="mt-2 text-xs text-[var(--color-mm-muted)] truncate">
            {sellerOrg.name} ·{' '}
            <span className="capitalize">
              {sellerOrg.type.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-sm text-[var(--color-mm-ink)]">
              {listing.quantityAvailable.toLocaleString()}{' '}
              <span className="text-[var(--color-mm-subtle)] text-xs font-normal">
                {batch.unit} available
              </span>
            </div>
            <ExpiryStatusBadge expiryDate={batch.expiryDate} showDays />
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--color-mm-line)] flex items-center justify-between">
            <span className="text-xs text-[var(--color-mm-subtle)]">
              Expires {format(new Date(batch.expiryDate), 'd MMM yyyy')}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-mm-accent)]">
              {eligible ? 'Open' : 'View'}
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </Card>
    </Link>
  )
}

export function PriceTag({
  cents,
  currency,
  unit,
}: {
  cents: number | null
  currency: string
  unit: string
}) {
  if (cents === null) {
    return (
      <span className="text-xs font-semibold text-[var(--color-mm-ok)] bg-white border border-[var(--color-mm-ok)] squircle px-2 py-1 whitespace-nowrap">
        Free
      </span>
    )
  }
  return (
    <span className="text-sm font-semibold text-[var(--color-mm-ink)] whitespace-nowrap">
      {(cents / 100).toFixed(2)}{' '}
      <span className="text-[11px] text-[var(--color-mm-subtle)] font-normal">
        {currency}/{unit}
      </span>
    </span>
  )
}
