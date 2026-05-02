import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Editorial page header — large display serif title, eyebrow above,
 * hairline rule below. No card, no shadow.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  /** Small uppercase label rendered above the title (e.g. "Workspace · Overview"). */
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-10 pb-6 border-b border-[var(--color-mm-line-strong)]',
        className,
      )}
    >
      {eyebrow && <div className="eyebrow mb-4">{eyebrow}</div>}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div className="min-w-0">
          <h1 className="font-display text-[clamp(36px,5vw,56px)] leading-[0.95] text-[var(--color-mm-ink)] tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-3 text-sm text-[var(--color-mm-muted)] max-w-xl leading-relaxed">
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
