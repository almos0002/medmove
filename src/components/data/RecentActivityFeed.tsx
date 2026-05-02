import * as React from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { Activity } from 'lucide-react'
import { AuditEventBadge } from '@/components/data/AuditEventBadge'
import { EmptyState } from '@/components/feedback/EmptyState'

type FeedRow = {
  log: {
    id: string
    action: string
    entityType: string
    entityId: string
    createdAt: Date | string
  }
  actorUser: {
    email: string | null
    name: string | null
  } | null
  actorOrg: {
    name: string | null
  } | null
}

/**
 * Compact recent-activity list for dashboards. Each row links to the
 * full event modal via `onSelect(id)` if provided.
 */
export function RecentActivityFeed({
  items,
  onSelect,
  emptyTitle = 'No activity yet',
  emptyDescription = 'Once people start using the platform, every meaningful action shows up here.',
}: {
  items: FeedRow[]
  onSelect?: (id: string) => void
  emptyTitle?: string
  emptyDescription?: string
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }
  return (
    <ul className="divide-y divide-[var(--color-mm-line)]">
      {items.map((row) => {
        const date = new Date(row.log.createdAt)
        const actor =
          row.actorUser?.email ?? row.actorUser?.name ?? 'System'
        const orgName = row.actorOrg?.name
        const Wrapper = ({ children }: { children: React.ReactNode }) =>
          onSelect ? (
            <button
              type="button"
              onClick={() => onSelect(row.log.id)}
              className="w-full text-left hover:bg-black/[0.02] transition-colors focus-ring squircle-sm"
            >
              {children}
            </button>
          ) : (
            <div>{children}</div>
          )
        return (
          <li key={row.log.id}>
            <Wrapper>
              <div className="px-4 py-3 flex items-start gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <AuditEventBadge action={row.log.action} />
                    <span
                      className="text-[12px] text-[var(--color-mm-subtle)]"
                      title={format(date, 'd MMM yyyy, HH:mm:ss')}
                    >
                      {formatDistanceToNow(date, { addSuffix: true })}
                    </span>
                  </div>
                  <div className="text-[13px] text-[var(--color-mm-muted)] truncate">
                    <span className="text-[var(--color-mm-ink)] font-medium">
                      {actor}
                    </span>
                    {orgName && (
                      <>
                        <span className="mx-1.5 text-[var(--color-mm-subtle)]">
                          ·
                        </span>
                        <span>{orgName}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Wrapper>
          </li>
        )
      })}
    </ul>
  )
}
