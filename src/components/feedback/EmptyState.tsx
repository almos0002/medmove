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
        'flex flex-col items-center justify-center text-center px-6 py-16 bg-white border border-[var(--color-mm-line-strong)] squircle-md',
        className,
      )}
    >
      {Icon && (
        <div className="mb-5 inline-flex h-12 w-12 items-center justify-center bg-white border border-[var(--color-mm-line-strong)] squircle-sm">
          <Icon
            className="h-5 w-5 text-[var(--color-mm-ink)]"
            strokeWidth={1.6}
          />
        </div>
      )}
      <h3 className="font-display text-[20px] text-[var(--color-mm-ink)] leading-tight">
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-md text-[14px] text-[var(--color-mm-subtle)] leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
