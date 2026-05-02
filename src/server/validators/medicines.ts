import { z } from 'zod'
import { nonEmpty } from './_shared'

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

export const listMedicinesSchema = z.object({
  search: z.string().trim().max(120).optional(),
  limit: z.number().int().positive().max(100).default(50),
})
