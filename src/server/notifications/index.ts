/**
 * Step 12 — In-app notification service.
 *
 * Three create* helpers, one per audience. All notifications are persisted
 * per recipient user so that read state is always per-user:
 *
 *   - createForUser    → 1 row, audience='user'
 *   - createForOrg     → N rows, audience='organization', one per current
 *                        member of the org
 *   - createForAdmins  → N rows, audience='admins', one per user with role
 *                        admin / super_admin at write time
 *
 * All three accept an optional Drizzle `tx` so callers persist notifications
 * atomically alongside the business write (and `writeAudit`) inside the same
 * transaction.
 *
 * Channel dispatch (email / sms / whatsapp) lives in `./channels/` and is
 * intentionally NOT triggered from inside the create helpers — providers may
 * be slow or flaky and must never roll back the surrounding business
 * transaction. Callers do `const created = await db.transaction(...)`, push
 * any returned notification rows into a list, and then call
 * `dispatchNotificationsAfterCommit(rows)` once the transaction has
 * committed (errors are swallowed and logged).
 *
 * Dedup (`dedupe: true`): adds `ON CONFLICT DO NOTHING` against the
 * `notifications_user_entity_type_uq` index so re-running the expiry scan
 * never produces duplicate alerts per (user, entity, type).
 */
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { notifications, organizationMembers } from '@/lib/schema'
import { user as userTable } from '@/lib/auth-schema'
import { ADMIN_ROLES } from '@/lib/permissions'
import { dispatchNotification } from './channels'
import type { DispatchRecipient } from './channels'

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0]
type DbOrTx = typeof db | DbTx

export type NotificationRow = typeof notifications.$inferSelect
export type NotificationType = NotificationRow['type']
export type NotificationSeverity = NotificationRow['severity']

type CreateBase = {
  tx?: DbOrTx
  type: NotificationType
  severity?: NotificationSeverity
  title: string
  body?: string | null
  entityType?: string | null
  entityId?: string | null
  link?: string | null
  metadata?: Record<string, unknown> | null
  /**
   * Adds ON CONFLICT DO NOTHING against the per-user dedup index. Used by
   * the expiry scan; safe to enable on any helper.
   */
  dedupe?: boolean
}

export type CreateForUserArgs = CreateBase & { userId: string }
export type CreateForOrgArgs = CreateBase & { orgId: string }
export type CreateForAdminsArgs = CreateBase

function client(tx?: DbOrTx) {
  return tx ?? db
}

async function insertRow(
  tx: DbOrTx | undefined,
  audience: 'user' | 'organization' | 'admins',
  recipientUserId: string,
  recipientOrgId: string | null,
  args: CreateBase,
): Promise<NotificationRow | null> {
  const insert = client(tx)
    .insert(notifications)
    .values({
      audience,
      recipientUserId,
      recipientOrgId,
      type: args.type,
      severity: args.severity ?? 'info',
      title: args.title,
      body: args.body ?? null,
      entityType: args.entityType ?? null,
      entityId: args.entityId ?? null,
      link: args.link ?? null,
      metadata: args.metadata ?? null,
    })
  const rows = args.dedupe
    ? await insert.onConflictDoNothing().returning()
    : await insert.returning()
  return rows[0] ?? null
}

export async function createForUser(
  args: CreateForUserArgs,
): Promise<NotificationRow[]> {
  const row = await insertRow(args.tx, 'user', args.userId, null, args)
  return row ? [row] : []
}

/**
 * Fan out an org-scoped notification to one row per current org member.
 * Callers should `notifs.push(...await createForOrg({...}))`.
 */
export async function createForOrg(
  args: CreateForOrgArgs,
): Promise<NotificationRow[]> {
  const c = client(args.tx)
  const members = await c
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, args.orgId))
  if (members.length === 0) return []
  const out: NotificationRow[] = []
  for (const m of members) {
    const row = await insertRow(
      args.tx,
      'organization',
      m.userId,
      args.orgId,
      args,
    )
    if (row) out.push(row)
  }
  return out
}

/**
 * Fan out to one row per user with role admin / super_admin at write time.
 */
export async function createForAdmins(
  args: CreateForAdminsArgs,
): Promise<NotificationRow[]> {
  const c = client(args.tx)
  const admins = await c
    .select({ id: userTable.id })
    .from(userTable)
    .where(inArray(userTable.role, [...ADMIN_ROLES]))
  if (admins.length === 0) return []
  const out: NotificationRow[] = []
  for (const a of admins) {
    const row = await insertRow(args.tx, 'admins', a.id, null, args)
    if (row) out.push(row)
  }
  return out
}

/**
 * Resolve the recipient user for a notification row and fan it out across
 * email / sms / whatsapp. Stub implementations only — see `./channels/`.
 *
 * Errors are caught per-row so one slow lookup never breaks the post-commit
 * dispatch loop.
 */
export async function dispatchNotificationRow(
  row: NotificationRow,
): Promise<void> {
  try {
    const [u] = await db
      .select({
        id: userTable.id,
        email: userTable.email,
        name: userTable.name,
      })
      .from(userTable)
      .where(eq(userTable.id, row.recipientUserId))
      .limit(1)
    if (!u) return
    const recipient: DispatchRecipient = {
      userId: u.id,
      email: u.email,
      phone: null,
      name: u.name,
    }
    await dispatchNotification({ notification: row, recipient })
  } catch (err) {
    console.error('[notifications:dispatch] row failed', {
      id: row.id,
      type: row.type,
      err,
    })
  }
}

/**
 * Convenience post-commit fan-out for a list of just-created notification
 * rows. Always resolves — never throws. Callers typically:
 *
 *   const created: NotificationRow[] = []
 *   const result = await db.transaction(async (tx) => {
 *     ...
 *     created.push(...await createForOrg({ tx, ... }))
 *     return ...
 *   })
 *   void dispatchNotificationsAfterCommit(created)
 */
export async function dispatchNotificationsAfterCommit(
  rows: ReadonlyArray<NotificationRow | null | undefined>,
): Promise<void> {
  const real = rows.filter((r): r is NotificationRow => !!r)
  if (real.length === 0) return
  await Promise.allSettled(real.map((r) => dispatchNotificationRow(r)))
}

export { dispatchNotification } from './channels'
