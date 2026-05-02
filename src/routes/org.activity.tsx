import * as React from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { format, formatDistanceToNow } from 'date-fns'
import { Activity, ChevronLeft, ChevronRight, Download, Search, X } from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  getAuditLog,
  listOrgAuditLogs,
} from '@/server/functions/audit'
import { getOrgReportMetrics } from '@/server/functions/reports'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageError } from '@/components/feedback/PageError'
import { PageLoading } from '@/components/feedback/PageLoading'
import { EmptyState } from '@/components/feedback/EmptyState'
import { MetricCard } from '@/components/data/MetricCard'
import { AuditEventBadge } from '@/components/data/AuditEventBadge'
import {
  AuditLogDetailDialog,
  type AuditLogDetailRow,
} from '@/components/data/AuditLogDetailDialog'
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_LABELS,
  AUDIT_ENTITY_TYPES,
  type AuditEntityType,
} from '@/lib/audit-events'
import {
  Boxes,
  CheckCircle2,
  Inbox,
  Package,
  Tags,
  Truck,
} from 'lucide-react'

const FILTER_ALL = '__all__'
const PAGE_SIZE = 25

const searchSchema = z.object({
  action: z.string().trim().max(120).optional(),
  entityType: z.enum(AUDIT_ENTITY_TYPES).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
})

type SearchValues = z.infer<typeof searchSchema>

export const Route = createFileRoute('/org/activity')({
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
  loader: async ({ context, deps }) => {
    const { primaryOrgId } = context as { primaryOrgId: string }
    const offset = ((deps.page ?? 1) - 1) * PAGE_SIZE
    const [activity, metrics] = await Promise.all([
      listOrgAuditLogs({
        data: {
          organizationId: primaryOrgId,
          action: deps.action,
          entityType: deps.entityType,
          search: deps.q,
          limit: PAGE_SIZE,
          offset,
        },
      }),
      getOrgReportMetrics({ data: { organizationId: primaryOrgId } }),
    ])
    return { activity, metrics }
  },
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  component: OrgActivityPage,
})

type Row = AuditLogDetailRow

function OrgActivityPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const { activity, metrics } = Route.useLoaderData()
  const items = activity.items as unknown as Row[]
  const total = activity.total
  const page = search.page ?? 1
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = !!(search.action || search.entityType || search.q)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const detailQuery = useQuery({
    enabled: !!selectedId,
    queryKey: ['audit-log', selectedId],
    queryFn: () =>
      selectedId
        ? getAuditLog({ data: { id: selectedId } })
        : Promise.resolve(null),
  })

  const stockValueDollars = (metrics.impact.stockValueSavedCents / 100).toFixed(
    2,
  )

  const columns = React.useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: 'when',
        header: 'When',
        cell: ({ row }) => {
          const d = new Date(row.original.log.createdAt)
          return (
            <div className="flex flex-col">
              <span className="text-[12.5px] text-[var(--color-mm-ink)]">
                {format(d, 'd MMM yyyy, HH:mm')}
              </span>
              <span className="text-[11px] text-[var(--color-mm-subtle)]">
                {formatDistanceToNow(d, { addSuffix: true })}
              </span>
            </div>
          )
        },
      },
      {
        id: 'event',
        header: 'Event',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <AuditEventBadge action={row.original.log.action} />
            <span className="text-[11px] text-[var(--color-mm-subtle)] font-mono">
              {row.original.log.action}
            </span>
          </div>
        ),
      },
      {
        id: 'actor',
        header: 'Actor',
        cell: ({ row }) => (
          <div className="text-[13px] text-[var(--color-mm-ink)] truncate max-w-[220px]">
            {row.original.actorUser?.email ?? (
              <span className="text-[var(--color-mm-subtle)]">System</span>
            )}
          </div>
        ),
      },
      {
        id: 'entity',
        header: 'Entity',
        cell: ({ row }) => (
          <div>
            <div className="text-[13px] text-[var(--color-mm-ink)]">
              {AUDIT_ENTITY_LABELS[
                row.original.log.entityType as AuditEntityType
              ] ?? row.original.log.entityType}
            </div>
            <div className="text-[11px] text-[var(--color-mm-subtle)] font-mono truncate max-w-[180px]">
              {row.original.log.entityId}
            </div>
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="text-right">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedId(row.original.log.id)}
            >
              Open
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
      to: '/org/activity',
      search: (s: SearchValues) => ({
        ...s,
        [key]: value || undefined,
        page: undefined,
      }),
      replace: true,
    })
  }

  function setPage(p: number) {
    navigate({
      to: '/org/activity',
      search: (s: SearchValues) => ({ ...s, page: p === 1 ? undefined : p }),
      replace: true,
    })
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Step 11 · Activity"
        title="Organization activity"
        description={`${total.toLocaleString()} ${
          total === 1 ? 'event' : 'events'
        } recorded for your organization.`}
        actions={
          <Button
            variant="secondary"
            size="sm"
            disabled
            title="CSV export — coming soon"
            onClick={() => toast.info('CSV export is coming soon')}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <section className="space-y-4">
        <h2 className="font-display text-[18px] text-[var(--color-mm-ink)] leading-tight">
          Your activity at a glance
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Tags}
            label="Active listings"
            value={metrics.listings.active}
            tone="success"
          />
          <MetricCard
            icon={Inbox}
            label="Listings pending review"
            value={metrics.listings.pendingReview}
            tone={metrics.listings.pendingReview > 0 ? 'warn' : 'neutral'}
          />
          <MetricCard
            icon={Boxes}
            label="Inventory batches"
            value={metrics.inventory.batches}
            tone="neutral"
          />
          <MetricCard
            icon={Inbox}
            label="Pending requests"
            value={
              metrics.transfers.pendingAsBuyer + metrics.transfers.pendingAsSeller
            }
            hint={`${metrics.transfers.pendingAsSeller} as seller · ${metrics.transfers.pendingAsBuyer} as buyer`}
            tone={
              metrics.transfers.pendingAsBuyer + metrics.transfers.pendingAsSeller >
              0
                ? 'warn'
                : 'neutral'
            }
          />
          <MetricCard
            icon={CheckCircle2}
            label="Completed transfers"
            value={
              metrics.transfers.completedAsBuyer +
              metrics.transfers.completedAsSeller
            }
            hint={`${metrics.transfers.completedAsSeller} as seller · ${metrics.transfers.completedAsBuyer} as buyer`}
            tone="success"
          />
          <MetricCard
            icon={Truck}
            label="Failed deliveries"
            value={metrics.deliveries.failed}
            tone={metrics.deliveries.failed > 0 ? 'danger' : 'neutral'}
          />
          <MetricCard
            icon={Package}
            label="Units rescued"
            value={metrics.impact.unitsRescued.toLocaleString()}
            tone="accent"
            hint="From your sold listings"
          />
          <MetricCard
            icon={Boxes}
            label="Stock value saved"
            value={`$${Number(stockValueDollars).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            tone="accent"
          />
        </div>
      </section>

      <div className="space-y-3">
        <h2 className="font-display text-[18px] text-[var(--color-mm-ink)] leading-tight">
          Activity log
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1.2fr_1.2fr_auto] gap-3 items-start">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-mm-subtle)]" />
            <Input
              placeholder="Search action or entity ID…"
              value={search.q ?? ''}
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
            value={search.action ?? FILTER_ALL}
            onValueChange={(v) =>
              setSearchKey(
                'action',
                v === FILTER_ALL ? undefined : (v as SearchValues['action']),
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Event type" />
            </SelectTrigger>
            <SelectContent className="max-h-[60vh] overflow-y-auto">
              <SelectItem value={FILTER_ALL}>Any event type</SelectItem>
              {AUDIT_ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={search.entityType ?? FILTER_ALL}
            onValueChange={(v) =>
              setSearchKey(
                'entityType',
                v === FILTER_ALL
                  ? undefined
                  : (v as SearchValues['entityType']),
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Entity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>Any entity</SelectItem>
              {AUDIT_ENTITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {AUDIT_ENTITY_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate({ to: '/org/activity', search: {}, replace: true })
            }
            disabled={!hasFilters}
            className="self-center"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={Activity}
            title={hasFilters ? 'No matching events' : 'No activity yet'}
            description={
              hasFilters
                ? 'Try widening your filters above.'
                : 'Once your team starts using MedMove, every meaningful action shows up here.'
            }
            action={
              hasFilters ? (
                <Button
                  variant="secondary"
                  onClick={() =>
                    navigate({
                      to: '/org/activity',
                      search: {},
                      replace: true,
                    })
                  }
                >
                  Clear filters
                </Button>
              ) : null
            }
          />
        ) : (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
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
                          <td key={cell.id} className="px-5 py-3.5 align-top">
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
              <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-mm-line)] text-[12.5px] text-[var(--color-mm-subtle)]">
                <div>
                  Page{' '}
                  <span className="text-[var(--color-mm-ink)]">{page}</span> of{' '}
                  <span className="text-[var(--color-mm-ink)]">
                    {pageCount}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= pageCount}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AuditLogDetailDialog
        row={(detailQuery.data ?? null) as AuditLogDetailRow | null}
        open={!!selectedId}
        onOpenChange={(o) => {
          if (!o) setSelectedId(null)
        }}
      />
    </div>
  )
}

// useNavigate isn't imported above; export it locally to keep the
// component compact and self-documenting.
import { useNavigate } from '@tanstack/react-router'
