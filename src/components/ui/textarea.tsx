import * as React from 'react'
import { cn } from '@/lib/utils'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full min-h-[88px] px-3.5 py-2.5 text-sm bg-[var(--color-mm-surface)] border border-[var(--color-mm-line-strong)] squircle-sm text-[var(--color-mm-ink)] placeholder:text-[var(--color-mm-subtle)] focus-ring resize-y',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  )
})
