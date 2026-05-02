import { format } from 'date-fns'
import type { LucideIcon } from 'lucide-react'
import {
  CalendarClock,
  CheckCircle2,
  Package,
  PackageCheck,
  PackagePlus,
  Truck,
  AlertTriangle,
  Ban,
  XCircle,
  UserCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type DeliveryEvent = {
  id: string
  label: string
  at: Date | string | null | undefined
  icon?: LucideIcon
  detail?: string | null
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'accent'
}

const TONE_CLASS: Record<NonNullable<DeliveryEvent['tone']>, string> = {
  neutral: 'bg-[var(--color-mm-canvas)] text-[var(--color-mm-ink)]',
  good: 'bg-[var(--color-mm-ok-soft)] text-[var(--color-mm-ok)]',
  warn: 'bg-[var(--color-mm-warn-soft)] text-[var(--color-mm-warn)]',
  bad: 'bg-[var(--color-mm-bad-soft)] text-[var(--color-mm-bad)]',
  accent: 'bg-[var(--color-mm-accent-soft)] text-[var(--color-mm-accent)]',
}

export function DeliveryTimeline({ events }: { events: DeliveryEvent[] }) {
  const filtered = events.filter((e) => !!e.at)
  if (filtered.length === 0) {
    return (
      <p className="text-sm text-[var(--color-mm-subtle)]">
        No timeline events yet.
      </p>
    )
  }
  return (
    <ol className="space-y-4">
      {filtered.map((e, i) => {
        const Icon = e.icon ?? CheckCircle2
        const tone = e.tone ?? 'neutral'
        const isLast = i === filtered.length - 1
        return (
          <li key={e.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'h-8 w-8 inline-flex items-center justify-center squircle-xs',
                  TONE_CLASS[tone],
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              {!isLast && (
                <span className="flex-1 w-px bg-[var(--color-mm-line)] mt-1 mb-1 min-h-[12px]" />
              )}
            </div>
            <div className="flex-1 pb-1">
              <div className="text-[14px] font-medium text-[var(--color-mm-ink)]">
                {e.label}
              </div>
              <div className="text-xs text-[var(--color-mm-subtle)] mt-0.5">
                {format(new Date(e.at as Date | string), 'd MMM yyyy, HH:mm')}
              </div>
              {e.detail && (
                <div className="text-[13px] text-[var(--color-mm-muted)] mt-1.5 whitespace-pre-wrap">
                  {e.detail}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export const DELIVERY_TIMELINE_ICONS = {
  created: PackagePlus,
  assigned: UserCheck,
  pickupScheduled: CalendarClock,
  pickedUp: Package,
  inTransit: Truck,
  delivered: PackageCheck,
  failed: AlertTriangle,
  cancelled: Ban,
  disputed: XCircle,
} as const
