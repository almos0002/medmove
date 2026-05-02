import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Card — pure white surface, hairline black border, sharper editorial
 * corners (squircle-sm). All inner separators are also pure black.
 */
export function Card({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-white border border-[var(--color-mm-line-strong)] squircle-sm',
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
        'px-6 py-5 border-b border-[var(--color-mm-line-strong)]',
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
        'font-display text-2xl text-[var(--color-mm-ink)] leading-none',
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
      className={cn('text-sm text-[var(--color-mm-muted)] mt-2', className)}
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
        'px-6 py-4 border-t border-[var(--color-mm-line-strong)] flex items-center gap-3',
        className,
      )}
      {...rest}
    />
  )
}
