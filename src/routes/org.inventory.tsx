import * as React from 'react'
import { createFileRoute, Link, useNavigate, redirect } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { Boxes, Plus, Search, X } from 'lucide-react'
import { z } from 'zod'
import { listInventoryBatches } from '@/server/functions/inventory'
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
  SealedStatusBadge,
  StorageTypeBadge,
  STORAGE_TYPES,
} from '@/components/data/SealedStatusBadge'
import { format } from 'date-fns'

const FILTERS_ALL = '__all__'

const searchSchema = z.object({
  q: z.string().optional(),
  batch: z.string().optional(),
  expiry: z.enum(['safe', 'expiring_soon', 'critical', 'expired']).optional(),
  sealed: z.enum(['sealed', 'opened']).optional(),
  storage: z.enum(['room_temperature', 'cool_dry_place', 'refrigerated']).optional(),
})

type SearchValues = z.infer<typeof searchSchema>

export const Route = createFileRoute('/org/inventory')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  beforeLoad: async ({ context }) => {
    const session = (context as { session?: { primaryOrg?: { id: string } | null } }).session
    if (!session?.primaryOrg) {
      throw redirect({ to: '/org' })
    }
    return { primaryOrgId: session.primaryOrg.id }
  },
  loader: ({ context, deps }) => {
    const { primaryOrgId } = context as { primaryOrgId: string }
    return listInventoryBatches({
      data: {
        organizationId: primaryOrgId,
        medicineSearch: deps.q && deps.q.length > 0 ? deps.q : undefined,
        batchNumberSearch: deps.batch && deps.batch.length > 0 ? deps.batch : undefined,
        expiryStatus: deps.expiry,
        sealedStatus: deps.sealed,
        storageType: deps.storage,
      },
    })
  },
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => <PageError error={error} reset={reset} />,
  component: OrgInventoryPage,
})

type Row = {
  batch: {
    id: string
    batchNumber: string
    expiryDate: string
    quantityOnHand: number
    unit: string
    storageType: string
    sealedStatus: string
    createdAt: Date | string
  }
  medicine: {
    id: string
    name: string
    strength: string
    form: string
    genericName: string | null
  }
}

function OrgInventoryPage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const data = Route.useLoaderData()
  const { session } = Route.useRouteContext() as {
    session: {
      primaryOrg: { canListMedicine: boolean; verificationStatus: string } | null
    }
  }
  const canList = !!session.primaryOrg?.canListMedicine
  const isVerified = session.primaryOrg?.verificationStatus === 'verified'

  const items = data.items as unknown as Row[]
  const hasFilters = !!(
    search.q ||
    search.batch ||
    search.expiry ||
    search.sealed ||
    search.storage
  )

  const columns = React.useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: 'medicine',
        header: 'Medicine',
        cell: ({ row }) => (
          <Link
            to="/org/inventory/$batchId"
            params={{ batchId: row.original.batch.id }}
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
        id: 'batchNumber',
        header: 'Batch #',
        cell: ({ row }) => (
          <span className="text-sm text-[var(--color-mm-muted)] font-mono">
            {row.original.batch.batchNumber}
          </span>
        ),
      },
      {
        id: 'quantity',
        header: 'Quantity',
        cell: ({ row }) => (
          <span className="text-sm text-[var(--color-mm-ink)]">
            {row.original.batch.quantityOnHand.toLocaleString()}{' '}
            <span className="text-[var(--color-mm-subtle)]">{row.original.batch.unit}</span>
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
        id: 'sealed',
        header: 'Sealed',
        cell: ({ row }) => (
          <SealedStatusBadge
            sealed={row.original.batch.sealedStatus as 'sealed' | 'opened'}
          />
        ),
      },
      {
        id: 'storage',
        header: 'Storage',
        cell: ({ row }) => <StorageTypeBadge type={row.original.batch.storageType} />,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="text-right">
            <Button asChild variant="secondary" size="sm">
              <Link
                to="/org/inventory/$batchId"
                params={{ batchId: row.original.batch.id }}
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

  function setSearchKey<K extends keyof SearchValues>(key: K, value: SearchValues[K]) {
    navigate({
      search: (s) => ({ ...s, [key]: value || undefined }),
      replace: true,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description={`${data.total} ${data.total === 1 ? 'batch' : 'batches'} on hand. Only sealed, in-date stock can be added.`}
        actions={
          <Button asChild disabled={!canList || !isVerified}>
            <Link to="/org/inventory/new">
              <Plus className="h-4 w-4" />
              Add batch
            </Link>
          </Button>
        }
      />

      {!isVerified && (
        <Card className="p-4 border-[var(--color-mm-warn)]">
          <p className="text-sm text-[var(--color-mm-muted)]">
            Your organization is not yet verified. You can review existing
            inventory but not add new batches until verification is approved.
          </p>
        </Card>
      )}
      {isVerified && !canList && (
        <Card className="p-4 border-[var(--color-mm-line-strong)]">
          <p className="text-sm text-[var(--color-mm-muted)]">
            Listing inventory isn’t enabled for this organization type. Contact
            an admin if you believe this is in error.
          </p>
        </Card>
      )}

      <FilterBar
        search={search}
        hasFilters={hasFilters}
        onChange={setSearchKey}
        onClear={() =>
          navigate({ search: {}, replace: true })
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={hasFilters ? 'No matches' : 'No batches yet'}
          description={
            hasFilters
              ? 'Try clearing the filters above to see all stock.'
              : 'Add your first sealed, in-date batch to start tracking your inventory.'
          }
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={() => navigate({ search: {} })}>
                Clear filters
              </Button>
            ) : canList && isVerified ? (
              <Button asChild>
                <Link to="/org/inventory/new">
                  <Plus className="h-4 w-4" />
                  Add first batch
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
                          : flexRender(h.column.columnDef.header, h.getContext())}
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
    <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-3 items-start">
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
        placeholder="Batch number"
        defaultValue={search.batch ?? ''}
        onChange={(e) =>
          onChange('batch', e.target.value || (undefined as unknown as string))
        }
      />

      <Select
        value={search.expiry ?? FILTERS_ALL}
        onValueChange={(v) =>
          onChange('expiry', v === FILTERS_ALL ? undefined : (v as SearchValues['expiry']))
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Expiry status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FILTERS_ALL}>Any expiry</SelectItem>
          <SelectItem value="safe">Safe</SelectItem>
          <SelectItem value="expiring_soon">Expiring soon</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="expired">Expired</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={search.sealed ?? FILTERS_ALL}
        onValueChange={(v) =>
          onChange('sealed', v === FILTERS_ALL ? undefined : (v as SearchValues['sealed']))
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Sealed status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FILTERS_ALL}>Any seal</SelectItem>
          <SelectItem value="sealed">Sealed</SelectItem>
          <SelectItem value="opened">Opened</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={search.storage ?? FILTERS_ALL}
        onValueChange={(v) =>
          onChange('storage', v === FILTERS_ALL ? undefined : (v as SearchValues['storage']))
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Storage" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FILTERS_ALL}>Any storage</SelectItem>
          {STORAGE_TYPES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
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

