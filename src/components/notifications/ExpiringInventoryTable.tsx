import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import type { OrgExpirySummary } from '@/server/expiry'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<
  OrgExpirySummary['topExpiring'][number]['status'],
  string
> = {
  expired: 'Expired',
  critical: '≤ 30 days',
}

const STATUS_TONE: Record<
  OrgExpirySummary['topExpiring'][number]['status'],
  string
> = {
  expired:
    'bg-[var(--color-mm-danger-soft,#fdecec)] text-[var(--color-mm-danger,#a31818)]',
  critical: 'bg-[var(--color-mm-warn-soft)] text-[var(--color-mm-warn)]',
}

export function ExpiringInventoryTable({
  rows,
}: {
  rows: OrgExpirySummary['topExpiring']
}) {
  if (rows.length === 0) {
    return (
      <div className="border border-[var(--color-mm-line)] squircle-md p-6 text-center text-[13px] text-[var(--color-mm-subtle)]">
        No batches in the expiry window — nothing urgent right now.
      </div>
    )
  }
  return (
    <div className="border border-[var(--color-mm-line)] squircle-md overflow-hidden bg-white">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-[var(--color-mm-canvas)] text-[11px] uppercase tracking-wide text-[var(--color-mm-subtle)]">
            <th className="text-left px-4 py-2.5 font-medium">Medicine</th>
            <th className="text-left px-4 py-2.5 font-medium">Batch</th>
            <th className="text-left px-4 py-2.5 font-medium">Expires</th>
            <th className="text-right px-4 py-2.5 font-medium">Qty</th>
            <th className="text-left px-4 py-2.5 font-medium">Status</th>
            <th className="text-right px-4 py-2.5 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.batchId}
              className="border-t border-[var(--color-mm-line)]"
            >
              <td className="px-4 py-3">
                <div className="font-medium text-[var(--color-mm-ink)]">
                  {r.medicineName}
                </div>
                {r.medicineGenericName && (
                  <div className="text-[11.5px] text-[var(--color-mm-subtle)]">
                    {r.medicineGenericName}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-[var(--color-mm-muted)]">
                {r.batchNumber}
              </td>
              <td className="px-4 py-3">
                <div className="text-[var(--color-mm-ink)]">{r.expiryDate}</div>
                <div className="text-[11.5px] text-[var(--color-mm-subtle)]">
                  {r.daysLeft <= 0
                    ? `Expired ${Math.abs(r.daysLeft)}d ago`
                    : `${r.daysLeft}d left`}
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-[var(--color-mm-ink)]">
                {r.quantityOnHand}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 squircle text-[11px] font-medium',
                    STATUS_TONE[r.status],
                  )}
                >
                  {STATUS_LABEL[r.status]}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  to="/org/inventory/$batchId"
                  params={{ batchId: r.batchId }}
                  className="inline-flex items-center gap-1 text-[12px] text-[var(--color-mm-accent)] hover:underline"
                >
                  View <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
