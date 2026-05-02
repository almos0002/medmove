import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { getRequest } from '@tanstack/react-start/server'
import { db } from '@/lib/db'
import { user } from '@/lib/auth-schema'
import { auth } from '@/lib/auth'
import { getRequestContext } from '../context'
import { writeAudit } from '../audit'
import { AppError, toClientError } from '../errors'
import { requireAuth } from '../guards/require-auth'
import {
  changePasswordSchema,
  updateMyAccountSchema,
} from '../validators/account'

/**
 * Step 14 — Account / profile self-service server fns.
 *
 * Reads return only the safe subset of `user` (id, name, email, role,
 * createdAt). Writes always re-check the session via `requireAuth` so a
 * stale cookie can never edit another user's row.
 */
export const getMyAccount = createServerFn({ method: 'GET', strict: { output: false } })
  .handler(async () => {
    try {
      const ctx = await getRequestContext()
      const me = requireAuth(ctx)
      const [row] = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })
        .from(user)
        .where(eq(user.id, me.id))
        .limit(1)
      if (!row) throw new AppError('NOT_FOUND', 'Account not found')
      return { account: row }
    } catch (e) {
      throw toClientError(e)
    }
  })

export const updateMyAccount = createServerFn({ method: 'POST', strict: { output: false } })
  .inputValidator((d: unknown) => updateMyAccountSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const me = requireAuth(ctx)
      const result = await db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(user)
          .where(eq(user.id, me.id))
          .limit(1)
        if (!before) throw new AppError('NOT_FOUND', 'Account not found')
        const [updated] = await tx
          .update(user)
          .set({ name: data.name })
          .where(eq(user.id, me.id))
          .returning()
        await writeAudit({
          ctx,
          tx,
          action: 'user.updated',
          entityType: 'user',
          entityId: me.id,
          before: { name: before.name } as Record<string, unknown>,
          after: { name: updated.name } as Record<string, unknown>,
        })
        return updated
      })
      return {
        ok: true as const,
        account: {
          id: result.id,
          name: result.name,
          email: result.email,
          role: result.role,
        },
      }
    } catch (e) {
      throw toClientError(e)
    }
  })

/**
 * Change the signed-in user's password. Delegates to Better Auth so the
 * existing hashing scheme + cookie rotation are preserved. We don't audit
 * the new hash — only the fact that a change happened.
 */
export const changeMyPassword = createServerFn({ method: 'POST', strict: { output: false } })
  .inputValidator((d: unknown) => changePasswordSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const ctx = await getRequestContext()
      const me = requireAuth(ctx)
      const req = getRequest()
      try {
        await auth.api.changePassword({
          headers: req.headers,
          body: {
            currentPassword: data.currentPassword,
            newPassword: data.newPassword,
            revokeOtherSessions: true,
          },
        } as Parameters<typeof auth.api.changePassword>[0])
      } catch (err) {
        // Better Auth surfaces a friendly message; bubble it as a
        // typed AppError so the client error helpers handle it.
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Could not change password'
        throw new AppError('FORBIDDEN', message)
      }
      await writeAudit({
        ctx,
        action: 'user.password_changed',
        entityType: 'user',
        entityId: me.id,
      })
      return { ok: true as const }
    } catch (e) {
      throw toClientError(e)
    }
  })
