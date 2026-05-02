import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Rows3,
} from 'lucide-react'
import { format } from 'date-fns'
import { z } from 'zod'
import { listMarketplaceListings } from '@/server/functions/listings'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoading } from '@/components/feedback/PageLoading'
import { PageError } from '@/components/feedback/PageError'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ExpiryStatusBadge } from '@/components/data/ExpiryStatusBadge'
import { MedicineFormLabel } from '@/components/data/MedicineFormLabel'
import { cn } from '@/lib/utils'
import {
  ListingCard,
  PriceTag,
  type MarketplaceListingRow,
} from '@/components/marketplace/ListingCard'
import {
  MarketplaceFilters,
  type MarketplaceFiltersValue,
} from '@/components/marketplace/MarketplaceFilters'

const PAGE_SIZE = 24

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
  form: z
    .enum([
      'tablet',
      'capsule',
      'syrup',
      'suspension',
      'injection',
      'cream',
      'ointment',
      'drops',
      'inhaler',
      'patch',
      'powder',
      'sachet',
      'other',
    ])
    .optional(),
  type: z.enum(['donation', 'sale']).optional(),
  expiry: z.enum(['critical', 'expiring_soon', 'safe']).optional(),
  minQty: z.coerce.number().int().positive().max(1_000_000).optional(),
  sort: z
    .enum(['expiry_asc', 'newest', 'quantity_desc', 'location'])
    .optional(),
  view: z.enum(['cards', 'table']).optional(),
  page: z.coerce.number().int().positive().optional(),
})

type SearchValues = z.infer<typeof searchSchema>

export const Route = createFileRoute('/org/marketplace/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  // Auth + admin/non-admin handling is done by the parent /org route
  // (`src/routes/org.tsx`). The server fn additionally enforces verification
  // and `can_request_medicine`, so we don't need a redirect here — admins
  // without a primary org would otherwise be locked out by mistake.
  loader: ({ deps }) =>
    listMarketplaceListings({
      data: {
        medicineSearch: deps.q,
        city: deps.city,
        medicineForm: deps.form,
        listingType: deps.type,
        expiryWindow: deps.expiry,
        minQuantity: deps.minQty,
        sort: deps.sort ?? 'expiry_asc',
        page: deps.page ?? 1,
        pageSize: PAGE_SIZE,
      },
    }),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  head: pageHead({ title: "Marketplace", noindex: true }),
  component: MarketplacePage,
})

function MarketplacePage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const data = Route.useLoaderData() as {
    items: MarketplaceListingRow[]
    total: number
    page: number
    pageSize: number
    pageCount: number
  }
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

  const items = data.items ?? []
  const view: 'cards' | 'table' = search.view ?? 'cards'

  const filterValue: MarketplaceFiltersValue = {
    q: search.q,
    city: search.city,
    form: search.form,
    type: search.type,
    expiry: search.expiry,
    minQty: search.minQty,
    sort: search.sort ?? 'expiry_asc',
  }
  const hasFilters = !!(
    search.q ||
    search.city ||
    search.form ||
    search.type ||
    search.expiry ||
    search.minQty ||
    (search.sort && search.sort !== 'expiry_asc')
  )

  function setKey<K extends keyof SearchValues>(
    key: K,
    value: SearchValues[K] | undefined,
  ) {
    navigate({
      search: (s) => ({
        ...s,
        [key]: value === undefined || value === '' ? undefined : value,
        // Any filter change resets pagination back to page 1.
        page: undefined,
      }),
      replace: true,
    })
  }

  function setView(v: 'cards' | 'table') {
    navigate({
      search: (s) => ({ ...s, view: v === 'cards' ? undefined : v }),
      replace: true,
    })
  }

  function setPage(p: number) {
    navigate({
      search: (s) => ({ ...s, page: p > 1 ? p : undefined }),
      replace: true,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discover medicine"
        description={
          isVerified && canRequest
            ? `${data.total.toLocaleString()} approved ${
                data.total === 1 ? 'listing' : 'listings'
              } from verified sellers across the network.`
            : 'Find sealed, in-date medicine offered by other verified organizations.'
        }
      />

      {!isVerified && (
        <Card className="p-4 border-[var(--color-mm-warn)]">
          <p className="text-sm text-[var(--color-mm-muted)]">
            Your organization is not yet verified. Discovery unlocks once an
            admin approves your verification documents.
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

      <MarketplaceFilters
        value={filterValue}
        hasFilters={hasFilters}
        onChange={(key, value) => {
          // Map MarketplaceFiltersValue keys → URL search keys.
          if (key === 'q') setKey('q', value as string | undefined)
          else if (key === 'city') setKey('city', value as string | undefined)
          else if (key === 'form')
            setKey('form', value as SearchValues['form'])
          else if (key === 'type')
            setKey('type', value as SearchValues['type'])
          else if (key === 'expiry')
            setKey('expiry', value as SearchValues['expiry'])
          else if (key === 'minQty')
            setKey('minQty', value as number | undefined)
          else if (key === 'sort')
            setKey('sort', value as SearchValues['sort'])
        }}
        onClear={() =>
          navigate({
            search: (s) => ({ view: s.view }),
            replace: true,
          })
        }
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[var(--color-mm-subtle)]">
          {data.total === 0
            ? 'No listings to show'
            : `Showing ${(data.page - 1) * data.pageSize + 1}–${
                (data.page - 1) * data.pageSize + items.length
              } of ${data.total.toLocaleString()}`}
        </p>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={hasFilters ? 'No matches' : 'No active listings yet'}
          description={
            hasFilters
              ? 'Try widening your filters above to see more options.'
              : isVerified && canRequest
                ? 'Check back soon — new sealed, in-date stock is added regularly.'
                : 'Once your organization is verified and enabled to request medicine, approved listings will appear here.'
          }
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={() =>
                  navigate({ search: (s) => ({ view: s.view }), replace: true })
                }
              >
                Clear filters
              </Button>
            ) : null
          }
        />
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((row) => (
            <ListingCard key={row.listing.id} row={row} eligible={eligible} />
          ))}
        </div>
      ) : (
        <ListingTable items={items} />
      )}

      {data.pageCount > 1 && (
        <Pagination
          page={data.page}
          pageCount={data.pageCount}
          onPage={setPage}
        />
      )}
    </div>
  )
}

