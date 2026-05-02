import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Pill, Plus, Search, X } from 'lucide-react'
import { z } from 'zod'
import { listMedicines } from '@/server/functions/medicines'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoading } from '@/components/feedback/PageLoading'
import { PageError } from '@/components/feedback/PageError'
import { EmptyState } from '@/components/feedback/EmptyState'
import { MedicineFormLabel } from '@/components/data/MedicineFormLabel'

const searchSchema = z.object({
  q: z.string().optional(),
  showInactive: z.boolean().optional(),
})

export const Route = createFileRoute('/admin/medicines')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ q: search.q, showInactive: search.showInactive }),
  loader: ({ deps }) =>
    listMedicines({
      data: {
        search: deps.q && deps.q.length > 0 ? deps.q : undefined,
        includeInactive: !!deps.showInactive,
        limit: 200,
      },
    }),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => <PageError error={error} reset={reset} />,
  component: AdminMedicinesPage,
})

function AdminMedicinesPage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const data = Route.useLoaderData()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medicine catalog"
        description={`${data.total} ${search.showInactive ? 'total' : 'active'} ${data.total === 1 ? 'entry' : 'entries'}. Sellers can only stock items from this list.`}
        actions={
          <Button asChild>
            <Link to="/admin/medicines/new">
              <Plus className="h-4 w-4" />
              New medicine
            </Link>
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <FilterPill
            active={!search.showInactive}
            onClick={() => navigate({ search: (s) => ({ ...s, showInactive: undefined }) })}
            label="Active only"
          />
          <FilterPill
            active={!!search.showInactive}
            onClick={() => navigate({ search: (s) => ({ ...s, showInactive: true }) })}
            label="Include inactive"
          />
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-mm-subtle)]" />
          <Input
            placeholder="Search by name, generic name, manufacturer…"
            defaultValue={search.q ?? ''}
            onChange={(e) => {
              const q = e.target.value
              navigate({
                search: (s) => ({ ...s, q: q.length > 0 ? q : undefined }),
                replace: true,
              })
            }}
            className="pl-9"
          />
          {search.q && (
            <button
              onClick={() => navigate({ search: (s) => ({ ...s, q: undefined }) })}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--color-mm-subtle)] hover:text-[var(--color-mm-ink)]"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {data.items.length === 0 ? (
        <EmptyState
          icon={Pill}
          title={search.q ? 'No matches' : 'No medicines yet'}
          description={
            search.q
              ? 'Try clearing the search or including inactive entries.'
              : 'Add the first entry to the catalog so verified sellers can stock it.'
          }
          action={
            <Button asChild>
              <Link to="/admin/medicines/new">
                <Plus className="h-4 w-4" />
                Add medicine
              </Link>
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1.4fr_0.8fr_1fr_auto] items-center gap-4 px-6 py-3 text-[11px] uppercase tracking-wide text-[var(--color-mm-subtle)] border-b border-[var(--color-mm-line)] bg-[var(--color-mm-canvas)]">
            <div>Medicine</div>
            <div>Generic / Manufacturer</div>
            <div>Form</div>
            <div>Status</div>
            <div className="text-right">Action</div>
          </div>
          <ul className="divide-y divide-[var(--color-mm-line)]">
            {data.items.map((m) => (
              <li
                key={m.id}
                className="grid grid-cols-1 md:grid-cols-[2fr_1.4fr_0.8fr_1fr_auto] items-start md:items-center gap-3 md:gap-4 px-6 py-4"
              >
                <div className="min-w-0">
                  <Link
                    to="/admin/medicines/$medicineId"
                    params={{ medicineId: m.id }}
                    className="text-sm font-medium text-[var(--color-mm-ink)] hover:underline"
                  >
                    {m.name}
                  </Link>
                  <div className="text-xs text-[var(--color-mm-muted)] mt-0.5">
                    {m.strength}
                  </div>
                </div>
                <div className="text-sm text-[var(--color-mm-muted)] min-w-0 truncate">
                  {m.genericName ?? <span className="text-[var(--color-mm-subtle)]">—</span>}
                  {m.manufacturer && (
                    <div className="text-xs text-[var(--color-mm-subtle)] truncate">
                      {m.manufacturer}
                    </div>
                  )}
                </div>
                <div className="text-sm text-[var(--color-mm-muted)]">
                  <MedicineFormLabel form={m.form} />
                </div>
                <div>
                  {m.isActive ? (
                    <Badge tone="success">Active</Badge>
                  ) : (
                    <Badge tone="outline">Inactive</Badge>
                  )}
                </div>
                <div className="md:text-right">
                  <Button asChild variant="secondary" size="sm">
                    <Link
                      to="/admin/medicines/$medicineId"
                      params={{ medicineId: m.id }}
                    >
                      Open
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={
        'px-3 h-8 text-xs font-medium squircle border transition-colors ' +
        (active
          ? 'bg-[var(--color-mm-ink)] text-white border-[var(--color-mm-ink)]'
          : 'bg-white border-[var(--color-mm-line-strong)] text-[var(--color-mm-muted)] hover:border-[var(--color-mm-ink)]')
      }
    >
      {label}
    </button>
  )
}
