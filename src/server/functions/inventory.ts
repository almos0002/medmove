import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { inventoryBatches, medicines } from '@/lib/schema'
import { writeAudit } from '../audit'
import { getRequestContext } from '../context'
import { AppError, toClientError } from '../errors'
import { requireRole } from '../guards/require-role'
import { requireVerifiedOrg } from '../guards/require-verified-org'
import {
  createBatchSchema,
  listBatchesSchema,
} from '../validators/inventory'

export const createInventoryBatch = createServerFn({ method: 'POST', strict: { output: false } })
  .inputValidator((d: unknown) => createBatchSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      requireRole(ctx, 'seller')
      await requireVerifiedOrg(ctx, data.organizationId)

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

export const listInventoryBatches = createServerFn({ method: 'GET', strict: { output: false } })
  .inputValidator((d: unknown) => listBatchesSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      await requireVerifiedOrg(ctx, data.organizationId)

      const rows = await db
        .select()
        .from(inventoryBatches)
        .where(eq(inventoryBatches.organizationId, data.organizationId))
      return { ok: true as const, items: rows }
    } catch (e) {
      throw toClientError(e)
    }
  })
