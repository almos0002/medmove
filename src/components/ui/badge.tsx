import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium squircle whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral:
          'bg-[var(--color-mm-cool-soft)] text-[var(--color-mm-cool)]',
        accent:
          'bg-[var(--color-mm-accent-soft)] text-[var(--color-mm-accent)]',
        success:
          'bg-[var(--color-mm-ok-soft)] text-[var(--color-mm-ok)]',
        warn: 'bg-[var(--color-mm-warn-soft)] text-[var(--color-mm-warn)]',
        danger: 'bg-[var(--color-mm-bad-soft)] text-[var(--color-mm-bad)]',
        outline:
          'bg-transparent border border-[var(--color-mm-line-strong)] text-[var(--color-mm-muted)]',
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
