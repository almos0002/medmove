import * as React from 'react'
import { cn } from '@/lib/utils'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        'w-full text-[15px] bg-white text-[var(--color-mm-ink)] placeholder:text-black/35 px-3.5 py-3',
        'border border-[var(--color-mm-line-strong)] squircle-sm resize-none transition-colors',
        'hover:border-[var(--color-mm-ink)]',
        'focus:outline-none focus:border-[var(--color-mm-accent)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    />
  )
})
