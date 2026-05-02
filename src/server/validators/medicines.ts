import { z } from 'zod'
import { nonEmpty, uuid } from './_shared'

export const medicineFormSchema = z.enum([
  'tablet',
  'capsule',
  'syrup',
  'suspension',
  'injection',
  'cream',
  'ointment',
  'drops',
  'inhaler',
  'patch',
  'powder',
  'sachet',
  'other',
])

export const createMedicineSchema = z.object({
  name: nonEmpty(200),
  genericName: z.string().trim().max(200).optional(),
  strength: nonEmpty(60),
  form: medicineFormSchema,
  manufacturer: z.string().trim().max(200).optional(),
  atcCode: z.string().trim().max(20).optional(),
  isControlled: z.boolean().default(false),
  requiresColdChain: z.boolean().default(false),
  notes: z.string().trim().max(2000).optional(),
})

export const updateMedicineSchema = z.object({
  id: uuid,
  name: nonEmpty(200),
  genericName: z.string().trim().max(200).optional(),
  strength: nonEmpty(60),
  form: medicineFormSchema,
  manufacturer: z.string().trim().max(200).optional(),
  atcCode: z.string().trim().max(20).optional(),
  isActive: z.boolean(),
  notes: z.string().trim().max(2000).optional(),
})

export const listMedicinesSchema = z.object({
  search: z.string().trim().max(120).optional(),
  includeInactive: z.boolean().default(false),
  limit: z.number().int().positive().max(200).default(100),
})

export const getMedicineSchema = z.object({ id: uuid })
