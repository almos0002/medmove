import * as React from 'react'
import * as SwitchPrimitives from '@radix-ui/react-switch'
import { cn } from '@/lib/utils'

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(function Switch({ className, ...rest }, ref) {
  return (
    <SwitchPrimitives.Root
      ref={ref}
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center squircle border-2 border-transparent transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-[var(--color-mm-accent)] data-[state=unchecked]:bg-[var(--color-mm-line-strong)]',
        className,
      )}
      {...rest}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          'pointer-events-none block h-5 w-5 squircle bg-white transition-transform',
          'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
        )}
      />
    </SwitchPrimitives.Root>
  )
})
