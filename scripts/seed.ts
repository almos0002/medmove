/**
 * MedMove dev seed — minimal.
 *
 * Wipes every domain + auth row and creates exactly 5 accounts:
 *   • 1 super_admin user
 *   • 2 org_owner users (one per organization)
 *   • 2 logistics_staff users (one per organization)
 *
 * Plus 2 verified organizations of type "logistics_partner" (delivery)
 * with full capabilities (list / request / deliver):
 *   • SwiftMove Logistics  — owned by org_owner #1, staffed by logistics #1
 *   • NorthStar Delivery   — owned by org_owner #2, staffed by logistics #2
 *
 * Plus a small catalog + inventory + listings so the marketplace,
 * inventory, and admin-queue screens have data to render:
 *   • 6 catalog medicines
 *   • 6 inventory batches (3 per org)
 *   • 6 listings (2 active + 1 pending_admin per org)
 *
 * No transfer requests, deliveries, notifications, or audit rows are
 * seeded — those are exercised by hand-testing the flows.
 *
 * Run:  npm run db:seed
 */
import { eq, and, sql } from 'drizzle-orm'
import { db } from '../src/lib/db'
import { auth } from '../src/lib/auth'
import { user } from '../src/lib/auth-schema'
import {
  organizations,
  organizationMembers,
  medicines,
  inventoryBatches,
  listings,
} from '../src/lib/schema'
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

/**
 * Per-medicine listing photos. Stable, public picsum.photos URLs keyed
 * by a deterministic seed slug so each medicine card is visually
 * distinct across re-seeds.
 */
