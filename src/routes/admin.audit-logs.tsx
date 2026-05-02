import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'
import { useQuery } from '@tanstack/react-query'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { format, formatDistanceToNow } from 'date-fns'
import { ChevronLeft, ChevronRight, Download, Search, ScrollText, X } from 'lucide-react'
import { z } from 'zod'
import {
  adminListAuditLogs,
  getAuditLog,
} from '@/server/functions/audit'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import { toast } from 'sonner'

const FILTER_ALL = '__all__'
const PAGE_SIZE = 50

/**
 * Search-param schema is intentionally permissive (strings only, length-
 * capped) so typing a partial UUID or in-progress date never throws a
 * route-level validation error. The server-side `listAuditLogsSchema`
 * still enforces strict shapes (uuid / YYYY-MM-DD) before hitting the DB.
 */
const searchSchema = z.object({
  action: z.string().trim().max(120).optional(),
  entityType: z.enum(AUDIT_ENTITY_TYPES).optional(),
  entityId: z.string().trim().max(120).optional(),
  actorOrgId: z.string().trim().max(120).optional(),
  actorUserId: z.string().trim().max(120).optional(),
  q: z.string().trim().max(120).optional(),
  dateFrom: z.string().trim().max(20).optional(),
  dateTo: z.string().trim().max(20).optional(),
  page: z.coerce.number().int().min(1).optional(),
})

type SearchValues = z.infer<typeof searchSchema>

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/
const isUuid = (v: string | undefined) => !!v && UUID_RE.test(v)
const isYmd = (v: string | undefined) => !!v && YMD_RE.test(v)

export const Route = createFileRoute('/admin/audit-logs')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => {
    const offset = ((deps.page ?? 1) - 1) * PAGE_SIZE
    // Only forward UUID/date values when they actually look valid — server
    // validators are strict so passing a half-typed value would 400.
    return adminListAuditLogs({
      data: {
        action: deps.action,
        entityType: deps.entityType,
        entityId: deps.entityId,
        actorOrgId: isUuid(deps.actorOrgId) ? deps.actorOrgId : undefined,
        actorUserId: deps.actorUserId,
        search: deps.q,
        dateFrom: isYmd(deps.dateFrom) ? deps.dateFrom : undefined,
        dateTo: isYmd(deps.dateTo) ? deps.dateTo : undefined,
        limit: PAGE_SIZE,
        offset,
      },
    })
  },
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  head: pageHead({ title: "Admin · Audit logs", noindex: true }),
  component: AdminAuditLogsPage,
})

type Row = AuditLogDetailRow

function AdminAuditLogsPage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const data = Route.useLoaderData()
  const items = data.items as unknown as Row[]
  const total = data.total
  const page = search.page ?? 1
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const hasFilters = !!(
    search.action ||
    search.entityType ||
    search.entityId ||
    search.actorOrgId ||
    search.actorUserId ||
    search.q ||
    search.dateFrom ||
    search.dateTo
  )

  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const detailQuery = useQuery({
    enabled: !!selectedId,
    queryKey: ['audit-log', selectedId],
    queryFn: () =>
      selectedId
        ? getAuditLog({ data: { id: selectedId } })
        : Promise.resolve(null),
  })

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
          <div className="min-w-0">
            <div className="text-[13px] text-[var(--color-mm-ink)] truncate max-w-[220px]">
              {row.original.actorUser?.email ?? (
                <span className="text-[var(--color-mm-subtle)]">System</span>
              )}
            </div>
            {row.original.actorOrg?.name && (
              <div className="text-[11.5px] text-[var(--color-mm-subtle)] truncate max-w-[220px]">
                {row.original.actorOrg.name}
              </div>
            )}
          </div>
        ),
      },
      {
        id: 'entity',
        header: 'Entity',
        cell: ({ row }) => (
          <div className="min-w-0">
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
      search: (s) => ({
        ...s,
        [key]: value || undefined,
        // Any filter change resets pagination.
        page: key === 'page' ? value : undefined,
      }),
      replace: true,
    })
  }

  function setPage(p: number) {
    navigate({
      search: (s) => ({ ...s, page: p === 1 ? undefined : p }),
      replace: true,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Step 11 · Audit"
        title="Audit logs"
        description={`${total.toLocaleString()} ${
          total === 1 ? 'event' : 'events'
        } recorded. Append-only — no entry can ever be edited or deleted.`}
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

      <FilterBar
        search={search}
        hasFilters={hasFilters}
        onChange={setSearchKey}
        onClear={() =>
          navigate({
            search: {},
            replace: true,
          })
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={hasFilters ? 'No matching events' : 'No events yet'}
          description={
            hasFilters
              ? 'Try widening your filters above.'
              : 'Audit events will appear here as people use the platform.'
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
              Page <span className="text-[var(--color-mm-ink)]">{page}</span> of{' '}
              <span className="text-[var(--color-mm-ink)]">{pageCount}</span>
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
        </Card>
      )}

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
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1.2fr_1.2fr_auto] gap-3 items-start">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-mm-subtle)]" />
          <Input
            placeholder="Search action, actor, entity ID…"
            value={search.q ?? ''}
            onChange={(e) =>
              onChange('q', e.target.value || (undefined as unknown as string))
            }
            className="pl-9"
          />
        </div>
        <Select
          value={search.action ?? FILTER_ALL}
          onValueChange={(v) =>
            onChange(
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
            onChange(
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
          onClick={onClear}
          disabled={!hasFilters}
          className="self-center"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1.4fr_1fr_1fr] gap-3 items-start">
        <Input
          placeholder="Entity ID (uuid)"
          value={search.entityId ?? ''}
          onChange={(e) =>
            onChange(
              'entityId',
              e.target.value || (undefined as unknown as string),
            )
          }
        />
        <Input
          placeholder="Actor org ID (uuid)"
          value={search.actorOrgId ?? ''}
          onChange={(e) =>
            onChange(
              'actorOrgId',
              e.target.value || (undefined as unknown as string),
            )
          }
        />
        <Input
          type="date"
          value={search.dateFrom ?? ''}
          onChange={(e) =>
            onChange(
              'dateFrom',
              e.target.value || (undefined as unknown as string),
            )
          }
        />
        <Input
          type="date"
          value={search.dateTo ?? ''}
          onChange={(e) =>
            onChange(
              'dateTo',
              e.target.value || (undefined as unknown as string),
            )
          }
        />
      </div>
    </div>
  )
}
