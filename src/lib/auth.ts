import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db'
import * as schema from './auth-schema'

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
        defaultValue: 'pharmacy',
        input: true,
      },
      organizationName: {
        type: 'string',
        required: false,
        input: true,
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
