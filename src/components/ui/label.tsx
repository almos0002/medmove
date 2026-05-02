import * as React from 'react'
import * as RLabel from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

/**
 * Label = editorial eyebrow style: small, uppercase, wide-tracked. Pairs
 * naturally with the underline-style Input below it.
 */
export const Label = React.forwardRef<
  HTMLLabelElement,
  React.ComponentPropsWithoutRef<typeof RLabel.Root>
>(function Label({ className, ...rest }, ref) {
  return (
    <RLabel.Root
      ref={ref}
      className={cn(
        'block text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-mm-ink)]',
        className,
      )}
      {...rest}
    />
  )
})
