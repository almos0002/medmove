/**
 * Step 12 — Inbox server functions.
 *
 * Every notification is persisted per recipient user (see
 * `src/server/notifications/index.ts`), so visibility is simply
 * `recipient_user_id = me` and read state is per-user out of the box.
 */
import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { notifications } from '@/lib/schema'
import { getRequestContext } from '../context'
import { AppError, toClientError } from '../errors'
import { requireAuth } from '../guards/require-auth'
import {
  listMyNotificationsSchema,
  markNotificationReadSchema,
} from '../validators/notifications'

export const listMyNotifications = createServerFn({
  method: 'GET',
  strict: { output: false },
})
  .inputValidator((d: unknown) => listMyNotificationsSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const actor = requireAuth(ctx)
      const where = data.unreadOnly
        ? and(
            eq(notifications.recipientUserId, actor.id),
            isNull(notifications.readAt),
          )
        : eq(notifications.recipientUserId, actor.id)
      const rows = await db
        .select()
        .from(notifications)
        .where(where)
        .orderBy(desc(notifications.createdAt))
        .limit(data.limit)
        .offset(data.offset)
      const [totalRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(where)
      return {
        ok: true as const,
        items: rows,
        total: totalRow.count,
        limit: data.limit,
        offset: data.offset,
      }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const countUnreadNotifications = createServerFn({
  method: 'GET',
  strict: { output: false },
}).handler(async () => {
  try {
    const ctx = await getRequestContext()
    const actor = requireAuth(ctx)
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientUserId, actor.id),
          isNull(notifications.readAt),
        ),
      )
    return { ok: true as const, count: row.count }
  } catch (e) {
    throw toClientError(e)
  }
})

export const markNotificationRead = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator((d: unknown) => markNotificationReadSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const actor = requireAuth(ctx)
      const updated = await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notifications.id, data.notificationId),
            eq(notifications.recipientUserId, actor.id),
          ),
        )
        .returning()
      if (updated.length === 0) {
        throw new AppError('NOT_FOUND', 'Notification not found')
      }
      return { ok: true as const, notification: updated[0] }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const markAllNotificationsRead = createServerFn({
  method: 'POST',
  strict: { output: false },
}).handler(async () => {
  try {
    const ctx = await getRequestContext()
    const actor = requireAuth(ctx)
    const updated = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.recipientUserId, actor.id),
          isNull(notifications.readAt),
        ),
      )
      .returning({ id: notifications.id })
    return { ok: true as const, count: updated.length }
  } catch (e) {
    throw toClientError(e)
  }
})
