import * as React from 'react'
import { Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Reporting-dashboard metric tile. Optional `to` link makes the whole card a
 * navigation surface (used to deep-link from a metric to its filtered list).
 */
export function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'neutral',
  to,
  search,
  params,
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: 'neutral' | 'accent' | 'warn' | 'danger' | 'success'
  to?: string
  search?: Record<string, unknown>
  params?: Record<string, string>
}) {
  const toneClasses: Record<typeof tone, string> = {
    neutral: 'bg-[var(--color-mm-canvas)] text-[var(--color-mm-muted)]',
    accent: 'bg-[var(--color-mm-accent)] text-white',
    warn:
      'bg-[var(--color-mm-warn-soft)] text-[var(--color-mm-warn)] border border-[var(--color-mm-warn)]',
    danger:
      'bg-[var(--color-mm-bad-soft)] text-[var(--color-mm-bad)] border border-[var(--color-mm-bad)]',
    success:
      'bg-[var(--color-mm-ok-soft)] text-[var(--color-mm-ok)] border border-[var(--color-mm-ok)]',
  }
  const inner = (
    <Card className="h-full">
      <CardContent className="flex items-start gap-3">
        <div
          className={cn(
            'h-9 w-9 inline-flex items-center justify-center squircle-sm shrink-0',
            toneClasses[tone],
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.7} />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-[var(--color-mm-subtle)]">
            {label}
          </div>
          <div className="text-[26px] font-semibold text-[var(--color-mm-ink)] mt-1 leading-none break-words">
            {value}
          </div>
          {hint && (
            <div className="text-[11.5px] text-[var(--color-mm-subtle)] mt-1.5 leading-snug">
              {hint}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
  if (!to) return inner
  return (
    <Link
      to={to}
      search={search as never}
      params={params as never}
      className="block hover:opacity-95 transition-opacity"
    >
      {inner}
    </Link>
  )
}
