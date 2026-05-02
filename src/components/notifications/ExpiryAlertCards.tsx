import { Link } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OrgExpirySummary } from '@/server/expiry'

type Tone = 'danger' | 'warn' | 'accent' | 'neutral'

const TONE_STYLES: Record<Tone, string> = {
  danger:
    'border-[var(--color-mm-danger,#a31818)]/25 bg-[var(--color-mm-danger-soft,#fdecec)] text-[var(--color-mm-danger,#a31818)]',
  warn: 'border-[var(--color-mm-warn)]/25 bg-[var(--color-mm-warn-soft)] text-[var(--color-mm-warn)]',
  accent:
    'border-[var(--color-mm-line)] bg-white text-[var(--color-mm-accent)]',
  neutral: 'border-[var(--color-mm-line)] bg-white text-[var(--color-mm-muted)]',
}

export function ExpiryAlertCards({
  totals,
  inventoryHref = '/org/inventory',
}: {
  totals: OrgExpirySummary['totals']
  inventoryHref?: string
}) {
  const cards = [
    {
      key: 'expired',
      label: 'Expired',
      value: totals.expired,
      icon: XCircle,
      tone: 'danger' as Tone,
      hint: 'Quarantine and dispose',
      filter: 'expired',
    },
    {
      key: 'critical',
      label: '≤ 30 days',
      value: totals.critical,
      icon: AlertTriangle,
      tone: 'warn' as Tone,
      hint: 'Critical — list or transfer now',
      filter: 'critical',
    },
    {
      key: 'expiring_soon',
      label: '31–90 days',
      value: totals.expiringSoon,
      icon: Clock,
      tone: 'accent' as Tone,
      hint: 'Plan a redistribution',
      filter: 'expiring_soon',
    },
    {
      key: 'safe',
      label: '> 90 days',
      value: totals.safe,
      icon: CheckCircle2,
      tone: 'neutral' as Tone,
      hint: 'No action needed',
      filter: undefined,
    },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => {
        const Icon = c.icon
        const inner = (
          <div
            className={cn(
              'squircle-md border p-4 transition-colors',
              TONE_STYLES[c.tone],
              c.filter && 'hover:bg-black/[0.04]',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                {c.label}
              </span>
              <Icon className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div className="mt-2 text-[28px] font-semibold leading-none text-[var(--color-mm-ink)]">
              {c.value}
            </div>
            <div className="mt-1 text-[11.5px] text-[var(--color-mm-subtle)]">
              {c.hint}
            </div>
          </div>
        )
        return c.filter ? (
          <Link
            key={c.key}
            to={inventoryHref}
            search={{ expiryWindow: c.filter } as never}
            className="block"
          >
            {inner}
          </Link>
        ) : (
          <div key={c.key}>{inner}</div>
        )
      })}
    </div>
  )
}
