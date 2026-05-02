import * as React from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MARKETPLACE_EXPIRY_WINDOW_FILTERS,
  MARKETPLACE_LISTING_TYPE_FILTERS,
  MARKETPLACE_QUANTITY_FILTERS,
  MARKETPLACE_SORT_OPTIONS,
  type MarketplaceSortValue,
} from '@/components/data/ListingStatusBadge'
import { MEDICINE_FORMS } from '@/components/data/MedicineFormLabel'
import type { ListingTypeValue } from '@/components/data/ListingStatusBadge'

const ALL = '__all__'
const DEBOUNCE_MS = 300

export type MarketplaceFiltersValue = {
  q?: string
  city?: string
  form?: string
  type?: ListingTypeValue
  expiry?: 'critical' | 'expiring_soon' | 'safe'
  minQty?: number
  sort?: MarketplaceSortValue
}

export type MarketplaceFiltersChange = <K extends keyof MarketplaceFiltersValue>(
  key: K,
  value: MarketplaceFiltersValue[K] | undefined,
) => void

/**
 * Reusable, URL-driven filter bar for the discovery page. Holds search,
 * city, medicine form, listing type, expiry window, minimum quantity, and
 * sort selector. View-mode toggle and pagination are owned by the page.
 *
 * `q` and `city` use a small debounced controller so URL state stays the
 * source of truth (back / forward / shareable links) without firing a
 * loader request on every keystroke.
 */
export function MarketplaceFilters({
  value,
  hasFilters,
  onChange,
  onClear,
}: {
  value: MarketplaceFiltersValue
  hasFilters: boolean
  onChange: MarketplaceFiltersChange
  onClear: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_auto] gap-3">
        <DebouncedTextField
          icon
          placeholder="Search name, generic, strength, manufacturer, batch…"
          value={value.q ?? ''}
          onCommit={(v) => onChange('q', v ? v : undefined)}
        />
        <DebouncedTextField
          placeholder="Pickup city…"
          value={value.city ?? ''}
          onCommit={(v) => onChange('city', v ? v : undefined)}
        />
        <Select
          value={value.sort ?? 'expiry_asc'}
          onValueChange={(v) =>
            onChange(
              'sort',
              v === 'expiry_asc'
                ? undefined
                : (v as MarketplaceFiltersValue['sort']),
            )
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {MARKETPLACE_SORT_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={!hasFilters}
          className="self-center justify-self-start md:justify-self-auto"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <FilterField label="Form">
          <Select
            value={value.form ?? ALL}
            onValueChange={(v) =>
              onChange('form', v === ALL ? undefined : v)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Any form" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any form</SelectItem>
              {MEDICINE_FORMS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Type">
          <Select
            value={value.type ?? ALL}
            onValueChange={(v) =>
              onChange(
                'type',
                v === ALL ? undefined : (v as ListingTypeValue),
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Any type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any type</SelectItem>
              {MARKETPLACE_LISTING_TYPE_FILTERS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Expiry window">
          <Select
            value={value.expiry ?? ALL}
            onValueChange={(v) =>
              onChange(
                'expiry',
                v === ALL
                  ? undefined
                  : (v as MarketplaceFiltersValue['expiry']),
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Any expiry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any expiry</SelectItem>
              {MARKETPLACE_EXPIRY_WINDOW_FILTERS.map((w) => (
                <SelectItem key={w.value} value={w.value}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Min available">
          <Select
            value={value.minQty ? String(value.minQty) : ALL}
            onValueChange={(v) =>
              onChange('minQty', v === ALL ? undefined : Number(v))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Any quantity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any quantity</SelectItem>
              {MARKETPLACE_QUANTITY_FILTERS.map((q) => (
                <SelectItem key={q.value} value={String(q.value)}>
                  {q.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      </div>
    </div>
  )
}

function FilterField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] uppercase tracking-wide text-[var(--color-mm-subtle)]">
        {label}
      </Label>
      {children}
    </div>
  )
}

/**
 * Locally-controlled text input that debounces commits up to the parent.
 *
 * - The local draft mirrors `value` whenever the parent's value changes
 *   (back/forward navigation, Clear button, etc.), so URL stays the source
 *   of truth.
 * - Edits flush after `DEBOUNCE_MS` of inactivity, or immediately on blur /
 *   Enter, so the loader fires once per real intent — not once per keystroke.
 */
function DebouncedTextField({
  value,
  onCommit,
  placeholder,
  icon,
}: {
  value: string
  onCommit: (next: string) => void
  placeholder?: string
  icon?: boolean
}) {
  const [draft, setDraft] = React.useState(value)
  // Keep the latest committed value to avoid double-firing the same value.
  const lastCommittedRef = React.useRef(value)

  // Sync inbound prop changes (URL → input) without clobbering an in-flight
  // edit that's already equal.
  React.useEffect(() => {
    if (value !== lastCommittedRef.current) {
      setDraft(value)
      lastCommittedRef.current = value
    }
  }, [value])

  // Debounced commit.
  React.useEffect(() => {
    if (draft === lastCommittedRef.current) return
    const t = setTimeout(() => {
      lastCommittedRef.current = draft
      onCommit(draft.trim())
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [draft, onCommit])

  function flush() {
    if (draft !== lastCommittedRef.current) {
      lastCommittedRef.current = draft
      onCommit(draft.trim())
    }
  }

  if (icon) {
    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-mm-subtle)]" />
        <Input
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={flush}
          onKeyDown={(e) => {
            if (e.key === 'Enter') flush()
          }}
          className="pl-9"
        />
      </div>
    )
  }

  return (
    <Input
      placeholder={placeholder}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={flush}
      onKeyDown={(e) => {
        if (e.key === 'Enter') flush()
      }}
    />
  )
}
