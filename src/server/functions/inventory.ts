import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, ilike, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { inventoryBatches, medicines, organizations } from '@/lib/schema'
import { CAPABILITIES, isAdminRole } from '@/lib/permissions'
import { classifyExpiry } from '@/lib/expiry'
import { writeAudit } from '../audit'
import { getRequestContext } from '../context'
import { AppError, toClientError } from '../errors'
import { requireAuth } from '../guards/require-auth'
import { requireCapability } from '../guards/require-capability'
import { requireOrgMember } from '../guards/require-org'
import {
  createBatchSchema,
  getBatchSchema,
  listBatchesSchema,
} from '../validators/inventory'

/**
 * Create an inventory batch. The orchestrating capability check is
 * `can_list_medicine` because batches are the prerequisite for listings —
 * if you can't list, you have no business stocking listable inventory.
 *
 * Hard rules enforced server-side (frontend validation is not enough):
 *   - Org must be verified AND have can_list_medicine.
 *   - Medicine must exist, be active, non-controlled, non-cold-chain.
 *   - Sealed status must be 'sealed' (no opened packs).
 *   - Storage must be non-refrigerated (MVP).
 *   - Expiry must be strictly in the future.
 */
export const createInventoryBatch = createServerFn({ method: 'POST', strict: { output: false } })
  .inputValidator((d: unknown) => createBatchSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      await requireCapability(
        ctx,
        data.organizationId,
        CAPABILITIES.CAN_LIST_MEDICINE,
      )

      const [med] = await db
        .select()
        .from(medicines)
        .where(eq(medicines.id, data.medicineId))
        .limit(1)
      if (!med) throw new AppError('NOT_FOUND', 'Medicine not found')
      if (!med.isActive)
        throw new AppError('CONFLICT', 'Medicine is not active')
      if (med.isControlled) {
        throw new AppError(
          'CONTROLLED_DRUG',
          'Controlled drugs cannot be stocked in MVP',
        )
      }
      if (med.requiresColdChain) {
        throw new AppError(
          'COLD_CHAIN_DRUG',
          'Cold-chain drugs cannot be stocked in MVP',
        )
      }

      if (data.sealedStatus === 'opened') {
        throw new AppError(
          'OPENED_PACKAGE',
          'Opened packages cannot be redistributed',
        )
      }
      if (data.storageType === 'refrigerated') {
        throw new AppError(
          'COLD_CHAIN_DRUG',
          'Refrigerated storage is not supported in MVP',
        )
      }

      const today = new Date().toISOString().slice(0, 10)
      if (data.expiryDate <= today) {
        throw new AppError(
          'EXPIRED_MEDICINE',
          'Cannot stock an already-expired batch',
        )
      }

      const created = await db.transaction(async (tx) => {
        const [b] = await tx
          .insert(inventoryBatches)
          .values({
            organizationId: data.organizationId,
            medicineId: data.medicineId,
            batchNumber: data.batchNumber,
            manufactureDate: data.manufactureDate ?? null,
            expiryDate: data.expiryDate,
            quantityOnHand: data.quantityOnHand,
            unit: data.unit,
            storageType: data.storageType,
            sealedStatus: data.sealedStatus,
            notes: data.notes ?? null,
          })
          .returning()

        await writeAudit({
          ctx,
          tx,
          action: 'inventory_batch.created',
          entityType: 'inventory_batch',
          entityId: b.id,
          after: b as unknown as Record<string, unknown>,
          actorOrgIdOverride: data.organizationId,
        })
        return b
      })

      return { ok: true as const, batch: created }
    } catch (e) {
      throw toClientError(e)
    }
  })

/**
 * List a single org's inventory batches with the medicine joined.
 *
 * - Auth: any org member of the organization, or an admin (admin bypasses
 *   org membership for support reasons).
 * - Capability: NOT required to read inventory — viewing is safe regardless
 *   of the org's current list/request flags.
 * - Filters (medicineSearch, batchNumber, sealedStatus, storageType) are
 *   applied SQL-side. `expiryStatus` is computed in the app layer because
 *   the breakpoints are in TS, not Postgres.
 */
export const listInventoryBatches = createServerFn({ method: 'GET', strict: { output: false } })
  .inputValidator((d: unknown) => listBatchesSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const actor = requireAuth(ctx)
      if (!isAdminRole(actor.role)) {
        await requireOrgMember(ctx, data.organizationId)
      }

      const where = and(
        eq(inventoryBatches.organizationId, data.organizationId),
        data.batchNumberSearch
          ? ilike(inventoryBatches.batchNumber, `%${data.batchNumberSearch}%`)
          : undefined,
        data.sealedStatus
          ? eq(inventoryBatches.sealedStatus, data.sealedStatus)
          : undefined,
        data.storageType
          ? eq(inventoryBatches.storageType, data.storageType)
          : undefined,
        data.medicineSearch
          ? or(
              ilike(medicines.name, `%${data.medicineSearch}%`),
              ilike(medicines.genericName, `%${data.medicineSearch}%`),
            )
          : undefined,
      )

      const rows = await db
        .select({
          batch: inventoryBatches,
          medicine: medicines,
        })
        .from(inventoryBatches)
        .innerJoin(medicines, eq(medicines.id, inventoryBatches.medicineId))
        .where(where)
        .orderBy(desc(inventoryBatches.createdAt))

      const items = data.expiryStatus
        ? rows.filter(
            (r) =>
              classifyExpiry(r.batch.expiryDate as unknown as string).status ===
              data.expiryStatus,
          )
        : rows

      return { ok: true as const, items, total: items.length }
    } catch (e) {
      throw toClientError(e)
    }
  })

/**
 * Fetch a single inventory batch with its medicine + owning org. Used by
 * the batch detail page. Org members of the owning org and admins may view.
 */
export const getInventoryBatch = createServerFn({ method: 'GET', strict: { output: false } })
  .inputValidator((d: unknown) => getBatchSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const actor = requireAuth(ctx)

      const [row] = await db
        .select({
          batch: inventoryBatches,
          medicine: medicines,
          organization: organizations,
        })
        .from(inventoryBatches)
        .innerJoin(medicines, eq(medicines.id, inventoryBatches.medicineId))
        .innerJoin(
          organizations,
          eq(organizations.id, inventoryBatches.organizationId),
        )
        .where(eq(inventoryBatches.id, data.id))
        .limit(1)

      if (!row) throw new AppError('NOT_FOUND', 'Inventory batch not found')
      if (!isAdminRole(actor.role)) {
        await requireOrgMember(ctx, row.batch.organizationId)
      }

      return { ok: true as const, ...row }
    } catch (e) {
      throw toClientError(e)
    }
  })
