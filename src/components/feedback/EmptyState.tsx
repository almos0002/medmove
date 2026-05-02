import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-6 py-14 bg-[var(--color-mm-surface)] border border-dashed border-[var(--color-mm-line-strong)] squircle-md',
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center bg-[var(--color-mm-canvas)] squircle">
          <Icon className="h-6 w-6 text-[var(--color-mm-muted)]" />
        </div>
      )}
      <h3 className="text-base font-semibold text-[var(--color-mm-ink)]">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-[var(--color-mm-muted)]">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
