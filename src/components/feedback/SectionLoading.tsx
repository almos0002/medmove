import { cn } from '@/lib/utils'

/**
 * Inline skeleton block for sections inside a page (use `PageLoading` for
 * a centred whole-page spinner). Pure CSS, no JS.
 */
export function SectionLoading({
  rows = 3,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'space-y-2 bg-white border border-[var(--color-mm-line)] squircle-md p-5',
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-3 squircle-xs bg-[var(--color-mm-canvas)] animate-pulse"
          style={{ width: `${85 - i * 10}%` }}
        />
      ))}
    </div>
  )
}
