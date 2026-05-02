import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, type = 'text', ...rest }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'w-full h-10 px-3.5 text-sm bg-[var(--color-mm-surface)] border border-[var(--color-mm-line-strong)] squircle-sm text-[var(--color-mm-ink)] placeholder:text-[var(--color-mm-subtle)] focus-ring',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  )
})
