import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { cn } from '@/lib/utils'

export type NotificationRowLike = {
  id: string
  type: string
  severity: 'info' | 'success' | 'warning' | 'critical'
  title: string
  body: string | null
  link: string | null
  createdAt: string | Date
  readAt: string | Date | null
}

const SEVERITY_ICON: Record<NotificationRowLike['severity'], LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  critical: XCircle,
}

const SEVERITY_TONE: Record<NotificationRowLike['severity'], string> = {
  info: 'text-[var(--color-mm-subtle)] bg-[var(--color-mm-canvas)]',
  success: 'text-[var(--color-mm-accent)] bg-[var(--color-mm-accent-soft,#e8f1ee)]',
  warning: 'text-[var(--color-mm-warn)] bg-[var(--color-mm-warn-soft)]',
  critical: 'text-[var(--color-mm-danger,#a31818)] bg-[var(--color-mm-danger-soft,#fdecec)]',
}

export function NotificationItem({
  notification,
  onMarkRead,
  compact,
}: {
  notification: NotificationRowLike
  onMarkRead?: (id: string) => void
  compact?: boolean
}) {
  const Icon = SEVERITY_ICON[notification.severity]
  const isRead = !!notification.readAt
  const created = new Date(notification.createdAt)
  const ago = formatDistanceToNowStrict(created, { addSuffix: true })
  const body = (
    <div className="flex items-start gap-3 min-w-0 w-full">
      <div
        className={cn(
          'h-8 w-8 squircle-xs inline-flex items-center justify-center shrink-0',
          SEVERITY_TONE[notification.severity],
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2 justify-between">
          <div
            className={cn(
              'text-[13px] font-medium leading-tight truncate',
              isRead
                ? 'text-[var(--color-mm-muted)]'
                : 'text-[var(--color-mm-ink)]',
            )}
          >
            {notification.title}
          </div>
          {!isRead && (
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--color-mm-accent)] shrink-0" />
          )}
        </div>
        {notification.body && (
          <div
            className={cn(
              'text-[12px] mt-0.5',
              compact ? 'line-clamp-2' : '',
              'text-[var(--color-mm-subtle)] break-words',
            )}
          >
            {notification.body}
          </div>
        )}
        <div className="text-[11px] text-[var(--color-mm-subtle)] mt-1">
          {ago}
        </div>
      </div>
    </div>
  )

  const handleClick = () => {
    if (!isRead) onMarkRead?.(notification.id)
  }

  if (notification.link) {
    return (
      <Link
        to={notification.link}
        onClick={handleClick}
        className={cn(
          'flex w-full px-3 py-2.5 squircle-xs hover:bg-black/[0.03] transition-colors',
        )}
      >
        {body}
      </Link>
    )
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'flex w-full text-left px-3 py-2.5 squircle-xs hover:bg-black/[0.03] transition-colors',
      )}
    >
      {body}
    </button>
  )
}