const PHOTO_URLS: Record<string, string[]> = {
  paracetamol: [
    'https://picsum.photos/seed/medmove-paracetamol-1/960/720',
    'https://picsum.photos/seed/medmove-paracetamol-2/960/720',
  ],
  ibuprofen: [
    'https://picsum.photos/seed/medmove-ibuprofen-1/960/720',
    'https://picsum.photos/seed/medmove-ibuprofen-2/960/720',
  ],
  amoxicillin: [
    'https://picsum.photos/seed/medmove-amoxicillin-1/960/720',
    'https://picsum.photos/seed/medmove-amoxicillin-2/960/720',
  ],
  omeprazole: [
    'https://picsum.photos/seed/medmove-omeprazole-1/960/720',
    'https://picsum.photos/seed/medmove-omeprazole-2/960/720',
  ],
  metformin: [
    'https://picsum.photos/seed/medmove-metformin-1/960/720',
    'https://picsum.photos/seed/medmove-metformin-2/960/720',
  ],
  cetirizine: [
    'https://picsum.photos/seed/medmove-cetirizine-1/960/720',
    'https://picsum.photos/seed/medmove-cetirizine-2/960/720',
  ],
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
  // Both seed orgs are full-capability: list, request, AND deliver.
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
      .set(caps)
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
      ...caps,
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

async function ensureMedicine(m: {
  name: string
  genericName?: string
  strength: string
  form:
    | 'tablet'
    | 'capsule'
    | 'syrup'
    | 'suspension'
    | 'injection'
    | 'cream'
    | 'ointment'
    | 'drops'
    | 'inhaler'
    | 'patch'
    | 'powder'
    | 'sachet'
    | 'other'
  manufacturer?: string
}) {
  const all = await db.select().from(medicines)
  const found = all.find(
    (x) => x.name === m.name && x.strength === m.strength && x.form === m.form,
  )
  if (found) return found
  const [created] = await db
    .insert(medicines)
    .values({
      name: m.name,
      genericName: m.genericName,
      strength: m.strength,
      form: m.form,
      manufacturer: m.manufacturer,
    })
    .returning()
  return created!
}

async function ensureBatch(args: {
  organizationId: string
  medicineId: string
  batchNumber: string
  quantityOnHand: number
  unit: string
  monthsToExpiry: number
}) {
  const existing = await db
    .select()
    .from(inventoryBatches)
    .where(
      and(
        eq(inventoryBatches.organizationId, args.organizationId),
        eq(inventoryBatches.medicineId, args.medicineId),
        eq(inventoryBatches.batchNumber, args.batchNumber),
      ),
    )
    .limit(1)
  if (existing[0]) return existing[0]

  const expiry = new Date()
  expiry.setMonth(expiry.getMonth() + args.monthsToExpiry)

  const [row] = await db
    .insert(inventoryBatches)
    .values({
      organizationId: args.organizationId,
      medicineId: args.medicineId,
      batchNumber: args.batchNumber,
      expiryDate: expiry.toISOString().slice(0, 10),
      quantityOnHand: args.quantityOnHand,
      unit: args.unit,
      storageType: 'room_temperature',
      sealedStatus: 'sealed',
    })
    .returning()
  return row!
}

async function ensureListing(args: {
  batchId: string
  sellerOrgId: string
  quantity: number
  pickupCity: string
  pickupCountry: string
  status: 'pending_admin' | 'active'
  createdByUserId: string
  approvedByUserId?: string
  notes?: string
  photoUrls?: string[]
}) {
  const existing = await db
    .select()
    .from(listings)
    .where(eq(listings.batchId, args.batchId))
    .limit(1)
  if (existing[0]) return existing[0]
  const [row] = await db
    .insert(listings)
    .values({
      batchId: args.batchId,
      sellerOrgId: args.sellerOrgId,
      quantityListed: args.quantity,
      quantityAvailable: args.quantity,
      photoUrls: args.photoUrls ?? [],
      pickupCity: args.pickupCity,
      pickupCountry: args.pickupCountry,
      status: args.status,
      submittedAt: new Date(),
      approvedAt: args.status === 'active' ? new Date() : null,
      approvedByUserId: args.status === 'active' ? args.approvedByUserId : null,
      createdByUserId: args.createdByUserId,
      notes: args.notes,
    })
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

  // ─── Organisations (full-capability logistics_partner) ────────────────
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
  await ensureMembership(orgA.id, logisticsStaffA.id, 'member')
  await ensureMembership(orgB.id, logisticsStaffB.id, 'member')
  console.log(`Organisations ready: ${orgA.name}, ${orgB.name}`)

  // ─── Catalog ──────────────────────────────────────────────────────────
  const paracetamol = await ensureMedicine({
    name: 'Paracetamol',
    genericName: 'Acetaminophen',
    strength: '500 mg',
    form: 'tablet',
  })
  const ibuprofen = await ensureMedicine({
    name: 'Ibuprofen',
    strength: '400 mg',
    form: 'tablet',
  })
  const amoxicillin = await ensureMedicine({
    name: 'Amoxicillin',
    strength: '250 mg',
    form: 'capsule',
  })
  const omeprazole = await ensureMedicine({
    name: 'Omeprazole',
    strength: '20 mg',
    form: 'capsule',
  })
  const metformin = await ensureMedicine({
    name: 'Metformin',
    strength: '500 mg',
    form: 'tablet',
  })
  const cetirizine = await ensureMedicine({
    name: 'Cetirizine',
    strength: '10 mg',
    form: 'tablet',
  })
  console.log('Catalog ready (6 medicines).')

  // ─── Inventory batches (3 per org) ────────────────────────────────────
  const batchA1 = await ensureBatch({
    organizationId: orgA.id,
    medicineId: paracetamol.id,
    batchNumber: 'SM-PARA-2026A',
    quantityOnHand: 200,
    unit: 'strip',
    monthsToExpiry: 8,
  })
  const batchA2 = await ensureBatch({
    organizationId: orgA.id,
    medicineId: ibuprofen.id,
    batchNumber: 'SM-IBU-2026A',
    quantityOnHand: 120,
    unit: 'strip',
    monthsToExpiry: 10,
  })
  const batchA3 = await ensureBatch({
    organizationId: orgA.id,
    medicineId: amoxicillin.id,
    batchNumber: 'SM-AMOX-2026A',
    quantityOnHand: 80,
    unit: 'box',
    monthsToExpiry: 6,
  })
  const batchB1 = await ensureBatch({
    organizationId: orgB.id,
    medicineId: omeprazole.id,
    batchNumber: 'NS-OMEP-2026A',
    quantityOnHand: 90,
    unit: 'pack',
    monthsToExpiry: 9,
  })
  const batchB2 = await ensureBatch({
    organizationId: orgB.id,
    medicineId: metformin.id,
    batchNumber: 'NS-MET-2026A',
    quantityOnHand: 250,
    unit: 'pack',
    monthsToExpiry: 7,
  })
  const batchB3 = await ensureBatch({
    organizationId: orgB.id,
    medicineId: cetirizine.id,
    batchNumber: 'NS-CET-2026A',
    quantityOnHand: 150,
    unit: 'strip',
    monthsToExpiry: 11,
  })
  console.log('Inventory batches ready (3 per org).')

  // ─── Listings (2 active + 1 pending_admin per org) ────────────────────
  await ensureListing({
    batchId: batchA1.id,
    sellerOrgId: orgA.id,
    quantity: 200,
    pickupCity: 'Boston',
    pickupCountry: 'USA',
    status: 'active',
    createdByUserId: orgOwnerA.id,
    approvedByUserId: superAdminUser.id,
    notes: 'Approved listing — paracetamol surplus.',
    photoUrls: PHOTO_URLS.paracetamol,
  })
  await ensureListing({
    batchId: batchA2.id,
    sellerOrgId: orgA.id,
    quantity: 120,
    pickupCity: 'Boston',
    pickupCountry: 'USA',
    status: 'active',
    createdByUserId: orgOwnerA.id,
    approvedByUserId: superAdminUser.id,
    notes: 'Approved listing — ibuprofen surplus.',
    photoUrls: PHOTO_URLS.ibuprofen,
  })
  await ensureListing({
    batchId: batchA3.id,
    sellerOrgId: orgA.id,
    quantity: 80,
    pickupCity: 'Boston',
    pickupCountry: 'USA',
    status: 'pending_admin',
    createdByUserId: orgOwnerA.id,
    notes: 'Awaiting admin review — amoxicillin.',
    photoUrls: PHOTO_URLS.amoxicillin,
  })
  await ensureListing({
    batchId: batchB1.id,
    sellerOrgId: orgB.id,
    quantity: 90,
    pickupCity: 'New York',
    pickupCountry: 'USA',
    status: 'active',
    createdByUserId: orgOwnerB.id,
    approvedByUserId: superAdminUser.id,
    notes: 'Approved listing — omeprazole.',
    photoUrls: PHOTO_URLS.omeprazole,
  })
  await ensureListing({
    batchId: batchB2.id,
    sellerOrgId: orgB.id,
    quantity: 250,
    pickupCity: 'New York',
    pickupCountry: 'USA',
    status: 'active',
    createdByUserId: orgOwnerB.id,
    approvedByUserId: superAdminUser.id,
    notes: 'Approved listing — metformin.',
    photoUrls: PHOTO_URLS.metformin,
  })
  await ensureListing({
    batchId: batchB3.id,
    sellerOrgId: orgB.id,
    quantity: 150,
    pickupCity: 'New York',
    pickupCountry: 'USA',
    status: 'pending_admin',
    createdByUserId: orgOwnerB.id,
    notes: 'Awaiting admin review — cetirizine.',
    photoUrls: PHOTO_URLS.cetirizine,
  })
  console.log('Listings ready (2 active + 1 pending per org).')

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
