import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Card — friendly white surface with soft border and squircle corners.
 * No shadows.
 */
export function Card({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-white border border-[var(--color-mm-line-strong)] squircle-md',
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
        'font-display text-[20px] text-[var(--color-mm-ink)] leading-tight',
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
      className={cn(
        'text-[14px] text-[var(--color-mm-subtle)] mt-1.5 leading-relaxed',
        className,
      )}
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
