import { z } from 'zod'
import { uuid } from './_shared'

export const listMyNotificationsSchema = z.object({
  unreadOnly: z.boolean().default(false),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().min(0).default(0),
})

export const markNotificationReadSchema = z.object({
  notificationId: uuid,
})

export const orgIdSchema = z.object({
  organizationId: uuid,
})
