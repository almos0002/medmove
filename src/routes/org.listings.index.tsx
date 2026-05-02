import * as React from 'react'
import {
  createFileRoute,
  Link,
  useNavigate,
  redirect,
} from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { Tags, Plus, Search, X } from 'lucide-react'
import { format } from 'date-fns'
import { z } from 'zod'
import { listMyListings } from '@/server/functions/listings'
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

export const Route = createFileRoute('/org/listings/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  beforeLoad: async ({ context }) => {
    const session = (
      context as { session?: { primaryOrg?: { id: string } | null } }
    ).session
    if (!session?.primaryOrg) {
      throw redirect({ to: '/org' })
    }
    return { primaryOrgId: session.primaryOrg.id }
  },
  loader: ({ context, deps }) => {
    const { primaryOrgId } = context as { primaryOrgId: string }
    return listMyListings({
      data: {
        organizationId: primaryOrgId,
        status: deps.status,
        medicineSearch: deps.q && deps.q.length > 0 ? deps.q : undefined,
        listingType: deps.type,
        expiryWindow: deps.expiry,
      },
    })
  },
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => <PageError error={error} reset={reset} />,
  component: OrgListingsPage,
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
}

function OrgListingsPage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const data = Route.useLoaderData()
  const { session } = Route.useRouteContext() as {
    session: {
      primaryOrg: {
        canListMedicine: boolean
        verificationStatus: string
      } | null
    }
  }
  const canList = !!session.primaryOrg?.canListMedicine
  const isVerified = session.primaryOrg?.verificationStatus === 'verified'
  const canCreate = canList && isVerified

  const items = data.items as unknown as Row[]
  const hasFilters = !!(search.q || search.status || search.type || search.expiry)

  const columns = React.useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: 'medicine',
        header: 'Medicine',
        cell: ({ row }) => (
          <Link
            to="/org/listings/$listingId"
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
            {row.original.listing.quantityAvailable.toLocaleString()}
            <span className="text-[var(--color-mm-subtle)]">
              {' '}
              / {row.original.listing.quantityListed.toLocaleString()}{' '}
              {row.original.batch.unit}
            </span>
          </span>
        ),
      },
      {
        id: 'price',
        header: 'Price',
        cell: ({ row }) => (
          <PriceCell
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
                to="/org/listings/$listingId"
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
        title="Listings"
        description={`${items.length} ${
          items.length === 1 ? 'listing' : 'listings'
        }. Listings start as drafts and need admin approval before going live.`}
        actions={
          <Button asChild disabled={!canCreate}>
            <Link to="/org/listings/new">
              <Plus className="h-4 w-4" />
              New listing
            </Link>
          </Button>
        }
      />

      {!isVerified && (
        <Card className="p-4 border-[var(--color-mm-warn)]">
          <p className="text-sm text-[var(--color-mm-muted)]">
            Your organization is not yet verified. You can review existing
            listings but not create new ones until verification is approved.
          </p>
        </Card>
      )}
      {isVerified && !canList && (
        <Card className="p-4 border-[var(--color-mm-line-strong)]">
          <p className="text-sm text-[var(--color-mm-muted)]">
            Listing medicines isn’t enabled for this organization type. Contact
            an admin if you believe this is in error.
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
          icon={Tags}
          title={hasFilters ? 'No matches' : 'No listings yet'}
          description={
            hasFilters
              ? 'Try clearing the filters above to see all your listings.'
              : 'Pick a sealed, in-date batch from your inventory to publish your first listing.'
          }
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={() => navigate({ search: {} })}
              >
                Clear filters
              </Button>
            ) : canCreate ? (
              <Button asChild>
                <Link to="/org/listings/new">
                  <Plus className="h-4 w-4" />
                  Create first listing
                </Link>
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

function PriceCell({
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
      <span className="text-sm text-[var(--color-mm-ok)] font-medium">Free</span>
    )
  }
  const formatted = (cents / 100).toFixed(2)
  return (
    <span className="text-sm text-[var(--color-mm-ink)]">
      {formatted} {currency}
      <span className="text-[var(--color-mm-subtle)]">/{unit}</span>
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
    <div className="grid grid-cols-1 md:grid-cols-[2fr_1.2fr_1.2fr_1.2fr_auto] gap-3 items-start">
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

      <Select
        value={search.status ?? FILTERS_ALL}
        onValueChange={(v) =>
          onChange(
            'status',
            v === FILTERS_ALL
              ? undefined
              : (v as SearchValues['status']),
          )
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FILTERS_ALL}>Any status</SelectItem>
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
