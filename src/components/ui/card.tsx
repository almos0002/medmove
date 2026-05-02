import * as React from 'react'
import { cn } from '@/lib/utils'

export function Card({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-[var(--color-mm-surface)] border border-[var(--color-mm-line)] squircle-md',
        className,
      )}
      {...rest}
    />
  )
}

export function CardHeader({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'px-6 py-5 border-b border-[var(--color-mm-line)]',
        className,
      )}
      {...rest}
    />
  )
}

export function CardTitle({
  className,
  ...rest
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        'text-base font-semibold text-[var(--color-mm-ink)]',
        className,
      )}
      {...rest}
    />
  )
}

export function CardDescription({
  className,
  ...rest
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-[var(--color-mm-muted)] mt-1', className)}
      {...rest}
    />
  )
}

export function CardContent({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6', className)} {...rest} />
}

export function CardFooter({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-t border-[var(--color-mm-line)] flex items-center gap-3',
        className,
      )}
      {...rest}
    />
  )
}
