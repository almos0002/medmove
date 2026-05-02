/**
 * MedMove dev seed.
 *
 * Creates one user per role (super_admin, admin, seller, buyer, logistics_user)
 * plus one verified org per type (pharmacy, hospital, logistics) with the
 * appropriate owner. Also populates the medicine catalog and one demo listing.
 *
 * Run:  npm run db:seed
 *
 * Idempotent. If a user already exists with an old role string we *update*
 * their role so re-seeding after a role-model migration still produces a
 * working test set.
 */
import { eq } from 'drizzle-orm'
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
import { ROLES, type AppRole, type OrgType } from '../src/lib/permissions'

// Trusted bootstrap path: lets the seed script create admin/super_admin users
// despite the public-signup role allowlist enforced in src/lib/auth.ts. The
// env var must be exported by the npm script (`npm run db:seed`) BEFORE the
// process boots — setting it here would be too late because ES module imports
// (above) are evaluated first.
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
      await db.update(user).set({ role: u.role }).where(eq(user.id, existing[0].id))
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
  if (existing[0]) {
    return existing[0]
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
    })
    .returning()

  await db.insert(organizationMembers).values({
    organizationId: org!.id,
    userId: args.ownerUserId,
    role: 'owner',
  })

  return org!
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

async function main() {
  console.log('Seeding MedMove…')

  const superAdminUser = await ensureUser({
    email: 'super-admin@medmove.dev',
    password: 'SuperAdminPass123!',
    name: 'MedMove Super Admin',
    role: ROLES.SUPER_ADMIN,
  })
  const adminUser = await ensureUser({
    email: 'admin@medmove.dev',
    password: 'AdminPass123!',
    name: 'MedMove Admin',
    role: ROLES.ADMIN,
  })
  const sellerOwner = await ensureUser({
    email: 'pharmacy-owner@medmove.dev',
    password: 'PharmaPass123!',
    name: 'Priya Pharmacy Owner',
    role: ROLES.SELLER,
  })
  const buyerOwner = await ensureUser({
    email: 'hospital-owner@medmove.dev',
    password: 'HospitalPass123!',
    name: 'Henry Hospital Owner',
    role: ROLES.BUYER,
  })
  const logisticsOwner = await ensureUser({
    email: 'logistics-owner@medmove.dev',
    password: 'LogisticsPass123!',
    name: 'Liam Logistics Owner',
    role: ROLES.LOGISTICS_USER,
  })
  console.log(
    `Users: super_admin=${superAdminUser.id} admin=${adminUser.id} seller=${sellerOwner.id} buyer=${buyerOwner.id} logistics=${logisticsOwner.id}`,
  )

  const pharmacyOrg = await ensureOrg({
    name: 'GoodHealth Pharmacy',
    type: 'pharmacy',
    licenseNumber: 'PHARM-LIC-0001',
    contactEmail: 'contact@goodhealth.test',
    contactPhone: '+1-555-0100',
    city: 'Boston',
    country: 'USA',
    ownerUserId: sellerOwner.id,
  })
  const hospitalOrg = await ensureOrg({
    name: "St Mary's Community Hospital",
    type: 'hospital',
    licenseNumber: 'HOSP-LIC-0001',
    contactEmail: 'admin@stmarys.test',
    contactPhone: '+1-555-0200',
    city: 'Cambridge',
    country: 'USA',
    ownerUserId: buyerOwner.id,
  })
  const logisticsOrg = await ensureOrg({
    name: 'SwiftMove Logistics',
    type: 'logistics',
    licenseNumber: 'LOG-LIC-0001',
    contactEmail: 'ops@swiftmove.test',
    contactPhone: '+1-555-0300',
    city: 'Boston',
    country: 'USA',
    ownerUserId: logisticsOwner.id,
  })
  console.log(
    `Orgs: pharmacy=${pharmacyOrg.id} hospital=${hospitalOrg.id} logistics=${logisticsOrg.id}`,
  )

  const catalog = await Promise.all([
    ensureMedicine({ name: 'Paracetamol', genericName: 'Acetaminophen', strength: '500 mg', form: 'tablet' }),
    ensureMedicine({ name: 'Ibuprofen', strength: '400 mg', form: 'tablet' }),
    ensureMedicine({ name: 'Amoxicillin', strength: '250 mg', form: 'capsule' }),
    ensureMedicine({ name: 'Azithromycin', strength: '500 mg', form: 'tablet' }),
    ensureMedicine({ name: 'Metformin', strength: '500 mg', form: 'tablet' }),
    ensureMedicine({ name: 'Omeprazole', strength: '20 mg', form: 'capsule' }),
    ensureMedicine({ name: 'Cetirizine', strength: '10 mg', form: 'tablet' }),
    ensureMedicine({ name: 'Salbutamol', strength: '100 mcg', form: 'inhaler' }),
    ensureMedicine({ name: 'ORS', genericName: 'Oral Rehydration Salts', strength: '20.5 g', form: 'sachet' }),
    ensureMedicine({ name: 'Cough Syrup', strength: '100 ml', form: 'syrup' }),
  ])
  console.log(`Catalog: ${catalog.length} medicines`)

  const paracetamol = catalog[0]!
  const inSixMonths = new Date()
  inSixMonths.setMonth(inSixMonths.getMonth() + 6)

  const existingBatch = await db
    .select()
    .from(inventoryBatches)
    .where(eq(inventoryBatches.batchNumber, 'BATCH-DEMO-001'))
    .limit(1)

  let batchId: string
  if (existingBatch[0]) {
    batchId = existingBatch[0].id
  } else {
    const [batch] = await db
      .insert(inventoryBatches)
      .values({
        organizationId: pharmacyOrg.id,
        medicineId: paracetamol.id,
        batchNumber: 'BATCH-DEMO-001',
        expiryDate: inSixMonths.toISOString().slice(0, 10),
        quantityOnHand: 200,
        unit: 'strip',
        storageType: 'room_temperature',
        sealedStatus: 'sealed',
      })
      .returning()
    batchId = batch!.id
  }

  const existingListing = await db
    .select()
    .from(listings)
    .where(eq(listings.batchId, batchId))
    .limit(1)

  if (!existingListing[0]) {
    await db.insert(listings).values({
      batchId,
      sellerOrgId: pharmacyOrg.id,
      quantityListed: 200,
      quantityAvailable: 200,
      photoUrls: [],
      pickupCity: 'Boston',
      pickupCountry: 'USA',
      status: 'active',
      submittedAt: new Date(),
      approvedAt: new Date(),
      approvedByUserId: adminUser.id,
      createdByUserId: sellerOwner.id,
      notes: 'Demo listing for development.',
    })
  }
  console.log('Demo batch + listing ready.')

  console.log('\nDone.\n')
  console.log('Login credentials:')
  console.log('  super_admin:    super-admin@medmove.dev / SuperAdminPass123!')
  console.log('  admin:          admin@medmove.dev / AdminPass123!')
  console.log('  seller:         pharmacy-owner@medmove.dev / PharmaPass123!')
  console.log('  buyer:          hospital-owner@medmove.dev / HospitalPass123!')
  console.log('  logistics_user: logistics-owner@medmove.dev / LogisticsPass123!')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
