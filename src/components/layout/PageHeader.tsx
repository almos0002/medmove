import * as React from 'react'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-[var(--color-mm-ink)] tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[var(--color-mm-muted)]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
