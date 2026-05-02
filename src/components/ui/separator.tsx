import * as React from 'react'
import { cn } from '@/lib/utils'

export function Separator({
  className,
  orientation = 'horizontal',
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  orientation?: 'horizontal' | 'vertical'
}) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        'bg-[var(--color-mm-line-strong)]',
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full',
        className,
      )}
      {...rest}
    />
  )
}
