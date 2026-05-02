import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-[var(--color-mm-line)] animate-pulse squircle-sm',
        className,
      )}
    />
  )
}
