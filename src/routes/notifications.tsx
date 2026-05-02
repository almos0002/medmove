import * as React from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCheck, ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { ADMIN_ROLES, ROLES } from '@/lib/permissions'
import { getServerSession } from '@/server/functions/session'
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/server/functions/notifications'
import { Button } from '@/components/ui/button'
import { AppShell } from '@/components/layout/AppShell'
import type { ShellSection } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageError } from '@/components/feedback/PageError'
import { PageLoading } from '@/components/feedback/PageLoading'
import { EmptyState } from '@/components/feedback/EmptyState'
import { NotificationItem } from '@/components/notifications/NotificationItem'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
] as const
type Filter = (typeof FILTERS)[number]['id']

const PAGE_SIZE = 20

function sectionForRole(role: string | null | undefined): ShellSection {
  if (!role) return 'app'
  if ((ADMIN_ROLES as readonly string[]).includes(role)) return 'admin'
  if (role === ROLES.LOGISTICS_STAFF) return 'logistics'
  return 'app'
}

export const Route = createFileRoute('/notifications')({
  beforeLoad: async () => {
    const session = await getServerSession()
    if (!session.user) {
      throw redirect({ to: '/sign-in', search: {} })
    }
    return { session }
  },
  loader: async () => {
    return await listMyNotifications({
      data: { unreadOnly: false, limit: PAGE_SIZE, offset: 0 },
    })
  },
  pendingComponent: PageLoading,
  errorComponent: ({ error, reset }) => (
    <PageError error={error} reset={reset} />
  ),
  component: NotificationsPage,
})

function NotificationsPage() {
  const { session } = Route.useRouteContext()
  const initial = Route.useLoaderData()
  const qc = useQueryClient()
  const [filter, setFilter] = React.useState<Filter>('all')
  const [page, setPage] = React.useState(0)
  const section = sectionForRole(session.user?.role)

  // Reset page whenever the filter switches so the user lands on page 1.
  React.useEffect(() => {
    setPage(0)
  }, [filter])

  const offset = page * PAGE_SIZE

  const listQuery = useQuery({
    queryKey: ['notifications', 'page', filter, page],
    queryFn: () =>
      listMyNotifications({
        data: {
          unreadOnly: filter === 'unread',
          limit: PAGE_SIZE,
          offset,
        },
      }),
    initialData: filter === 'all' && page === 0 ? initial : undefined,
  })

  const markRead = useMutation({
    mutationFn: (id: string) =>
      markNotificationRead({ data: { notificationId: id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const items = listQuery.data?.items ?? []
  const total = listQuery.data?.total ?? 0
  const unreadOnPage = items.filter((n) => !n.readAt).length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const start = total === 0 ? 0 : offset + 1
  const end = Math.min(offset + items.length, total)

  return (
    <AppShell section={section} session={session}>
      <div className="space-y-6">
        <PageHeader
          title="Notifications"
          description="Recent activity across your organization, transfers and deliveries."
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => markAll.mutate()}
              disabled={unreadOnPage === 0 || markAll.isPending}
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          }
        />

        <div className="flex items-center gap-1 border-b border-[var(--color-mm-line)]">
          {FILTERS.map((f) => {
            const active = filter === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={
                  'relative px-3 py-2 text-[13px] font-medium transition-colors ' +
                  (active
                    ? 'text-[var(--color-mm-ink)]'
                    : 'text-[var(--color-mm-subtle)] hover:text-[var(--color-mm-muted)]')
                }
              >
                {f.label}
                {active && (
                  <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-[var(--color-mm-accent)]" />
                )}
              </button>
            )
          })}
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            description="You'll see updates here when there's activity on your organization, transfers or deliveries."
          />
        ) : (
          <>
            <div className="border border-[var(--color-mm-line)] squircle-md bg-white divide-y divide-[var(--color-mm-line)]">
              {items.map((n) => (
                <div key={n.id} className="px-1 py-1">
                  <NotificationItem
                    notification={n}
                    onMarkRead={(id) => markRead.mutate(id)}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-[12px] text-[var(--color-mm-subtle)]">
              <div>
                Showing <span className="text-[var(--color-mm-ink)] font-medium">{start}</span>
                –<span className="text-[var(--color-mm-ink)] font-medium">{end}</span> of{' '}
                <span className="text-[var(--color-mm-ink)] font-medium">{total}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || listQuery.isFetching}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="px-2 text-[var(--color-mm-muted)] tabular-nums">
                  Page {page + 1} of {totalPages}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page + 1 >= totalPages || listQuery.isFetching}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
