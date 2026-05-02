import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * EmptyState — pure white surface bounded by a hairline border. The icon
 * sits in a small bordered square; the title is the editorial display serif.
 */
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
        'flex flex-col items-center justify-center text-center px-6 py-20 bg-white border border-[var(--color-mm-line-strong)] squircle-sm',
        className,
      )}
    >
      {Icon && (
        <div className="mb-6 inline-flex h-12 w-12 items-center justify-center bg-white border border-[var(--color-mm-line-strong)] squircle-xs">
          <Icon
            className="h-5 w-5 text-[var(--color-mm-ink)]"
            strokeWidth={1.5}
          />
        </div>
      )}
      <h3 className="font-display text-3xl text-[var(--color-mm-ink)] leading-none">
        {title}
      </h3>
      {description && (
        <p className="mt-3 max-w-sm text-sm text-[var(--color-mm-muted)] leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-7">{action}</div>}
    </div>
  )
}
