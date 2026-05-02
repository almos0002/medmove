import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { pageHead } from '@/lib/seo'
import { Building2, Search, X } from 'lucide-react'
import { z } from 'zod'
import { adminListOrganizations } from '@/server/functions/organizations'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoading } from '@/components/feedback/PageLoading'
import { PageError } from '@/components/feedback/PageError'
import { EmptyState } from '@/components/feedback/EmptyState'
import {
  VerificationStatusBadge,
  type OrgVerificationStatus,
} from '@/components/data/StatusBadge'
import { OrgTypeLabel } from '@/components/data/OrgTypeBadge'
import { CapabilityChipRow } from '@/components/data/CapabilityChip'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: undefined as OrgVerificationStatus | undefined, label: 'All' },
  { value: 'pending' as const, label: 'Pending' },
  { value: 'verified' as const, label: 'Verified' },
  { value: 'rejected' as const, label: 'Rejected' },
  { value: 'suspended' as const, label: 'Suspended' },
]

const searchSchema = z.object({
  status: z
    .enum(['pending', 'verified', 'rejected', 'suspended'])
    .optional(),
  q: z.string().optional(),
})

export const Route = createFileRoute('/admin/organizations/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ status: search.status, q: search.q }),
  loader: ({ deps }) =>
    adminListOrganizations({
      data: {
        status: deps.status,
        search: deps.q && deps.q.length > 0 ? deps.q : undefined,
        limit: 100,
      },
    }),
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  head: pageHead({ title: "Admin · Organizations", noindex: true }),
  component: AdminOrganizationsList,
})

function AdminOrganizationsList() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const data = Route.useLoaderData()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description={`${data.total} total · sorted by newest first`}
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map((opt) => {
            const active = search.status === opt.value
            return (
              <button
                key={opt.label}
                onClick={() =>
                  navigate({
                    search: (s) => ({ ...s, status: opt.value }),
                  })
                }
                className={cn(
                  'px-3 h-8 text-xs font-medium squircle border transition-colors',
                  active
                    ? 'bg-[var(--color-mm-ink)] text-white border-[var(--color-mm-ink)]'
                    : 'bg-[var(--color-mm-surface)] border-[var(--color-mm-line-strong)] text-[var(--color-mm-muted)] hover:border-[var(--color-mm-ink)]',
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-mm-subtle)]" />
          <Input
            placeholder="Search by name, licence, email…"
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
              onClick={() =>
                navigate({ search: (s) => ({ ...s, q: undefined }) })
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--color-mm-subtle)] hover:text-[var(--color-mm-ink)]"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {data.organizations.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No organizations match"
          description={
            search.q || search.status
              ? 'Try clearing the filters above.'
              : 'No organizations have signed up yet.'
          }
          action={
            search.q || search.status ? (
              <Button
                variant="secondary"
                onClick={() =>
                  navigate({ search: { status: undefined, q: undefined } })
                }
              >
                Clear filters
              </Button>
            ) : null
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1.2fr_auto] items-center gap-4 px-6 py-3 text-[11px] uppercase tracking-wide text-[var(--color-mm-subtle)] border-b border-[var(--color-mm-line)] bg-[var(--color-mm-canvas)]">
            <div>Organization</div>
            <div>Type</div>
            <div>Status</div>
            <div>Capabilities</div>
            <div className="text-right">Action</div>
          </div>
          <ul className="divide-y divide-[var(--color-mm-line)]">
            {data.organizations.map((org) => (
              <li
                key={org.id}
                className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1.2fr_auto] items-start md:items-center gap-3 md:gap-4 px-6 py-4"
              >
                <div className="min-w-0">
                  <Link
                    to="/admin/organizations/$orgId"
                    params={{ orgId: org.id }}
                    className="text-sm font-medium text-[var(--color-mm-ink)] hover:underline"
                  >
                    {org.name}
                  </Link>
                  <div className="text-xs text-[var(--color-mm-muted)] mt-0.5 truncate">
                    {org.contactEmail} · {org.city}, {org.country}
                  </div>
                  {org.pendingDocCount > 0 && (
                    <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-[var(--color-mm-warn)]">
                      {org.pendingDocCount} document(s) pending review
                    </div>
                  )}
                </div>
                <div className="text-sm text-[var(--color-mm-muted)] capitalize">
                  <OrgTypeLabel type={org.type} />
                </div>
                <div>
                  <VerificationStatusBadge
                    status={org.verificationStatus as OrgVerificationStatus}
                  />
                </div>
                <div>
                  <CapabilityChipRow
                    canListMedicine={org.canListMedicine}
                    canRequestMedicine={org.canRequestMedicine}
                    canDeliverMedicine={org.canDeliverMedicine}
                    showDisabled={false}
                  />
                </div>
                <div className="md:text-right">
                  <Button asChild variant="secondary" size="sm">
                    <Link
                      to="/admin/organizations/$orgId"
                      params={{ orgId: org.id }}
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
