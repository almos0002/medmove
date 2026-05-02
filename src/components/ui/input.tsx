import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Editorial input — bottom-rule field. Sits flush in the page (no card),
 * separated from siblings by hairline borders applied at the form level.
 * The visual cue is a single 1px underline that thickens on focus.
 */
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, type = 'text', ...rest }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'w-full h-11 px-0 text-[15px] bg-white text-[var(--color-mm-ink)] placeholder:text-black/35',
        'border-0 border-b border-[var(--color-mm-line-strong)] rounded-none transition-colors',
        'hover:border-[var(--color-mm-ink)]',
        'focus:outline-none focus:border-b-2 focus:border-[var(--color-mm-accent)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  )
})
