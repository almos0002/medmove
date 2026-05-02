import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db'
import * as schema from './auth-schema'
import {
  ALL_ROLES,
  PUBLIC_SIGNUP_ROLES,
  ROLES,
  type AppRole,
} from './permissions'

/**
 * Server-side role allowlist for *user creation*.
 *
 * Without this hook, Better Auth's `additionalFields.role` is just a free-form
 * string from the request body — meaning anyone hitting `/api/auth/sign-up`
 * could mint an `admin`/`super_admin` account. The hook validates `role`
 * against `PUBLIC_SIGNUP_ROLES` for normal HTTP signups, and against
 * `ALL_ROLES` only when the seed/bootstrap script explicitly opts in via
 * the `MEDMOVE_TRUSTED_SIGNUP=1` env var.
 */
async function validateRoleForCreate(input: { role?: unknown }) {
  const trusted = process.env.MEDMOVE_TRUSTED_SIGNUP === '1'
  const allowed = trusted ? ALL_ROLES : PUBLIC_SIGNUP_ROLES
  const role =
    typeof input.role === 'string' ? (input.role as AppRole) : ROLES.ORG_STAFF
  if (!allowed.includes(role)) {
    throw new APIError('FORBIDDEN', {
      message: `Role '${role}' is not allowed for public sign-up`,
    })
  }
  // Coerce missing/invalid to ORG_STAFF so the row is always well-formed
  // (lowest-trust authenticated role that still belongs to an org).
  return { ...input, role }
}

export const auth = betterAuth({
  appName: 'MedMove',
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: ROLES.ORG_STAFF,
        input: true,
      },
      organizationName: {
        type: 'string',
        required: false,
        input: true,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const validated = await validateRoleForCreate(
            user as unknown as { role?: unknown },
          )
          return {
            data: { ...user, role: validated.role } as typeof user,
          }
        },
      },
    },
  },
  trustedOrigins: [
    'http://localhost:5000',
    'https://*.replit.dev',
    'https://*.replit.app',
    'https://*.pike.replit.dev',
    ...(process.env.REPLIT_DEV_DOMAIN
      ? [`https://${process.env.REPLIT_DEV_DOMAIN}`]
      : []),
    ...(process.env.REPLIT_DOMAINS
      ? process.env.REPLIT_DOMAINS.split(',').map((d) => `https://${d.trim()}`)
      : []),
  ],
})

export type Session = typeof auth.$Infer.Session
