/**
 * MedMove dev seed.
 *
 * Creates:
 *  - 1 admin user
 *  - 1 verified pharmacy org (with owner)
 *  - 1 verified hospital org (with owner)
 *  - 10 medicines in the catalog
 *  - 1 inventory batch + 1 active listing for the pharmacy
 *
 * Run:  npm run db:seed
 *
 * Idempotent: re-running won't duplicate orgs/medicines/users
 * (matches by license number / email / name+strength+form).
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

type SeedUser = {
  email: string
  password: string
  name: string
  role: 'admin' | 'pharmacy' | 'hospital_ngo'
}

async function ensureUser(u: SeedUser) {
  const existing = await db.select().from(user).where(eq(user.email, u.email)).limit(1)
  if (existing[0]) return existing[0]

  const result = await auth.api.signUpEmail({
    body: {
      email: u.email,
      password: u.password,
      name: u.name,
      // additionalFields registered in auth.ts
      role: u.role,
    } as Parameters<typeof auth.api.signUpEmail>[0]['body'],
  })

  if (!result || !('user' in result) || !result.user) {
    throw new Error(`Failed to create user ${u.email}`)
  }
  return (await db.select().from(user).where(eq(user.email, u.email)).limit(1))[0]!
}

async function ensureOrg(args: {
  name: string
  type: 'pharmacy' | 'hospital' | 'clinic' | 'ngo'
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

  const adminUser = await ensureUser({
    email: 'admin@medmove.dev',
    password: 'AdminPass123!',
    name: 'MedMove Admin',
    role: 'admin',
  })
  const pharmacyOwner = await ensureUser({
    email: 'pharmacy-owner@medmove.dev',
    password: 'PharmaPass123!',
    name: 'Priya Pharmacy Owner',
    role: 'pharmacy',
  })
  const hospitalOwner = await ensureUser({
    email: 'hospital-owner@medmove.dev',
    password: 'HospitalPass123!',
    name: 'Henry Hospital Owner',
    role: 'hospital_ngo',
  })
  console.log(`Users: admin=${adminUser.id} pharmacy=${pharmacyOwner.id} hospital=${hospitalOwner.id}`)

  const pharmacyOrg = await ensureOrg({
    name: 'GoodHealth Pharmacy',
    type: 'pharmacy',
    licenseNumber: 'PHARM-LIC-0001',
    contactEmail: 'contact@goodhealth.test',
    contactPhone: '+1-555-0100',
    city: 'Boston',
    country: 'USA',
    ownerUserId: pharmacyOwner.id,
  })
  const hospitalOrg = await ensureOrg({
    name: "St Mary's Community Hospital",
    type: 'hospital',
    licenseNumber: 'HOSP-LIC-0001',
    contactEmail: 'admin@stmarys.test',
    contactPhone: '+1-555-0200',
    city: 'Cambridge',
    country: 'USA',
    ownerUserId: hospitalOwner.id,
  })
  console.log(`Orgs: pharmacy=${pharmacyOrg.id} hospital=${hospitalOrg.id}`)

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
      createdByUserId: pharmacyOwner.id,
      notes: 'Demo listing for development.',
    })
  }
  console.log('Demo batch + listing ready.')

  console.log('\nDone.\n')
  console.log('Login credentials:')
  console.log('  admin:    admin@medmove.dev / AdminPass123!')
  console.log('  pharmacy: pharmacy-owner@medmove.dev / PharmaPass123!')
  console.log('  hospital: hospital-owner@medmove.dev / HospitalPass123!')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
