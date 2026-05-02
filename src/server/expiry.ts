/**
 * Step 12 — Expiry summary + scheduled scan.
 *
 *   - `getOrgExpirySummary(orgId)` is the read used by the org dashboard. It
 *     groups the org's batches into expired / critical / expiring_soon / safe
 *     and surfaces the top-N urgent batches with medicine + days-left.
 *
 *   - `runExpiryScan()` is the idempotent fan-out helper. It walks every
 *     org's not-yet-empty batches, classifies them, and inserts an
 *     `inventory.critical_expiry` (1–30 days) or `inventory.expiring_soon`
 *     (31–90 days) notification per (org, batch). The DB partial unique
 *     index `notifications_org_entity_type_uq` (created in
 *     `schema/notifications.ts`) backs ON CONFLICT DO NOTHING so re-running
 *     the scan never spams duplicates.
 *
 *   Wire `runExpiryScan` to a cron / scheduled task — see WORKFLOW.md.
 */
import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { inventoryBatches, medicines, organizations } from '@/lib/schema'
import {
  EXPIRY_THRESHOLDS,
  classifyExpiry,
  formatExpiryRelative,
} from '@/lib/expiry'
import { createForOrg, dispatchNotificationsAfterCommit } from './notifications'
import type { NotificationRow } from './notifications'

export type OrgExpirySummary = {
  orgId: string
  totals: {
    expired: number
    critical: number
    expiringSoon: number
    safe: number
    total: number
  }
  topExpiring: Array<{
    batchId: string
    medicineId: string
    medicineName: string
    medicineGenericName: string | null
    batchNumber: string
    expiryDate: string
    daysLeft: number
    quantityOnHand: number
    status: 'expired' | 'critical'
  }>
}

/**
 * Counts + an ordered list of the most-urgent batches for an org, used by
 * the org dashboard expiry surface. Includes safe batches in totals but the
 * top list focuses on the expired→soon end of the spectrum.
 */
export async function getOrgExpirySummary(
  orgId: string,
  topN = 8,
): Promise<OrgExpirySummary> {
  const rows = await db
    .select({
      batchId: inventoryBatches.id,
      medicineId: inventoryBatches.medicineId,
      medicineName: medicines.name,
      medicineGenericName: medicines.genericName,
      batchNumber: inventoryBatches.batchNumber,
      expiryDate: inventoryBatches.expiryDate,
      quantityOnHand: inventoryBatches.quantityOnHand,
    })
    .from(inventoryBatches)
    .innerJoin(medicines, eq(medicines.id, inventoryBatches.medicineId))
    .where(
      and(
        eq(inventoryBatches.organizationId, orgId),
        sql`${inventoryBatches.quantityOnHand} > 0`,
      ),
    )
    .orderBy(asc(inventoryBatches.expiryDate))

  const totals = { expired: 0, critical: 0, expiringSoon: 0, safe: 0, total: rows.length }
  const classified = rows.map((r) => {
    const c = classifyExpiry(r.expiryDate)
    if (c.status === 'expired') totals.expired += 1
    else if (c.status === 'critical') totals.critical += 1
    else if (c.status === 'expiring_soon') totals.expiringSoon += 1
    else totals.safe += 1
    return { ...r, ...c }
  })

  // Dashboard table highlights only urgent rows: EXPIRED + CRITICAL (≤ 30 days).
  const topExpiring = classified
    .filter(
      (r): r is typeof r & { status: 'expired' | 'critical' } =>
        r.status === 'expired' || r.status === 'critical',
    )
    .slice(0, topN)
  return { orgId, totals, topExpiring }
}

type ScanResult = {
  scannedOrgs: number
  scannedBatches: number
  inserted: { critical: number; expiringSoon: number }
}

/**
 * Sweep every org's non-empty inventory and (de-)dup-insert one notification
 * per batch in the critical / expiring_soon windows. Safe to call multiple
 * times — the partial unique index suppresses duplicates and the helper
 * returns counters so a cron/manual caller can log progress.
 *
 * Note: we deliberately do NOT emit `inventory.expired` from the scan here
 * (Step 12 MVP) — expired batches are blocked at the listing/transfer layer
 * already and a scan-emitted alert without an actionable workflow would be
 * noise. The type stays in the enum for future use.
 */
export async function runExpiryScan(): Promise<ScanResult> {
  const result: ScanResult = {
    scannedOrgs: 0,
    scannedBatches: 0,
    inserted: { critical: 0, expiringSoon: 0 },
  }
  const orgs = await db.select({ id: organizations.id }).from(organizations)
  result.scannedOrgs = orgs.length
  const created: NotificationRow[] = []

  for (const org of orgs) {
    const batches = await db
      .select({
        batchId: inventoryBatches.id,
        medicineId: inventoryBatches.medicineId,
        medicineName: medicines.name,
        batchNumber: inventoryBatches.batchNumber,
        expiryDate: inventoryBatches.expiryDate,
        quantityOnHand: inventoryBatches.quantityOnHand,
      })
      .from(inventoryBatches)
      .innerJoin(medicines, eq(medicines.id, inventoryBatches.medicineId))
      .where(
        and(
          eq(inventoryBatches.organizationId, org.id),
          sql`${inventoryBatches.quantityOnHand} > 0`,
          sql`${inventoryBatches.expiryDate} > CURRENT_DATE`,
          sql`${inventoryBatches.expiryDate} <= CURRENT_DATE + INTERVAL '${sql.raw(
            String(EXPIRY_THRESHOLDS.EXPIRING_SOON_DAYS),
          )} days'`,
        ),
      )
    result.scannedBatches += batches.length

    for (const b of batches) {
      const c = classifyExpiry(b.expiryDate)
      if (c.status !== 'critical' && c.status !== 'expiring_soon') continue
      const type =
        c.status === 'critical'
          ? 'inventory.critical_expiry'
          : 'inventory.expiring_soon'
      const severity = c.status === 'critical' ? 'critical' : 'warning'
      const title =
        c.status === 'critical'
          ? `Batch expires in ${c.daysLeft} day${c.daysLeft === 1 ? '' : 's'}`
          : `Batch expires in ${c.daysLeft} days`
      const body = `${b.medicineName} · batch ${b.batchNumber} · ${formatExpiryRelative(
        b.expiryDate,
      )}`
      const rows = await createForOrg({
        orgId: org.id,
        type,
        severity,
        title,
        body,
        entityType: 'inventory_batch',
        entityId: b.batchId,
        link: `/org/inventory/${b.batchId}`,
        metadata: {
          medicineId: b.medicineId,
          batchNumber: b.batchNumber,
          expiryDate: b.expiryDate,
          daysLeft: c.daysLeft,
          quantityOnHand: b.quantityOnHand,
        },
        dedupe: true,
      })
      if (rows.length > 0) {
        if (c.status === 'critical')
          result.inserted.critical += rows.length
        else result.inserted.expiringSoon += rows.length
        created.push(...rows)
      }
    }
  }

  void dispatchNotificationsAfterCommit(created)
  return result
}
