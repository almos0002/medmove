import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Badge — pill-shaped, friendly, soft-bordered. Used for status pills
 * and small attribute tags. Accent inverts to a filled teal pill.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium squircle whitespace-nowrap border bg-white',
  {
    variants: {
      tone: {
        neutral:
          'border-[var(--color-mm-line-strong)] text-[var(--color-mm-ink)]',
        accent:
          'border-[var(--color-mm-accent)] bg-[var(--color-mm-accent)] text-white',
        success: 'border-[var(--color-mm-ok)] text-[var(--color-mm-ok)]',
        warn: 'border-[var(--color-mm-warn)] text-[var(--color-mm-warn)]',
        danger: 'border-[var(--color-mm-bad)] text-[var(--color-mm-bad)]',
        outline:
          'border-[var(--color-mm-line-strong)] text-[var(--color-mm-subtle)]',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...rest }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...rest} />
}
