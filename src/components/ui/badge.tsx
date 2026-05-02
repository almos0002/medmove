import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Badge: outline-only on white. The single `accent` tone is the one
 * exception — it inverts to a solid teal pill for active / "on" states.
 * No grays anywhere; tone differences are hue + label only.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] squircle whitespace-nowrap border bg-white',
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
          'border-[var(--color-mm-line-strong)] text-[var(--color-mm-ink)]',
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
