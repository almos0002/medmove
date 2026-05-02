import * as React from 'react'
import * as RLabel from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

/**
 * Label — friendly, regular-case, sentence-case. Sits above inputs
 * in form layouts. No uppercase tracking.
 */
export const Label = React.forwardRef<
  React.ElementRef<typeof RLabel.Root>,
  React.ComponentPropsWithoutRef<typeof RLabel.Root>
>(function Label({ className, ...rest }, ref) {
  return (
    <RLabel.Root
      ref={ref}
      className={cn(
        'block text-[13px] font-medium text-[var(--color-mm-ink)]',
        className,
      )}
      {...rest}
    />
  )
})
