import {
  createFileRoute,
  Link,
  useNavigate,
  redirect,
} from '@tanstack/react-router'
import {
  Search,
  X,
  ShoppingBag,
  Tags,
  MapPin,
  ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'
import { z } from 'zod'
import { listMarketplaceListings } from '@/server/functions/listings'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoading } from '@/components/feedback/PageLoading'
import { PageError } from '@/components/feedback/PageError'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ExpiryStatusBadge } from '@/components/data/ExpiryStatusBadge'
import { LISTING_EXPIRY_WINDOW_FILTERS } from '@/components/data/ListingStatusBadge'

const FILTERS_ALL = '__all__'

const searchSchema = z.object({
  q: z
    .string()
    .trim()
    .max(120)
    .transform((v) => (v.length === 0 ? undefined : v))
    .optional(),
  city: z
    .string()
    .trim()
    .max(120)
    .transform((v) => (v.length === 0 ? undefined : v))
    .optional(),
  expiry: z.enum(['expired', 'critical', 'expiring_soon', 'safe']).optional(),
})

type SearchValues = z.infer<typeof searchSchema>

export const Route = createFileRoute('/org/marketplace')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  beforeLoad: async ({ context }) => {
    const session = (
      context as {
        session?: { primaryOrg?: { id: string } | null }
      }
    ).session
    if (!session?.primaryOrg) {
      throw redirect({ to: '/org' })
    }
    return { primaryOrgId: session.primaryOrg.id }
  },
  loader: ({ deps }) =>
    listMarketplaceListings({
      data: {
        medicineSearch: deps.q,
        city: deps.city,
        expiryWindow: deps.expiry,
      },
    }),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  component: MarketplacePage,
})

type Row = {
  listing: {
    id: string
    quantityAvailable: number
    pricePerUnitCents: number | null
    currency: string | null
    pickupCity: string
    pickupCountry: string
    photoUrls: string[] | null
    notes: string | null
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
  }
  sellerOrg: { id: string; name: string; type: string }
}

function MarketplacePage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const data = Route.useLoaderData()
  const { session } = Route.useRouteContext() as {
    session: {
      primaryOrg: {
        canRequestMedicine: boolean
        verificationStatus: string
      } | null
    }
  }
  const canRequest = !!session.primaryOrg?.canRequestMedicine
  const isVerified = session.primaryOrg?.verificationStatus === 'verified'
  const eligible = canRequest && isVerified

  const items = (data.items ?? []) as unknown as Row[]
  const hasFilters = !!(search.q || search.city || search.expiry)

  function setSearchKey<K extends keyof SearchValues>(
    key: K,
    value: SearchValues[K],
  ) {
    navigate({
      search: (s) => ({ ...s, [key]: value || undefined }),
      replace: true,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace"
        description={`${items.length} ${
          items.length === 1 ? 'listing' : 'listings'
        } available right now from verified sellers.`}
      />

      {!isVerified && (
        <Card className="p-4 border-[var(--color-mm-warn)]">
          <p className="text-sm text-[var(--color-mm-muted)]">
            Your organization is not yet verified. You can browse the
            marketplace, but requests are blocked until verification is
            approved.
          </p>
        </Card>
      )}
      {isVerified && !canRequest && (
        <Card className="p-4 border-[var(--color-mm-line-strong)]">
          <p className="text-sm text-[var(--color-mm-muted)]">
            Requesting medicine isn’t enabled for this organization type.
            Contact an admin if you believe this is in error.
          </p>
        </Card>
      )}

      <FilterBar
        search={search}
        hasFilters={hasFilters}
        onChange={setSearchKey}
        onClear={() => navigate({ search: {}, replace: true })}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={hasFilters ? 'No matches' : 'No active listings yet'}
          description={
            hasFilters
              ? 'Try widening your filters above to see more options.'
              : 'Check back soon — new sealed, in-date stock is added regularly.'
          }
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={() => navigate({ search: {}, replace: true })}
              >
                Clear filters
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((row) => (
            <ListingCard key={row.listing.id} row={row} eligible={eligible} />
          ))}
        </div>
      )}
    </div>
  )
}

function ListingCard({ row, eligible }: { row: Row; eligible: boolean }) {
  const { listing, batch, medicine, sellerOrg } = row
  const photo = Array.isArray(listing.photoUrls) ? listing.photoUrls[0] : undefined
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
                {medicine.strength}
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

function PriceTag({
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

function FilterBar({
  search,
  hasFilters,
  onChange,
  onClear,
}: {
  search: SearchValues
  hasFilters: boolean
  onChange: <K extends keyof SearchValues>(k: K, v: SearchValues[K]) => void
  onClear: () => void
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[2fr_1.2fr_1.2fr_auto] gap-3 items-start">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-mm-subtle)]" />
        <Input
          placeholder="Search medicine…"
          defaultValue={search.q ?? ''}
          onChange={(e) =>
            onChange('q', e.target.value || (undefined as unknown as string))
          }
          className="pl-9"
        />
      </div>
      <Input
        placeholder="Pickup city…"
        defaultValue={search.city ?? ''}
        onChange={(e) =>
          onChange('city', e.target.value || (undefined as unknown as string))
        }
      />
      <Select
        value={search.expiry ?? FILTERS_ALL}
        onValueChange={(v) =>
          onChange(
            'expiry',
            v === FILTERS_ALL
              ? undefined
              : (v as SearchValues['expiry']),
          )
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Expiry" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FILTERS_ALL}>Any expiry window</SelectItem>
          {LISTING_EXPIRY_WINDOW_FILTERS.map((w) => (
            <SelectItem key={w.value} value={w.value}>
              {w.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        disabled={!hasFilters}
        className="self-center"
      >
        <X className="h-4 w-4" />
        Clear
      </Button>
    </div>
  )
}
