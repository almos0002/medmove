/**
 * MedMove dev seed — minimal.
 *
 * Wipes every domain + auth row and creates only:
 *   • 1 super_admin user
 *   • 2 verified organizations of type "logistics_partner" (delivery)
 *
 * No catalog, listings, transfers, deliveries, notifications, or audit
 * rows are created — this is a clean slate for hand-testing flows from
 * the super_admin account.
 *
 * Run:  npm run db:seed
 */
import { eq, sql } from 'drizzle-orm'
import { db } from '../src/lib/db'
import { auth } from '../src/lib/auth'
import { user } from '../src/lib/auth-schema'
import { organizations, organizationMembers } from '../src/lib/schema'
import {
  ROLES,
  ORG_TYPES,
  defaultCapabilitiesForType,
  type AppRole,
  type OrgType,
} from '../src/lib/permissions'

// Trusted bootstrap path: lets the seed script create admin/super_admin
// users despite the public-signup role allowlist enforced in
// src/lib/auth.ts. The env var must be exported by the npm script
// (`npm run db:seed`) BEFORE the process boots.
if (process.env.MEDMOVE_TRUSTED_SIGNUP !== '1') {
  console.error(
    "Refusing to run seed without MEDMOVE_TRUSTED_SIGNUP=1 — use 'npm run db:seed'.",
  )
  process.exit(1)
}

type SeedUser = {
  email: string
  password: string
  name: string
  role: AppRole
}

async function ensureUser(u: SeedUser) {
  const existing = await db
    .select()
    .from(user)
    .where(eq(user.email, u.email))
    .limit(1)
  if (existing[0]) {
    if (existing[0].role !== u.role) {
      await db
        .update(user)
        .set({ role: u.role })
        .where(eq(user.id, existing[0].id))
      return { ...existing[0], role: u.role }
    }
    return existing[0]
  }

  const result = await auth.api.signUpEmail({
    body: {
      email: u.email,
      password: u.password,
      name: u.name,
      role: u.role,
    },
  } as Parameters<typeof auth.api.signUpEmail>[0])

  if (!result || !('user' in result) || !result.user) {
    throw new Error(`Failed to create user ${u.email}`)
  }
  return (
    await db.select().from(user).where(eq(user.email, u.email)).limit(1)
  )[0]!
}

async function ensureOrg(args: {
  name: string
  type: OrgType
  licenseNumber: string
  contactEmail: string
  contactPhone: string
  city: string
  country: string
  ownerUserId: string
}) {
  const existing = await db
    .select()
    .from(organizations)
    .where(eq(organizations.licenseNumber, args.licenseNumber))
    .limit(1)
  if (existing[0]) return existing[0]

  const caps = defaultCapabilitiesForType(args.type)
  const [org] = await db
    .insert(organizations)
    .values({
      name: args.name,
      type: args.type,
      licenseNumber: args.licenseNumber,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
      addressLine1: '123 Main Street',
      city: args.city,
      country: args.country,
      verificationStatus: 'verified',
      verifiedAt: new Date(),
      verifiedByUserId: args.ownerUserId,
      canListMedicine: caps.canListMedicine,
      canRequestMedicine: caps.canRequestMedicine,
      canDeliverMedicine: caps.canDeliverMedicine,
    })
    .returning()

  await db.insert(organizationMembers).values({
    organizationId: org!.id,
    userId: args.ownerUserId,
    role: 'owner',
  })

  return org!
}

/**
 * Wipe every domain row plus every Better Auth row so the seed is a
 * true reset.
 */
async function resetDatabase() {
  await db.execute(sql`
    TRUNCATE TABLE
      "notifications",
      "audit_logs",
      "deliveries",
      "transfer_requests",
      "listings",
      "inventory_batches",
      "medicines",
      "organization_documents",
      "organization_members",
      "organizations",
      "user_notification_preferences",
      "platform_settings",
      "session",
      "account",
      "verification",
      "user"
    RESTART IDENTITY CASCADE
  `)
}

async function main() {
  console.log('Seeding MedMove (minimal)…')
  console.log('Resetting all domain + auth tables…')
  await resetDatabase()

  // ─── User ─────────────────────────────────────────────────────────────
  const superAdminUser = await ensureUser({
    email: 'super-admin@medmove.dev',
    password: 'SuperAdminPass123!',
    name: 'MedMove Super Admin',
    role: ROLES.SUPER_ADMIN,
  })
  console.log('Super admin ready.')

  // ─── Organisations (delivery / logistics_partner) ─────────────────────
  const orgA = await ensureOrg({
    name: 'SwiftMove Logistics',
    type: ORG_TYPES.LOGISTICS_PARTNER,
    licenseNumber: 'LOG-LIC-0001',
    contactEmail: 'ops@swiftmove.test',
    contactPhone: '+1-555-0300',
    city: 'Boston',
    country: 'USA',
    ownerUserId: superAdminUser.id,
  })
  const orgB = await ensureOrg({
    name: 'NorthStar Delivery',
    type: ORG_TYPES.LOGISTICS_PARTNER,
    licenseNumber: 'LOG-LIC-0002',
    contactEmail: 'ops@northstar.test',
    contactPhone: '+1-555-0400',
    city: 'New York',
    country: 'USA',
    ownerUserId: superAdminUser.id,
  })
  console.log(`Organisations ready: ${orgA.name}, ${orgB.name}`)

  // ─── Summary ──────────────────────────────────────────────────────────
  console.log('\nDone.\n')
  console.log('Login credentials:')
  console.log(
    '  super_admin: super-admin@medmove.dev / SuperAdminPass123!',
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
