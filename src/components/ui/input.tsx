import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Input — boxed, Airbnb-style. Squircle corners, soft border that
 * deepens on hover, accent ring on focus. White surface, no shadow.
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
        'w-full h-12 px-4 text-[15px] bg-white text-[var(--color-mm-ink)] placeholder:text-[var(--color-mm-subtle)]',
        'border border-[var(--color-mm-line-strong)] squircle-sm transition-colors',
        'hover:border-[var(--color-mm-ink)]',
        'focus:outline-none focus:border-[var(--color-mm-accent)] focus:ring-2 focus:ring-[var(--color-mm-accent)]/20',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  )
})
