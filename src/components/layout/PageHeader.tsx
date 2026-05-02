import * as React from 'react'
import { cn } from '@/lib/utils'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-8 pb-6 border-b border-[var(--color-mm-line)]',
        className,
      )}
    >
      {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
        <div className="min-w-0">
          <h1 className="font-display text-[28px] sm:text-[32px] leading-tight text-[var(--color-mm-ink)] tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-[15px] text-[var(--color-mm-subtle)] max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  )
}
