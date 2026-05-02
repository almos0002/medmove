import { z } from 'zod'

export const uuid = z.string().uuid()
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
export const positiveInt = z.number().int().positive()
export const nonNegativeInt = z.number().int().nonnegative()
export const nonEmpty = (max = 200) => z.string().trim().min(1).max(max)
