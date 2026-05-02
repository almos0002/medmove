/**
 * MedMove dev seed — minimal.
 *
 * Wipes every domain + auth row and creates exactly 5 accounts:
 *   • 1 super_admin user
 *   • 2 org_owner users (one per organization)
 *   • 2 logistics_staff users (one per organization)
 *
 * Plus 2 verified organizations of type "logistics_partner" (delivery):
 *   • SwiftMove Logistics — owned by org_owner #1, staffed by logistics #1
 *   • NorthStar Delivery — owned by org_owner #2, staffed by logistics #2
 *
 * No catalog, listings, transfers, deliveries, notifications, or audit
 * rows are created — clean slate for hand-testing flows.
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
  // Both seed orgs are full-capability: they can list, request, AND
  // deliver medicine. We override the type-default capabilities (which
  // would only grant `canDeliverMedicine` to a logistics_partner) so the
  // seeded orgs can exercise every flow end-to-end.
  const caps = {
    canListMedicine: true,
    canRequestMedicine: true,
    canDeliverMedicine: true,
  }

  const existing = await db
    .select()
    .from(organizations)
    .where(eq(organizations.licenseNumber, args.licenseNumber))
    .limit(1)
  if (existing[0]) {
    await db
      .update(organizations)
      .set({
        canListMedicine: caps.canListMedicine,
        canRequestMedicine: caps.canRequestMedicine,
        canDeliverMedicine: caps.canDeliverMedicine,
      })
      .where(eq(organizations.id, existing[0].id))
    return { ...existing[0], ...caps }
  }

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

async function ensureMembership(
  orgId: string,
  userId: string,
  role: 'owner' | 'member',
) {
  const existing = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .limit(1)
  if (existing[0]) return existing[0]
  const [row] = await db
    .insert(organizationMembers)
    .values({ organizationId: orgId, userId, role })
    .returning()
  return row!
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
  console.log('Seeding MedMove (minimal — 5 accounts)…')
  console.log('Resetting all domain + auth tables…')
  await resetDatabase()

  // ─── Users ────────────────────────────────────────────────────────────
  const superAdminUser = await ensureUser({
    email: 'super-admin@medmove.dev',
    password: 'SuperAdminPass123!',
    name: 'MedMove Super Admin',
    role: ROLES.SUPER_ADMIN,
  })
  const orgOwnerA = await ensureUser({
    email: 'org1-owner@medmove.dev',
    password: 'Org1OwnerPass123!',
    name: 'Olivia Org One Owner',
    role: ROLES.ORG_OWNER,
  })
  const orgOwnerB = await ensureUser({
    email: 'org2-owner@medmove.dev',
    password: 'Org2OwnerPass123!',
    name: 'Oscar Org Two Owner',
    role: ROLES.ORG_OWNER,
  })
  const logisticsStaffA = await ensureUser({
    email: 'logistics1@medmove.dev',
    password: 'Logistics1Pass123!',
    name: 'Liam Logistics One',
    role: ROLES.LOGISTICS_STAFF,
  })
  const logisticsStaffB = await ensureUser({
    email: 'logistics2@medmove.dev',
    password: 'Logistics2Pass123!',
    name: 'Lena Logistics Two',
    role: ROLES.LOGISTICS_STAFF,
  })
  console.log('Users ready (1 super admin + 2 org owners + 2 logistics).')

  // ─── Organisations (delivery / logistics_partner) ─────────────────────
  const orgA = await ensureOrg({
    name: 'SwiftMove Logistics',
    type: ORG_TYPES.LOGISTICS_PARTNER,
    licenseNumber: 'LOG-LIC-0001',
    contactEmail: 'ops@swiftmove.test',
    contactPhone: '+1-555-0300',
    city: 'Boston',
    country: 'USA',
    ownerUserId: orgOwnerA.id,
  })
  const orgB = await ensureOrg({
    name: 'NorthStar Delivery',
    type: ORG_TYPES.LOGISTICS_PARTNER,
    licenseNumber: 'LOG-LIC-0002',
    contactEmail: 'ops@northstar.test',
    contactPhone: '+1-555-0400',
    city: 'New York',
    country: 'USA',
    ownerUserId: orgOwnerB.id,
  })

  // Each logistics staff joins one org as a member.
  await ensureMembership(orgA.id, logisticsStaffA.id, 'member')
  await ensureMembership(orgB.id, logisticsStaffB.id, 'member')
  console.log(`Organisations ready: ${orgA.name}, ${orgB.name}`)

  // Reference no-op to silence unused-var lint on superAdminUser.
  void superAdminUser

  // ─── Summary ──────────────────────────────────────────────────────────
  console.log('\nDone.\n')
  console.log('Login credentials (5 accounts):')
  console.log(
    '  super_admin:   super-admin@medmove.dev  / SuperAdminPass123!',
  )
  console.log(
    '  org owner #1:  org1-owner@medmove.dev   / Org1OwnerPass123!  (SwiftMove Logistics)',
  )
  console.log(
    '  org owner #2:  org2-owner@medmove.dev   / Org2OwnerPass123!  (NorthStar Delivery)',
  )
  console.log(
    '  logistics #1:  logistics1@medmove.dev   / Logistics1Pass123!  (SwiftMove Logistics)',
  )
  console.log(
    '  logistics #2:  logistics2@medmove.dev   / Logistics2Pass123!  (NorthStar Delivery)',
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
