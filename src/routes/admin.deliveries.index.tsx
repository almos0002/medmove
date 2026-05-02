import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'
import type { ColumnDef } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Search, X, Truck } from 'lucide-react'
import { format } from 'date-fns'
import { z } from 'zod'
import { adminListDeliveries } from '@/server/functions/deliveries'
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
import type { DeliveryStatus } from '@/components/data/DeliveryStatusBadge'
import {
  DeliveryStatusBadge,
  DELIVERY_STATUS_FILTERS,
} from '@/components/data/DeliveryStatusBadge'

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
      'pending',
      'pickup_scheduled',
      'picked_up',
      'scheduled',
      'in_transit',
      'delivered',
      'failed',
      'cancelled',
      'disputed',
    ])
    .optional(),
})

type SearchValues = z.infer<typeof searchSchema>

export const Route = createFileRoute('/admin/deliveries/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    adminListDeliveries({ data: { search: deps.q, status: deps.status } }),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  head: pageHead({ title: "Admin · Deliveries", noindex: true }),
  component: AdminDeliveriesPage,
})

type Row = {
  delivery: {
    id: string
    status: DeliveryStatus
    dispatchMethod: string
    createdAt: string | Date
    pickupScheduledAt: string | Date | null
    pickedUpAt: string | Date | null
    dispatchedAt: string | Date | null
    receivedAt: string | Date | null
  }
  request: { id: string; quantityRequested: number }
  batch: { unit: string }
  medicine: { id: string; name: string; strength: string }
  sellerOrg: { id: string; name: string; type: string }
  requesterOrg: { id: string; name: string; type: string }
  logisticsOrg: { id: string; name: string } | null
}

function AdminDeliveriesPage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const data = Route.useLoaderData()
  const items = data.items as unknown as Row[]
  const hasFilters = !!(search.q || search.status)

  const columns = React.useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: 'medicine',
        header: 'Medicine',
        cell: ({ row }) => (
          <Link
            to="/admin/deliveries/$deliveryId"
            params={{ deliveryId: row.original.delivery.id }}
            className="text-sm font-medium text-[var(--color-mm-ink)] hover:underline"
          >
            <div>{row.original.medicine.name}</div>
            <div className="text-xs text-[var(--color-mm-subtle)] font-normal mt-0.5">
              {row.original.medicine.strength} ·{' '}
              {row.original.request.quantityRequested.toLocaleString()}{' '}
              {row.original.batch.unit}
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
        id: 'receiver',
        header: 'Receiver',
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
        id: 'logistics',
        header: 'Logistics',
        cell: ({ row }) => (
          <span className="text-sm text-[var(--color-mm-muted)]">
            {row.original.logisticsOrg?.name ?? '—'}
          </span>
        ),
      },
      {
        id: 'method',
        header: 'Method',
        cell: ({ row }) => (
          <span className="text-xs text-[var(--color-mm-muted)] capitalize">
            {row.original.delivery.dispatchMethod.replace(/_/g, ' ')}
          </span>
        ),
      },
      {
        id: 'created',
        header: 'Created',
        cell: ({ row }) => (
          <span className="text-xs text-[var(--color-mm-muted)]">
            {format(
              new Date(row.original.delivery.createdAt),
              'd MMM yyyy, HH:mm',
            )}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <DeliveryStatusBadge status={row.original.delivery.status} />
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="text-right">
            <Button asChild variant="secondary" size="sm">
              <Link
                to="/admin/deliveries/$deliveryId"
                params={{ deliveryId: row.original.delivery.id }}
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

  function setSearchKey<TKey extends keyof SearchValues>(
    key: TKey,
    value: SearchValues[TKey],
  ) {
    navigate({
      search: (s) => ({ ...s, [key]: value || undefined }),
      replace: true,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deliveries"
        description={`${items.length} ${
          items.length === 1 ? 'delivery' : 'deliveries'
        } across the platform.`}
      />

      <div className="grid grid-cols-1 md:grid-cols-[2fr_1.4fr_auto] gap-3 items-start">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-mm-subtle)]" />
          <Input
            placeholder="Search medicine, seller or receiver…"
            defaultValue={search.q ?? ''}
            onChange={(e) =>
              setSearchKey(
                'q',
                e.target.value || (undefined as unknown as string),
              )
            }
            className="pl-9"
          />
        </div>
        <Select
          value={search.status ?? FILTERS_ALL}
          onValueChange={(v) =>
            setSearchKey(
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
            {DELIVERY_STATUS_FILTERS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ search: {}, replace: true })}
          disabled={!hasFilters}
          className="self-center"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={hasFilters ? 'No matches' : 'No deliveries yet'}
          description={
            hasFilters
              ? 'Try widening your filters above.'
              : 'Deliveries are created from accepted transfer requests on the request detail page.'
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
