import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, ilike, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { medicines } from '@/lib/schema'
import { isAdminRole } from '@/lib/permissions'
import { writeAudit } from '../audit'
import { getRequestContext } from '../context'
import { AppError, toClientError } from '../errors'
import { requireAuth } from '../guards/require-auth'
import { requireAdmin } from '../guards/require-admin'
import {
  createMedicineSchema,
  getMedicineSchema,
  listMedicinesSchema,
  updateMedicineSchema,
} from '../validators/medicines'

/**
 * Admin: create a new entry in the medicine catalog.
 *
 * Safety:
 *   - Admin-only (writes to a shared catalog used by every seller).
 *   - Refuses controlled or cold-chain entries — these are MVP-blocked at the
 *     batch layer too, but blocking at catalog edge keeps the UI tidy.
 */
export const createMedicine = createServerFn({ method: 'POST', strict: { output: false } })
  .inputValidator((d: unknown) => createMedicineSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      requireAdmin(ctx)

      if (data.isControlled) {
        throw new AppError(
          'CONTROLLED_DRUG',
          'Controlled drugs are not allowed in MVP',
        )
      }
      if (data.requiresColdChain) {
        throw new AppError(
          'COLD_CHAIN_DRUG',
          'Cold-chain drugs are not allowed in MVP',
        )
      }

      const created = await db.transaction(async (tx) => {
        const [m] = await tx
          .insert(medicines)
          .values({
            name: data.name,
            genericName: data.genericName ?? null,
            strength: data.strength,
            form: data.form,
            manufacturer: data.manufacturer ?? null,
            atcCode: data.atcCode ?? null,
            isControlled: false,
            requiresColdChain: false,
            notes: data.notes ?? null,
          })
          .returning()

        await writeAudit({
          ctx,
          tx,
          action: 'medicine.created',
          entityType: 'medicine',
          entityId: m.id,
          after: m as unknown as Record<string, unknown>,
        })
        return m
      })

      return { ok: true as const, medicine: created }
    } catch (e) {
      throw toClientError(e)
    }
  })

/**
 * Admin: update an existing catalog entry. Tracks before/after for audit.
 * `isActive=false` soft-disables the medicine — sellers can no longer create
 * new batches against it, but existing batches/listings remain.
 */
export const updateMedicine = createServerFn({ method: 'POST', strict: { output: false } })
  .inputValidator((d: unknown) => updateMedicineSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      requireAdmin(ctx)

      const [before] = await db
        .select()
        .from(medicines)
        .where(eq(medicines.id, data.id))
        .limit(1)
      if (!before) throw new AppError('NOT_FOUND', 'Medicine not found')

      const updated = await db.transaction(async (tx) => {
        const [m] = await tx
          .update(medicines)
          .set({
            name: data.name,
            genericName: data.genericName ?? null,
            strength: data.strength,
            form: data.form,
            manufacturer: data.manufacturer ?? null,
            atcCode: data.atcCode ?? null,
            isActive: data.isActive,
            notes: data.notes ?? null,
          })
          .where(eq(medicines.id, data.id))
          .returning()

        await writeAudit({
          ctx,
          tx,
          action: 'medicine.updated',
          entityType: 'medicine',
          entityId: m.id,
          before: before as unknown as Record<string, unknown>,
          after: m as unknown as Record<string, unknown>,
        })
        return m
      })

      return { ok: true as const, medicine: updated }
    } catch (e) {
      throw toClientError(e)
    }
  })

/**
 * List the medicine catalog. Any authenticated user can list active entries
 * (sellers need the catalog to create batches). `includeInactive=true` is
 * gated to admins only.
 */
export const listMedicines = createServerFn({ method: 'GET', strict: { output: false } })
  .inputValidator((d: unknown) => listMedicinesSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const actor = requireAuth(ctx)

      if (data.includeInactive && !isAdminRole(actor.role)) {
        throw new AppError(
          'FORBIDDEN',
          'Only admins can list inactive catalog entries',
        )
      }

      const where = and(
        data.includeInactive ? undefined : eq(medicines.isActive, true),
        data.search
          ? or(
              ilike(medicines.name, `%${data.search}%`),
              ilike(medicines.genericName, `%${data.search}%`),
              ilike(medicines.manufacturer, `%${data.search}%`),
            )
          : undefined,
      )
      const rows = await db
        .select()
        .from(medicines)
        .where(where)
        .orderBy(desc(medicines.createdAt))
        .limit(data.limit)
      return { ok: true as const, items: rows, total: rows.length }
    } catch (e) {
      throw toClientError(e)
    }
  })

/** Fetch a single medicine. Auth-only; admins see inactive too. */
export const getMedicine = createServerFn({ method: 'GET', strict: { output: false } })
  .inputValidator((d: unknown) => getMedicineSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const actor = requireAuth(ctx)

      const [m] = await db
        .select()
        .from(medicines)
        .where(eq(medicines.id, data.id))
        .limit(1)
      if (!m) throw new AppError('NOT_FOUND', 'Medicine not found')
      if (!m.isActive && !isAdminRole(actor.role)) {
        throw new AppError('NOT_FOUND', 'Medicine not found')
      }
      return { ok: true as const, medicine: m }
    } catch (e) {
      throw toClientError(e)
    }
  })
