import * as React from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Reusable filter toolbar used on top of every TanStack Table list page.
 * Layout is two rows of grid cells: a leading search field, then any number
 * of filter children, then a `Clear` button on the trailing edge.
 *
 * Pure layout — does not own any state. Consumers wire each child to URL
 * search params via `Route.useSearch()`.
 *
 *   <TableToolbar
 *     search={searchValue}
 *     onSearchChange={(v) => navigate({ search: { ...s, q: v, page: 1 } })}
 *     hasFilters={hasFilters}
 *     onClear={() => navigate({ search: {} })}
 *   >
 *     <Select ... />
 *     <Select ... />
 *   </TableToolbar>
 */
export type TableToolbarProps = {
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  hasFilters?: boolean
  onClear?: () => void
  children?: React.ReactNode
  className?: string
  /** Visible label slot on the right (e.g. "12 results"). */
  trailing?: React.ReactNode
}

export function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  hasFilters,
  onClear,
  children,
  className,
  trailing,
}: TableToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 bg-white border border-[var(--color-mm-line)] squircle-md p-4',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        {onSearchChange && (
          <div className="relative flex-1 min-w-[220px]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-mm-subtle)]"
              strokeWidth={1.6}
            />
            <Input
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>
        )}
        {trailing && (
          <div className="text-xs text-[var(--color-mm-subtle)] ml-auto">
            {trailing}
          </div>
        )}
        {hasFilters && onClear && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="ml-auto"
          >
            <X className="h-3.5 w-3.5" />
            Clear filters
          </Button>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2.5">{children}</div>
      )}
    </div>
  )
}
