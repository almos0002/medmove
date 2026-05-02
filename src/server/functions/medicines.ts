import { createServerFn } from '@tanstack/react-start'
import { and, eq, ilike, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { medicines } from '@/lib/schema'
import { writeAudit } from '../audit'
import { getRequestContext } from '../context'
import { AppError, toClientError } from '../errors'
import { requireAuth } from '../guards/require-auth'
import { requireRole } from '../guards/require-role'
import {
  createMedicineSchema,
  listMedicinesSchema,
} from '../validators/medicines'

export const createMedicine = createServerFn({ method: 'POST', strict: { output: false } })
  .inputValidator((d: unknown) => createMedicineSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      requireRole(ctx, 'admin')

      // MVP guard: refuse controlled & cold-chain at the catalog edge.
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

export const listMedicines = createServerFn({ method: 'GET', strict: { output: false } })
  .inputValidator((d: unknown) => listMedicinesSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      requireAuth(ctx)

      const where = and(
        eq(medicines.isActive, true),
        data.search
          ? or(
              ilike(medicines.name, `%${data.search}%`),
              ilike(medicines.genericName, `%${data.search}%`),
            )
          : undefined,
      )
      const rows = await db
        .select()
        .from(medicines)
        .where(where)
        .limit(data.limit)
      return { ok: true as const, items: rows }
    } catch (e) {
      throw toClientError(e)
    }
  })
