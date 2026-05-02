/**
 * Date / time formatting helpers used across the dashboard.
 *
 * Re-exports the expiry classification helpers from `./expiry` so callers
 * can `import { formatDate, formatExpiryRelative } from '@/lib/dates'`.
 */
export {
  classifyExpiry,
  daysUntilExpiry,
  formatExpiryRelative,
  EXPIRY_THRESHOLDS,
  type ExpiryStatus,
} from './expiry'

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function toDate(input: Date | string | number | null | undefined): Date | null {
  if (input === null || input === undefined) return null
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input
  const d = new Date(input)
  return Number.isNaN(d.getTime()) ? null : d
}

/** "01 May 2026". Empty string when input is null/invalid. */
export function formatDate(input: Date | string | number | null | undefined): string {
  const d = toDate(input)
  return d ? dateFormatter.format(d) : ''
}

/** "01 May 2026, 14:32". Empty string when input is null/invalid. */
export function formatDateTime(
  input: Date | string | number | null | undefined,
): string {
  const d = toDate(input)
  return d ? dateTimeFormatter.format(d) : ''
}

/**
 * Short relative time — "2 minutes ago", "in 3 days", "just now".
 * Falls back to absolute date for differences greater than 30 days.
 */
const UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
  { unit: 'second', ms: 1000 },
]

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function formatRelative(
  input: Date | string | number | null | undefined,
  now: Date = new Date(),
): string {
  const d = toDate(input)
  if (!d) return ''
  const diff = d.getTime() - now.getTime()
  const abs = Math.abs(diff)
  if (abs < 5_000) return 'just now'
  if (abs > UNITS[1].ms) {
    return formatDate(d)
  }
  for (const { unit, ms } of UNITS) {
    if (abs >= ms) {
      const value = Math.round(diff / ms)
      return rtf.format(value, unit)
    }
  }
  return 'just now'
}

/** ISO `YYYY-MM-DD` (UTC) — useful for `<input type="date">` defaults. */
export function toISODate(input: Date | string | null | undefined): string {
  const d = toDate(input)
  if (!d) return ''
  return d.toISOString().slice(0, 10)
}
