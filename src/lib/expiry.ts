/**
 * Expiry classification used across inventory, listings and admin tooling.
 *
 *   - SAFE:           > 90 days until expiry
 *   - EXPIRING_SOON:  31–90 days
 *   - CRITICAL:       1–30 days
 *   - EXPIRED:        on or before today
 *
 * Pure date math — does not depend on locale or timezone, since expiry
 * dates are stored as ISO `YYYY-MM-DD` (date-only, no clock).
 */
export type ExpiryStatus = 'safe' | 'expiring_soon' | 'critical' | 'expired'

export const EXPIRY_THRESHOLDS = {
  CRITICAL_DAYS: 30,
  EXPIRING_SOON_DAYS: 90,
} as const

export function daysUntilExpiry(expiryDate: string, today = new Date()): number {
  const t = new Date(today.toISOString().slice(0, 10) + 'T00:00:00Z').getTime()
  const e = new Date(expiryDate + 'T00:00:00Z').getTime()
  return Math.round((e - t) / (1000 * 60 * 60 * 24))
}

export function classifyExpiry(
  expiryDate: string,
  today = new Date(),
): { status: ExpiryStatus; daysLeft: number } {
  const daysLeft = daysUntilExpiry(expiryDate, today)
  if (daysLeft <= 0) return { status: 'expired', daysLeft }
  if (daysLeft <= EXPIRY_THRESHOLDS.CRITICAL_DAYS)
    return { status: 'critical', daysLeft }
  if (daysLeft <= EXPIRY_THRESHOLDS.EXPIRING_SOON_DAYS)
    return { status: 'expiring_soon', daysLeft }
  return { status: 'safe', daysLeft }
}

export function formatExpiryRelative(expiryDate: string): string {
  const { status, daysLeft } = classifyExpiry(expiryDate)
  if (status === 'expired') {
    if (daysLeft === 0) return 'Expires today'
    return `Expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} ago`
  }
  if (daysLeft === 1) return 'Expires tomorrow'
  return `Expires in ${daysLeft} days`
}
