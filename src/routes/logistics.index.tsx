import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'
import type { ColumnDef } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Truck, X } from 'lucide-react'
import { format } from 'date-fns'
import { z } from 'zod'
import { listMyAssignedDeliveries } from '@/server/functions/deliveries'
import { Card } from '@/components/ui/card'
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

export const Route = createFileRoute('/logistics/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    listMyAssignedDeliveries({ data: { status: deps.status } }),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  head: pageHead({ title: "Assigned deliveries", noindex: true }),
  component: LogisticsHome,
})

type Row = {
  delivery: {
    id: string
    status: DeliveryStatus
    dispatchMethod: string
    pickupScheduledAt: string | Date | null
    createdAt: string | Date
  }
  request: { quantityRequested: number }
  batch: { unit: string }
  medicine: { name: string; strength: string }
  sellerOrg: { name: string; type: string }
  requesterOrg: { name: string; type: string }
}

function LogisticsHome() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const data = Route.useLoaderData()
  const items = data.items as unknown as Row[]
  const { session } = Route.useRouteContext()

  const columns = React.useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: 'medicine',
        header: 'Medicine',
        cell: ({ row }) => (
          <Link
            to="/logistics/$deliveryId"
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
        header: 'From',
        cell: ({ row }) => (
          <span className="text-sm text-[var(--color-mm-ink)]">
            {row.original.sellerOrg.name}
          </span>
        ),
      },
      {
        id: 'receiver',
        header: 'To',
        cell: ({ row }) => (
          <span className="text-sm text-[var(--color-mm-ink)]">
            {row.original.requesterOrg.name}
          </span>
        ),
      },
      {
        id: 'pickup',
        header: 'Pickup',
        cell: ({ row }) =>
          row.original.delivery.pickupScheduledAt ? (
            <span className="text-xs text-[var(--color-mm-muted)]">
              {format(
                new Date(row.original.delivery.pickupScheduledAt),
                'd MMM yyyy, HH:mm',
              )}
            </span>
          ) : (
            <span className="text-xs text-[var(--color-mm-subtle)]">
              Not scheduled
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
                to="/logistics/$deliveryId"
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assigned deliveries"
        description={
          <>
            Signed in as{' '}
            <span className="font-medium text-[var(--color-mm-ink)]">
              {session.user?.email}
            </span>
            .
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_auto] gap-3 items-start max-w-md">
        <Select
          value={search.status ?? FILTERS_ALL}
          onValueChange={(v) =>
            navigate({
              search: () => ({
                status:
                  v === FILTERS_ALL
                    ? undefined
                    : (v as SearchValues['status']),
              }),
              replace: true,
            })
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
          disabled={!search.status}
          onClick={() => navigate({ search: {}, replace: true })}
          className="self-center"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={search.status ? 'No matches' : 'No deliveries assigned'}
          description={
            search.status
              ? 'Try a different status filter.'
              : 'Deliveries assigned by an admin will appear here.'
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
