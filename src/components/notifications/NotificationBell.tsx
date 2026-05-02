import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck } from 'lucide-react'
import {
  countUnreadNotifications,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/server/functions/notifications'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { NotificationItem } from './NotificationItem'

const UNREAD_KEY = ['notifications', 'unread-count'] as const
const RECENT_KEY = ['notifications', 'recent'] as const

export function NotificationBell() {
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const unreadQuery = useQuery({
    queryKey: UNREAD_KEY,
    queryFn: () => countUnreadNotifications(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  })

  const recentQuery = useQuery({
    queryKey: RECENT_KEY,
    queryFn: () => listMyNotifications({ data: { unreadOnly: false, limit: 8 } }),
    enabled: open,
  })

  const markRead = useMutation({
    mutationFn: (id: string) =>
      markNotificationRead({ data: { notificationId: id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: UNREAD_KEY })
      void qc.invalidateQueries({ queryKey: RECENT_KEY })
    },
  })

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: UNREAD_KEY })
      void qc.invalidateQueries({ queryKey: RECENT_KEY })
    },
  })

  const unread = unreadQuery.data?.count ?? 0
  const items = recentQuery.data?.items ?? []

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
          className={cn(
            'relative inline-flex h-9 w-9 items-center justify-center squircle-xs',
            'border border-transparent hover:bg-black/[0.04] transition-colors',
          )}
        >
          <Bell className="h-4 w-4 text-[var(--color-mm-ink)]" strokeWidth={1.8} />
          {unread > 0 && (
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center',
                'text-[10px] font-semibold text-white bg-[var(--color-mm-accent)] rounded-full',
              )}
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[340px] max-w-[380px]">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="px-0 py-0 text-[12px] normal-case tracking-normal font-semibold text-[var(--color-mm-ink)]">
            Notifications
          </DropdownMenuLabel>
          <button
            type="button"
            disabled={unread === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
            className={cn(
              'inline-flex items-center gap-1 text-[11.5px] text-[var(--color-mm-accent)]',
              'disabled:text-[var(--color-mm-subtle)] disabled:cursor-not-allowed',
            )}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[420px] overflow-y-auto p-1">
          {recentQuery.isLoading && (
            <div className="px-3 py-6 text-center text-[12px] text-[var(--color-mm-subtle)]">
              Loading…
            </div>
          )}
          {!recentQuery.isLoading && items.length === 0 && (
            <div className="px-3 py-8 text-center text-[12.5px] text-[var(--color-mm-subtle)]">
              You’re all caught up.
            </div>
          )}
          {items.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkRead={(id) => markRead.mutate(id)}
              compact
            />
          ))}
        </div>
        <DropdownMenuSeparator />
        <div className="p-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={() => {
              setOpen(false)
              void navigate({ to: '/notifications' })
            }}
          >
            View all
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
