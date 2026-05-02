import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { Tags, Search, X } from 'lucide-react'
import { format } from 'date-fns'
import { z } from 'zod'
import { adminListAllListings } from '@/server/functions/listings'
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
import {
  ListingStatusBadge,
  LISTING_STATUS_FILTERS,
  LISTING_TYPE_FILTERS,
  LISTING_EXPIRY_WINDOW_FILTERS,
  type ListingStatus,
} from '@/components/data/ListingStatusBadge'

const FILTERS_ALL = '__all__'

const searchSchema = z.object({
  q: z
    .string()
    .trim()
    .max(120)
    .transform((v) => (v.length === 0 ? undefined : v))
    .optional(),
  org: z
    .string()
    .trim()
    .max(120)
    .transform((v) => (v.length === 0 ? undefined : v))
    .optional(),
  status: z
    .enum([
      'draft',
      'pending_admin',
      'active',
      'rejected',
      'sold_out',
      'expired',
      'withdrawn',
    ])
    .optional(),
  type: z.enum(['donation', 'sale']).optional(),
  expiry: z.enum(['expired', 'critical', 'expiring_soon', 'safe']).optional(),
})

type SearchValues = z.infer<typeof searchSchema>

export const Route = createFileRoute('/admin/listings/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    adminListAllListings({
      data: {
        // Default to the review queue when no status filter is set.
        status: deps.status ?? 'pending_admin',
        medicineSearch: deps.q && deps.q.length > 0 ? deps.q : undefined,
        orgSearch: deps.org && deps.org.length > 0 ? deps.org : undefined,
        listingType: deps.type,
        expiryWindow: deps.expiry,
      },
    }),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => <PageError error={error} reset={reset} />,
  head: pageHead({ title: "Admin · Listings", noindex: true }),
  component: AdminListingsPage,
})

type Row = {
  listing: {
    id: string
    status: ListingStatus
    quantityListed: number
    quantityAvailable: number
    pricePerUnitCents: number | null
    currency: string | null
    pickupCity: string
    pickupCountry: string
    submittedAt: Date | string | null
    updatedAt: Date | string
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
  }
  sellerOrg: {
    id: string
    name: string
    type: string
  }
}

function AdminListingsPage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const data = Route.useLoaderData()

  const items = data.items as unknown as Row[]
  const effectiveStatus = (search.status ?? 'pending_admin') as ListingStatus
  const hasFilters = !!(
    search.q ||
    search.org ||
    search.status ||
    search.type ||
    search.expiry
  )

  const columns = React.useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: 'photo',
        header: '',
        cell: ({ row }) => (
          <ListingThumb
            url={row.original.listing.photoUrls?.[0] ?? null}
            alt={row.original.medicine.name}
          />
        ),
      },
      {
        id: 'medicine',
        header: 'Medicine',
        cell: ({ row }) => (
          <Link
            to="/admin/listings/$listingId"
            params={{ listingId: row.original.listing.id }}
            className="text-sm font-medium text-[var(--color-mm-ink)] hover:underline"
          >
            <div>{row.original.medicine.name}</div>
            <div className="text-xs text-[var(--color-mm-subtle)] font-normal mt-0.5">
              {row.original.medicine.strength}
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
          <div>
            <div className="text-sm text-[var(--color-mm-ink)]">
              {row.original.sellerOrg.name}
            </div>
            <div className="text-xs text-[var(--color-mm-subtle)] capitalize mt-0.5">
              {row.original.sellerOrg.type.replace(/_/g, ' ')}
            </div>
          </div>
        ),
      },
      {
        id: 'batch',
        header: 'Batch',
        cell: ({ row }) => (
          <span className="text-sm text-[var(--color-mm-muted)]">
            {row.original.batch.batchNumber}
          </span>
        ),
      },
      {
        id: 'quantity',
        header: 'Quantity',
        cell: ({ row }) => (
          <span className="text-sm text-[var(--color-mm-ink)]">
            {row.original.listing.quantityListed.toLocaleString()}{' '}
            <span className="text-[var(--color-mm-subtle)]">
              {row.original.batch.unit}
            </span>
          </span>
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
        id: 'submitted',
        header: 'Submitted',
        cell: ({ row }) =>
          row.original.listing.submittedAt ? (
            <span className="text-xs text-[var(--color-mm-muted)]">
              {format(
                new Date(row.original.listing.submittedAt),
                'd MMM yyyy, HH:mm',
              )}
            </span>
          ) : (
            <span className="text-xs text-[var(--color-mm-subtle)]">—</span>
          ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <ListingStatusBadge status={row.original.listing.status} />
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="text-right">
            <Button asChild variant="secondary" size="sm">
              <Link
                to="/admin/listings/$listingId"
                params={{ listingId: row.original.listing.id }}
              >
                Review
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  const table = useReactTable<Row>({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

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
        title="Listings review"
        description={`${items.length} ${
          items.length === 1 ? 'listing' : 'listings'
        } in “${
          LISTING_STATUS_FILTERS.find((s) => s.value === effectiveStatus)
            ?.label ?? effectiveStatus
        }”. Defaults to the pending review queue.`}
      />

      <FilterBar
        search={search}
        hasFilters={hasFilters}
        onChange={setSearchKey}
        onClear={() => navigate({ search: {}, replace: true })}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Tags}
          title={hasFilters ? 'No matches' : 'Queue is clear'}
          description={
            hasFilters
              ? 'Try clearing the filters above to widen the search.'
              : 'No pending listings right now. New submissions will appear here.'
          }
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={() => navigate({ search: {} })}
              >
                Clear filters
              </Button>
            ) : null
          }
        />
      ) : (
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
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

function ListingThumb({
  url,
  alt,
}: {
  url: string | null
  alt: string
}) {
  if (!url) {
    return (
      <div
        className="h-14 w-14 squircle-xs bg-[var(--color-mm-canvas)] border border-[var(--color-mm-line)] flex items-center justify-center"
        aria-hidden="true"
      >
        <Tags
          className="h-5 w-5 text-[var(--color-mm-subtle)]"
          strokeWidth={1.5}
        />
      </div>
    )
  }
  return (
    <div className="h-14 w-14 squircle-xs overflow-hidden border border-[var(--color-mm-line)] bg-[var(--color-mm-canvas)]">
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className="w-full h-full object-cover"
      />
    </div>
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr_auto] gap-3 items-start">
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
        placeholder="Search seller organization…"
        defaultValue={search.org ?? ''}
        onChange={(e) =>
          onChange('org', e.target.value || (undefined as unknown as string))
        }
      />

      <Select
        value={search.status ?? FILTERS_ALL}
        onValueChange={(v) =>
          onChange(
            'status',
            v === FILTERS_ALL ? undefined : (v as SearchValues['status']),
          )
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Pending review" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FILTERS_ALL}>Pending review (default)</SelectItem>
          {LISTING_STATUS_FILTERS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={search.type ?? FILTERS_ALL}
        onValueChange={(v) =>
          onChange(
            'type',
            v === FILTERS_ALL ? undefined : (v as SearchValues['type']),
          )
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FILTERS_ALL}>Any type</SelectItem>
          {LISTING_TYPE_FILTERS.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={search.expiry ?? FILTERS_ALL}
        onValueChange={(v) =>
          onChange(
            'expiry',
            v === FILTERS_ALL ? undefined : (v as SearchValues['expiry']),
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
