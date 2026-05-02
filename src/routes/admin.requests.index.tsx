import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { ShieldCheck, Search, X } from 'lucide-react'
import { format } from 'date-fns'
import { z } from 'zod'
import { adminListTransferRequests } from '@/server/functions/transfers'
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
  TransferRequestStatusBadge,
  TRANSFER_REQUEST_STATUS_FILTERS,
  type TransferRequestStatus,
} from '@/components/data/TransferRequestStatusBadge'
import { LISTING_EXPIRY_WINDOW_FILTERS } from '@/components/data/ListingStatusBadge'

const FILTERS_ALL = '__all__'

const searchSchema = z.object({
  q: z
    .string()
    .trim()
    .max(120)
    .transform((v) => (v.length === 0 ? undefined : v))
    .optional(),
  requester: z
    .string()
    .trim()
    .max(120)
    .transform((v) => (v.length === 0 ? undefined : v))
    .optional(),
  seller: z
    .string()
    .trim()
    .max(120)
    .transform((v) => (v.length === 0 ? undefined : v))
    .optional(),
  status: z
    .enum([
      'pending_admin',
      'rejected',
      'pending_seller',
      'declined',
      'accepted',
      'awaiting_handoff',
      'dispatched',
      'completed',
      'expired',
      'cancelled',
    ])
    .optional(),
  expiry: z.enum(['expired', 'critical', 'expiring_soon', 'safe']).optional(),
})

type SearchValues = z.infer<typeof searchSchema>

export const Route = createFileRoute('/admin/requests/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    adminListTransferRequests({
      data: {
        status: deps.status ?? 'pending_admin',
        medicineSearch: deps.q,
        requesterOrgSearch: deps.requester,
        sellerOrgSearch: deps.seller,
        expiryWindow: deps.expiry,
      },
    }),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  head: pageHead({ title: "Admin · Requests", noindex: true }),
  component: AdminRequestsPage,
})

type Row = {
  request: {
    id: string
    status: TransferRequestStatus
    quantityRequested: number
    createdAt: string
  }
  listing: {
    id: string
    pickupCity: string
    pickupCountry: string
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
  requesterOrg: { id: string; name: string; type: string }
  sellerOrg: { id: string; name: string; type: string }
}

function AdminRequestsPage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const data = Route.useLoaderData()
  const items = data.items as unknown as Row[]
  const effectiveStatus = (search.status ?? 'pending_admin') as TransferRequestStatus
  const hasFilters = !!(
    search.q ||
    search.requester ||
    search.seller ||
    search.status ||
    search.expiry
  )

  const columns = React.useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: 'medicine',
        header: 'Medicine',
        cell: ({ row }) => (
          <Link
            to="/admin/requests/$requestId"
            params={{ requestId: row.original.request.id }}
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
        id: 'requester',
        header: 'Requester',
        cell: ({ row }) => (
          <div>
            <div className="text-sm text-[var(--color-mm-ink)]">
              {row.original.requesterOrg.name}
            </div>
            <div className="text-xs text-[var(--color-mm-subtle)] capitalize mt-0.5">
              {row.original.requesterOrg.type.replace(/_/g, ' ')}
            </div>
          </div>
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
        id: 'quantity',
        header: 'Qty',
        cell: ({ row }) => (
          <span className="text-sm text-[var(--color-mm-ink)]">
            {row.original.request.quantityRequested.toLocaleString()}{' '}
            <span className="text-[var(--color-mm-subtle)]">
              {row.original.batch.unit}
            </span>
          </span>
        ),
      },
      {
        id: 'expiry',
        header: 'Batch expiry',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-[var(--color-mm-muted)]">
              {format(new Date(row.original.batch.expiryDate), 'd MMM yyyy')}
            </span>
            <ExpiryStatusBadge
              expiryDate={row.original.batch.expiryDate}
              showDays
            />
          </div>
        ),
      },
      {
        id: 'submitted',
        header: 'Submitted',
        cell: ({ row }) => (
          <span className="text-xs text-[var(--color-mm-muted)]">
            {format(
              new Date(row.original.request.createdAt),
              'd MMM yyyy, HH:mm',
            )}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <TransferRequestStatusBadge status={row.original.request.status} />
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="text-right">
            <Button asChild variant="secondary" size="sm">
              <Link
                to="/admin/requests/$requestId"
                params={{ requestId: row.original.request.id }}
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

  const statusLabel =
    TRANSFER_REQUEST_STATUS_FILTERS.find((s) => s.value === effectiveStatus)
      ?.label ?? effectiveStatus

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transfer requests"
        description={`${items.length} ${
          items.length === 1 ? 'request' : 'requests'
        } in “${statusLabel}”. Defaults to pending admin review.`}
      />

      <FilterBar
        search={search}
        hasFilters={hasFilters}
        onChange={setSearchKey}
        onClear={() => navigate({ search: {}, replace: true })}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={hasFilters ? 'No matches' : 'Queue is clear'}
          description={
            hasFilters
              ? 'Try clearing filters above to widen the search.'
              : 'No transfer requests are awaiting admin review right now.'
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.4fr_1.4fr_1.4fr_1fr_1fr_auto] gap-3 items-start">
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
        placeholder="Search requester org…"
        defaultValue={search.requester ?? ''}
        onChange={(e) =>
          onChange(
            'requester',
            e.target.value || (undefined as unknown as string),
          )
        }
      />
      <Input
        placeholder="Search seller org…"
        defaultValue={search.seller ?? ''}
        onChange={(e) =>
          onChange(
            'seller',
            e.target.value || (undefined as unknown as string),
          )
        }
      />
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
          <SelectValue placeholder="Pending admin" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FILTERS_ALL}>Pending admin (default)</SelectItem>
          {TRANSFER_REQUEST_STATUS_FILTERS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