function ViewToggle({
  view,
  onChange,
}: {
  view: 'cards' | 'table'
  onChange: (v: 'cards' | 'table') => void
}) {
  return (
    <div className="inline-flex border border-[var(--color-mm-line-strong)] squircle-sm overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => onChange('cards')}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors',
          view === 'cards'
            ? 'bg-[var(--color-mm-ink)] text-white'
            : 'text-[var(--color-mm-muted)] hover:bg-black/[0.04]',
        )}
        aria-pressed={view === 'cards'}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Cards
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors border-l border-[var(--color-mm-line-strong)]',
          view === 'table'
            ? 'bg-[var(--color-mm-ink)] text-white'
            : 'text-[var(--color-mm-muted)] hover:bg-black/[0.04]',
        )}
        aria-pressed={view === 'table'}
      >
        <Rows3 className="h-3.5 w-3.5" />
        Table
      </button>
    </div>
  )
}

function ListingTable({ items }: { items: MarketplaceListingRow[] }) {
  const columns = React.useMemo<ColumnDef<MarketplaceListingRow>[]>(
    () => [
      {
        id: 'medicine',
        header: 'Medicine',
        cell: ({ row }) => (
          <Link
            to="/org/marketplace/$listingId"
            params={{ listingId: row.original.listing.id }}
            className="text-sm font-medium text-[var(--color-mm-ink)] hover:underline"
          >
            <div>{row.original.medicine.name}</div>
            <div className="text-xs text-[var(--color-mm-subtle)] font-normal mt-0.5">
              {row.original.medicine.strength} ·{' '}
              <MedicineFormLabel form={row.original.medicine.form} />
              {row.original.medicine.genericName
                ? ` · ${row.original.medicine.genericName}`
                : ''}
            </div>
          </Link>
        ),
      },
      {
        id: 'seller',
        header: 'Seller',
        cell: ({ row }) => (
          <div className="text-sm text-[var(--color-mm-muted)]">
            <div className="text-[var(--color-mm-ink)]">
              {row.original.sellerOrg.name}
            </div>
            <div className="text-xs capitalize text-[var(--color-mm-subtle)]">
              {row.original.sellerOrg.type.replace(/_/g, ' ')}
            </div>
          </div>
        ),
      },
      {
        id: 'quantity',
        header: 'Available',
        cell: ({ row }) => (
          <span className="text-sm text-[var(--color-mm-ink)]">
            {row.original.listing.quantityAvailable.toLocaleString()}
            <span className="text-[var(--color-mm-subtle)] text-xs font-normal">
              {' '}
              {row.original.batch.unit}
            </span>
          </span>
        ),
      },
      {
        id: 'price',
        header: 'Price',
        cell: ({ row }) => (
          <PriceTag
            cents={row.original.listing.pricePerUnitCents}
            currency={row.original.listing.currency ?? 'USD'}
            unit={row.original.batch.unit}
          />
        ),
      },
      {
        id: 'expiry',
        header: 'Expiry',
        cell: ({ row }) => {
          const d = row.original.batch.expiryDate
          return (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-[var(--color-mm-muted)]">
                {format(new Date(d), 'd MMM yyyy')}
              </span>
              <ExpiryStatusBadge expiryDate={d} showDays />
            </div>
          )
        },
      },
      {
        id: 'pickup',
        header: 'Pickup',
        cell: ({ row }) => (
          <span className="text-sm text-[var(--color-mm-muted)]">
            {row.original.listing.pickupCity},{' '}
            {row.original.listing.pickupCountry}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="text-right">
            <Button asChild variant="secondary" size="sm">
              <Link
                to="/org/marketplace/$listingId"
                params={{ listingId: row.original.listing.id }}
              >
                Open
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  const table = useReactTable<MarketplaceListingRow>({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr
                key={hg.id}
                className="border-b border-[var(--color-mm-line)] bg-[var(--color-mm-canvas)]"
              >
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="text-left px-5 py-3 text-[11px] uppercase tracking-wide text-[var(--color-mm-subtle)] font-medium"
                  >
                    {h.isPlaceholder
                      ? null
                      : flexRender(
                          h.column.columnDef.header,
                          h.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[var(--color-mm-line)] last:border-b-0"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-5 py-4 align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function Pagination({
  page,
  pageCount,
  onPage,
}: {
  page: number
  pageCount: number
  onPage: (p: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--color-mm-line)]">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Previous
      </Button>
      <span className="text-xs text-[var(--color-mm-subtle)]">
        Page {page} of {pageCount}
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPage(page + 1)}
        disabled={page >= pageCount}
      >
        Next
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
