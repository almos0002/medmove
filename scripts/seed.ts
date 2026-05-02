/**
 * MedMove dev seed — Step 14 expanded.
 *
 * Idempotent. Safe to re-run after schema or capability changes.
 *
 * Creates:
 *   • 1 super_admin, 1 admin
 *   • 2 verified pharmacies, 1 pending pharmacy
 *   • 1 verified clinic, 1 verified hospital
 *   • 1 verified NGO, 1 verified distributor
 *   • 1 verified logistics partner
 *   • 10 catalog medicines
 *   • Inventory batches per verified org
 *   • Listings (active + pending_admin)
 *   • Transfer requests in pending_admin / accepted / completed states
 *   • Deliveries in pending / in_transit / delivered states
 *   • Sample in-app notifications + audit log entries
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
  transferRequests,
  deliveries,
  notifications,
  auditLogs,
} from '../src/lib/schema'

/**
 * Per-medicine listing photos. Stable, public picsum.photos URLs keyed
 * by a deterministic seed slug so each medicine card is visually
 * distinct across re-seeds. Out of scope: real object-storage uploads.
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
import {
  ROLES,
  defaultCapabilitiesForType,
  type AppRole,
  type OrgType,
} from '../src/lib/permissions'

type OrgVerificationStatusValue =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'suspended'

// Trusted bootstrap path: lets the seed script create admin/super_admin users
// despite the public-signup role allowlist enforced in src/lib/auth.ts. The
// env var must be exported by the npm script (`npm run db:seed`) BEFORE the
// process boots.
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
  verificationStatus?: OrgVerificationStatusValue
  rejectionReason?: string | null
}) {
  const verificationStatus = args.verificationStatus ?? 'verified'
  const existing = await db
    .select()
    .from(organizations)
    .where(eq(organizations.licenseNumber, args.licenseNumber))
    .limit(1)
  if (existing[0]) {
    // Re-stamp capabilities + verification on every run so the seed is
    // self-healing across schema/role/capability changes.
    const caps = defaultCapabilitiesForType(args.type)
    const wantsCaps = verificationStatus === 'verified'
    await db
      .update(organizations)
      .set({
        canListMedicine: wantsCaps && caps.canListMedicine,
        canRequestMedicine: wantsCaps && caps.canRequestMedicine,
        canDeliverMedicine: wantsCaps && caps.canDeliverMedicine,
        verificationStatus,
        verifiedAt: verificationStatus === 'verified' ? new Date() : null,
        rejectionReason: args.rejectionReason ?? null,
      })
      .where(eq(organizations.id, existing[0].id))
    return { ...existing[0], ...caps, verificationStatus }
  }

  const caps = defaultCapabilitiesForType(args.type)
  const wantsCaps = verificationStatus === 'verified'
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
      verificationStatus,
      verifiedAt: verificationStatus === 'verified' ? new Date() : null,
      rejectionReason: args.rejectionReason ?? null,
      canListMedicine: wantsCaps && caps.canListMedicine,
      canRequestMedicine: wantsCaps && caps.canRequestMedicine,
      canDeliverMedicine: wantsCaps && caps.canDeliverMedicine,
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
  if (existing[0]?.organizationId === orgId) return existing[0]
  if (existing[0]) return existing[0] // already in another org
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
  storageType?: 'room_temperature' | 'cool_dry_place'
  sealedStatus?: 'sealed' | 'opened'
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
      storageType: args.storageType ?? 'room_temperature',
      sealedStatus: args.sealedStatus ?? 'sealed',
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
  if (existing[0]) {
    // Re-stamp photoUrls on every run so reseeds backfill demo images.
    if (args.photoUrls && args.photoUrls.length > 0) {
      await db
        .update(listings)
        .set({ photoUrls: args.photoUrls })
        .where(eq(listings.id, existing[0].id))
      return { ...existing[0], photoUrls: args.photoUrls }
    }
    return existing[0]
  }
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

async function ensureTransferRequest(args: {
  listingId: string
  requesterOrgId: string
  requesterUserId: string
  quantity: number
  intendedUse: string
  status: 'pending_admin' | 'accepted' | 'completed'
  adminUserId: string
  sellerUserId: string
}) {
  const existing = await db
    .select()
    .from(transferRequests)
    .where(
      and(
        eq(transferRequests.listingId, args.listingId),
        eq(transferRequests.requesterOrgId, args.requesterOrgId),
      ),
    )
    .limit(1)
  if (existing[0]) return existing[0]

  const expires = new Date()
  expires.setDate(expires.getDate() + 14)
  const now = new Date()

  const [row] = await db
    .insert(transferRequests)
    .values({
      listingId: args.listingId,
      requesterOrgId: args.requesterOrgId,
      requesterUserId: args.requesterUserId,
      quantityRequested: args.quantity,
      intendedUse: args.intendedUse,
      status: args.status,
      expiresAt: expires,
      adminReviewedByUserId:
        args.status === 'accepted' || args.status === 'completed'
          ? args.adminUserId
          : null,
      adminReviewedAt:
        args.status === 'accepted' || args.status === 'completed' ? now : null,
      sellerReviewedByUserId:
        args.status === 'accepted' || args.status === 'completed'
          ? args.sellerUserId
          : null,
      sellerReviewedAt:
        args.status === 'accepted' || args.status === 'completed' ? now : null,
      completedAt: args.status === 'completed' ? now : null,
    })
    .returning()
  return row!
}

async function ensureDelivery(args: {
  transferRequestId: string
  pickupAddress: string
  dropoffAddress: string
  sellerContact: { name: string; phone: string }
  buyerContact: { name: string; phone: string }
  status: 'pending' | 'in_transit' | 'delivered'
  receivedQuantity?: number
}) {
  const existing = await db
    .select()
    .from(deliveries)
    .where(eq(deliveries.transferRequestId, args.transferRequestId))
    .limit(1)
  if (existing[0]) return existing[0]

  const now = new Date()
  const earlier = new Date(now.getTime() - 1000 * 60 * 60 * 24)

  const [row] = await db
    .insert(deliveries)
    .values({
      transferRequestId: args.transferRequestId,
      dispatchMethod: 'third_party_courier',
      pickupAddress: args.pickupAddress,
      dropoffAddress: args.dropoffAddress,
      sellerContactName: args.sellerContact.name,
      sellerContactPhone: args.sellerContact.phone,
      buyerContactName: args.buyerContact.name,
      buyerContactPhone: args.buyerContact.phone,
      pickupScheduledAt:
        args.status !== 'pending' ? earlier : null,
      pickedUpAt: args.status !== 'pending' ? earlier : null,
      dispatchedAt: args.status !== 'pending' ? earlier : null,
      receivedAt: args.status === 'delivered' ? now : null,
      receivedQuantity: args.status === 'delivered' ? args.receivedQuantity : null,
      status: args.status,
    })
    .returning()
  return row!
}

async function ensureNotificationDemo(args: {
  recipientUserId: string
  recipientOrgId?: string
  type:
    | 'organization.verified'
    | 'listing.approved'
    | 'transfer_request.created'
    | 'delivery.in_transit'
  title: string
  body: string
  link: string
  entityType: string
  entityId: string
}) {
  await db
    .insert(notifications)
    .values({
      audience: args.recipientOrgId ? 'organization' : 'user',
      recipientUserId: args.recipientUserId,
      recipientOrgId: args.recipientOrgId,
      type: args.type,
      severity: 'info',
      title: args.title,
      body: args.body,
      link: args.link,
      entityType: args.entityType,
      entityId: args.entityId,
    })
    .onConflictDoNothing()
}

async function ensureAuditDemo(args: {
  actorUserId: string
  actorOrgId?: string
  action: string
  entityType: string
  entityId: string
  summary: string
}) {
  // Skip if a row with the same (action, entity) already exists for this actor.
  const existing = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.actorUserId, args.actorUserId),
        eq(auditLogs.entityType, args.entityType),
        eq(auditLogs.entityId, args.entityId),
        eq(auditLogs.action, args.action),
      ),
    )
    .limit(1)
  if (existing[0]) return
  await db.insert(auditLogs).values({
    actorUserId: args.actorUserId,
    actorOrgId: args.actorOrgId,
    action: args.action,
    entityType: args.entityType,
    entityId: args.entityId,
    metadata: { summary: args.summary, seed: true },
  })
}

/**
 * Wipe every domain row plus every Better Auth row so the seed is a
 * true reset. FK-safe via TRUNCATE … CASCADE in a single statement —
 * order of names doesn't matter, but we list them explicitly so
 * reviewers see what gets wiped.
 *
 * Nothing is preserved across runs: the seed deterministically
 * recreates the bootstrap super_admin / admin / per-org owners on
 * every run, and Better Auth re-creates session + account rows when
 * those users sign in next.
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
  console.log('Seeding MedMove…')
  console.log('Resetting all domain + auth tables…')
  await resetDatabase()

  // ─── Users ────────────────────────────────────────────────────────────
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
  const pharmacyOwner = await ensureUser({
    email: 'pharmacy-owner@medmove.dev',
    password: 'PharmaPass123!',
    name: 'Priya Pharmacy Owner',
    role: ROLES.ORG_OWNER,
  })
  const pharmacy2Owner = await ensureUser({
    email: 'pharmacy2-owner@medmove.dev',
    password: 'Pharma2Pass123!',
    name: 'Pavel Pharmacy Two Owner',
    role: ROLES.ORG_OWNER,
  })
  const pendingPharmacyOwner = await ensureUser({
    email: 'pending-pharmacy@medmove.dev',
    password: 'PendingPass123!',
    name: 'Pat Pending Pharmacy',
    role: ROLES.ORG_OWNER,
  })
  const clinicOwner = await ensureUser({
    email: 'clinic-owner@medmove.dev',
    password: 'ClinicPass123!',
    name: 'Carla Clinic Owner',
    role: ROLES.ORG_OWNER,
  })
  const hospitalOwner = await ensureUser({
    email: 'hospital-owner@medmove.dev',
    password: 'HospitalPass123!',
    name: 'Henry Hospital Owner',
    role: ROLES.ORG_OWNER,
  })
  const ngoOwner = await ensureUser({
    email: 'ngo-owner@medmove.dev',
    password: 'NgoPass123!',
    name: 'Nora NGO Owner',
    role: ROLES.ORG_OWNER,
  })
  const distributorOwner = await ensureUser({
    email: 'distributor-owner@medmove.dev',
    password: 'DistribPass123!',
    name: 'Dana Distributor Owner',
    role: ROLES.ORG_OWNER,
  })
  const logisticsOwner = await ensureUser({
    email: 'logistics-owner@medmove.dev',
    password: 'LogisticsPass123!',
    name: 'Liam Logistics Owner',
    role: ROLES.ORG_OWNER,
  })
  const pharmacyStaff = await ensureUser({
    email: 'pharmacy-staff@medmove.dev',
    password: 'StaffPass123!',
    name: 'Sam Pharmacy Staff',
    role: ROLES.ORG_STAFF,
  })
  const logisticsStaff = await ensureUser({
    email: 'logistics-staff@medmove.dev',
    password: 'LogStaffPass123!',
    name: 'Lena Logistics Staff',
    role: ROLES.LOGISTICS_STAFF,
  })

  console.log('Users ready.')

  // ─── Organisations ────────────────────────────────────────────────────
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
  const pharmacy2Org = await ensureOrg({
    name: 'CityCare Pharmacy',
    type: 'pharmacy',
    licenseNumber: 'PHARM-LIC-0002',
    contactEmail: 'hello@citycare.test',
    contactPhone: '+1-555-0150',
    city: 'New York',
    country: 'USA',
    ownerUserId: pharmacy2Owner.id,
  })
  const pendingPharmacyOrg = await ensureOrg({
    name: 'BrightSide Pharmacy',
    type: 'pharmacy',
    licenseNumber: 'PHARM-LIC-PENDING',
    contactEmail: 'apply@brightside.test',
    contactPhone: '+1-555-0175',
    city: 'Austin',
    country: 'USA',
    ownerUserId: pendingPharmacyOwner.id,
    verificationStatus: 'pending',
  })
  const clinicOrg = await ensureOrg({
    name: 'Riverside Family Clinic',
    type: 'clinic',
    licenseNumber: 'CLIN-LIC-0001',
    contactEmail: 'office@riverside.test',
    contactPhone: '+1-555-0180',
    city: 'Cambridge',
    country: 'USA',
    ownerUserId: clinicOwner.id,
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
  const ngoOrg = await ensureOrg({
    name: 'OpenHands Relief',
    type: 'ngo',
    licenseNumber: 'NGO-LIC-0001',
    contactEmail: 'team@openhands.test',
    contactPhone: '+1-555-0220',
    city: 'Brooklyn',
    country: 'USA',
    ownerUserId: ngoOwner.id,
  })
  const distributorOrg = await ensureOrg({
    name: 'NorthStar Distribution',
    type: 'distributor',
    licenseNumber: 'DIST-LIC-0001',
    contactEmail: 'ops@northstar.test',
    contactPhone: '+1-555-0250',
    city: 'Boston',
    country: 'USA',
    ownerUserId: distributorOwner.id,
  })
  const logisticsOrg = await ensureOrg({
    name: 'SwiftMove Logistics',
    type: 'logistics_partner',
    licenseNumber: 'LOG-LIC-0001',
    contactEmail: 'ops@swiftmove.test',
    contactPhone: '+1-555-0300',
    city: 'Boston',
    country: 'USA',
    ownerUserId: logisticsOwner.id,
  })

  await ensureMembership(pharmacyOrg.id, pharmacyStaff.id, 'member')
  await ensureMembership(logisticsOrg.id, logisticsStaff.id, 'member')

  console.log('Organisations ready (incl. pending pharmacy + clinic + NGO).')

  // ─── Catalog ──────────────────────────────────────────────────────────
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
  const [paracetamol, ibuprofen, amoxicillin, , metformin, omeprazole, cetirizine, , ors] = catalog

  // ─── Inventory batches ────────────────────────────────────────────────
  const batchA = await ensureBatch({
    organizationId: pharmacyOrg.id,
    medicineId: paracetamol!.id,
    batchNumber: 'BATCH-DEMO-001',
    quantityOnHand: 200,
    unit: 'strip',
    monthsToExpiry: 6,
  })
  const batchB = await ensureBatch({
    organizationId: pharmacyOrg.id,
    medicineId: ibuprofen!.id,
    batchNumber: 'GH-IBU-2026A',
    quantityOnHand: 120,
    unit: 'strip',
    monthsToExpiry: 8,
  })
  const batchC = await ensureBatch({
    organizationId: pharmacy2Org.id,
    medicineId: amoxicillin!.id,
    batchNumber: 'CC-AMOX-2026A',
    quantityOnHand: 80,
    unit: 'box',
    monthsToExpiry: 5,
  })
  const batchD = await ensureBatch({
    organizationId: pharmacy2Org.id,
    medicineId: omeprazole!.id,
    batchNumber: 'CC-OMEP-2026A',
    quantityOnHand: 60,
    unit: 'pack',
    monthsToExpiry: 9,
  })
  const batchE = await ensureBatch({
    organizationId: hospitalOrg.id,
    medicineId: metformin!.id,
    batchNumber: 'STM-MET-2026A',
    quantityOnHand: 300,
    unit: 'pack',
    monthsToExpiry: 4,
  })
  const batchF = await ensureBatch({
    organizationId: hospitalOrg.id,
    medicineId: cetirizine!.id,
    batchNumber: 'STM-CET-2026A',
    quantityOnHand: 90,
    unit: 'strip',
    monthsToExpiry: 11,
  })
  const batchG = await ensureBatch({
    organizationId: clinicOrg.id,
    medicineId: ors!.id,
    batchNumber: 'RV-ORS-2026A',
    quantityOnHand: 250,
    unit: 'sachet',
    monthsToExpiry: 14,
  })
  console.log('Inventory batches ready.')

  // ─── Listings (active + pending_admin) ────────────────────────────────
  const listingA = await ensureListing({
    batchId: batchA.id,
    sellerOrgId: pharmacyOrg.id,
    quantity: 200,
    pickupCity: 'Boston',
    pickupCountry: 'USA',
    status: 'active',
    createdByUserId: pharmacyOwner.id,
    approvedByUserId: adminUser.id,
    notes: 'Approved demo listing — paracetamol surplus.',
    photoUrls: PHOTO_URLS.paracetamol,
  })
  const _listingB = await ensureListing({
    batchId: batchB.id,
    sellerOrgId: pharmacyOrg.id,
    quantity: 120,
    pickupCity: 'Boston',
    pickupCountry: 'USA',
    status: 'pending_admin',
    createdByUserId: pharmacyOwner.id,
    notes: 'Awaiting admin review — ibuprofen surplus.',
    photoUrls: PHOTO_URLS.ibuprofen,
  })
  const listingC = await ensureListing({
    batchId: batchC.id,
    sellerOrgId: pharmacy2Org.id,
    quantity: 80,
    pickupCity: 'New York',
    pickupCountry: 'USA',
    status: 'active',
    createdByUserId: pharmacy2Owner.id,
    approvedByUserId: adminUser.id,
    notes: 'Approved demo listing — amoxicillin.',
    photoUrls: PHOTO_URLS.amoxicillin,
  })
  const _listingD = await ensureListing({
    batchId: batchD.id,
    sellerOrgId: pharmacy2Org.id,
    quantity: 60,
    pickupCity: 'New York',
    pickupCountry: 'USA',
    status: 'pending_admin',
    createdByUserId: pharmacy2Owner.id,
    notes: 'Awaiting admin review — omeprazole.',
    photoUrls: PHOTO_URLS.omeprazole,
  })
  const listingE = await ensureListing({
    batchId: batchE.id,
    sellerOrgId: hospitalOrg.id,
    quantity: 300,
    pickupCity: 'Cambridge',
    pickupCountry: 'USA',
    status: 'active',
    createdByUserId: hospitalOwner.id,
    approvedByUserId: adminUser.id,
    notes: 'Approved demo listing — metformin from hospital surplus.',
    photoUrls: PHOTO_URLS.metformin,
  })
  const _listingF = await ensureListing({
    batchId: batchF.id,
    sellerOrgId: hospitalOrg.id,
    quantity: 90,
    pickupCity: 'Cambridge',
    pickupCountry: 'USA',
    status: 'active',
    createdByUserId: hospitalOwner.id,
    approvedByUserId: adminUser.id,
    notes: 'Approved demo listing — cetirizine.',
    photoUrls: PHOTO_URLS.cetirizine,
  })
  // batchG (clinic) is intentionally NOT listed — clinics typically request,
  // not list. It seeds inventory so the clinic can show "On hand" data.
  void batchG
  console.log('Listings ready.')

  // ─── Transfer requests ────────────────────────────────────────────────
  const trPending = await ensureTransferRequest({
    listingId: listingA.id,
    requesterOrgId: clinicOrg.id,
    requesterUserId: clinicOwner.id,
    quantity: 40,
    intendedUse: 'Walk-in pain relief stock for the next quarter.',
    status: 'pending_admin',
    adminUserId: adminUser.id,
    sellerUserId: pharmacyOwner.id,
  })
  const trAccepted = await ensureTransferRequest({
    listingId: listingC.id,
    requesterOrgId: ngoOrg.id,
    requesterUserId: ngoOwner.id,
    quantity: 30,
    intendedUse: 'Free clinic week for under-served neighbourhoods.',
    status: 'accepted',
    adminUserId: adminUser.id,
    sellerUserId: pharmacy2Owner.id,
  })
  const trCompleted = await ensureTransferRequest({
    listingId: listingE.id,
    requesterOrgId: clinicOrg.id,
    requesterUserId: clinicOwner.id,
    quantity: 60,
    intendedUse: 'Diabetes follow-up programme — quarterly stock.',
    status: 'completed',
    adminUserId: adminUser.id,
    sellerUserId: hospitalOwner.id,
  })
  console.log('Transfer requests ready (pending / accepted / completed).')

  // ─── Deliveries ───────────────────────────────────────────────────────
  await ensureDelivery({
    transferRequestId: trAccepted.id,
    pickupAddress: 'CityCare Pharmacy, New York, USA',
    dropoffAddress: 'OpenHands Relief, Brooklyn, USA',
    sellerContact: { name: pharmacy2Owner.name ?? 'Pavel', phone: '+1-555-0150' },
    buyerContact: { name: ngoOwner.name ?? 'Nora', phone: '+1-555-0220' },
    status: 'pending',
  })
  await ensureDelivery({
    transferRequestId: trPending.id,
    pickupAddress: 'GoodHealth Pharmacy, Boston, USA',
    dropoffAddress: 'Riverside Family Clinic, Cambridge, USA',
    sellerContact: { name: pharmacyOwner.name ?? 'Priya', phone: '+1-555-0100' },
    buyerContact: { name: clinicOwner.name ?? 'Carla', phone: '+1-555-0180' },
    status: 'in_transit',
  })
  await ensureDelivery({
    transferRequestId: trCompleted.id,
    pickupAddress: "St Mary's Community Hospital, Cambridge, USA",
    dropoffAddress: 'Riverside Family Clinic, Cambridge, USA',
    sellerContact: { name: hospitalOwner.name ?? 'Henry', phone: '+1-555-0200' },
    buyerContact: { name: clinicOwner.name ?? 'Carla', phone: '+1-555-0180' },
    status: 'delivered',
    receivedQuantity: 60,
  })
  console.log('Deliveries ready (pending / in_transit / delivered).')

  // ─── Notifications ────────────────────────────────────────────────────
  await ensureNotificationDemo({
    recipientUserId: pharmacyOwner.id,
    recipientOrgId: pharmacyOrg.id,
    type: 'organization.verified',
    title: 'GoodHealth Pharmacy verified',
    body: 'Your organisation is verified. You can now list and request medicine.',
    link: '/org',
    entityType: 'organization',
    entityId: pharmacyOrg.id,
  })
  await ensureNotificationDemo({
    recipientUserId: pharmacyOwner.id,
    recipientOrgId: pharmacyOrg.id,
    type: 'listing.approved',
    title: 'Listing approved',
    body: 'Your paracetamol listing is now visible on the marketplace.',
    link: `/org/listings/${listingA.id}`,
    entityType: 'listing',
    entityId: listingA.id,
  })
  await ensureNotificationDemo({
    recipientUserId: clinicOwner.id,
    recipientOrgId: clinicOrg.id,
    type: 'transfer_request.created',
    title: 'Request submitted',
    body: 'Your request for paracetamol is awaiting admin review.',
    link: `/org/requests/${trPending.id}`,
    entityType: 'transfer_request',
    entityId: trPending.id,
  })
  await ensureNotificationDemo({
    recipientUserId: clinicOwner.id,
    recipientOrgId: clinicOrg.id,
    type: 'delivery.in_transit',
    title: 'Delivery in transit',
    body: 'Paracetamol from GoodHealth Pharmacy is on the way.',
    link: `/org/deliveries/incoming`,
    entityType: 'transfer_request',
    entityId: trPending.id,
  })
  console.log('Notifications ready.')

  // ─── Audit log demo entries ───────────────────────────────────────────
  await ensureAuditDemo({
    actorUserId: adminUser.id,
    action: 'organization.verified',
    entityType: 'organization',
    entityId: pharmacyOrg.id,
    summary: 'Verified GoodHealth Pharmacy',
  })
  await ensureAuditDemo({
    actorUserId: adminUser.id,
    action: 'listing.approved',
    entityType: 'listing',
    entityId: listingA.id,
    summary: 'Approved paracetamol listing',
  })
  await ensureAuditDemo({
    actorUserId: adminUser.id,
    action: 'transfer_request.completed',
    entityType: 'transfer_request',
    entityId: trCompleted.id,
    summary: 'Marked metformin transfer as completed',
  })
  console.log('Audit log demo entries ready.')

  // ─── Summary ──────────────────────────────────────────────────────────
  console.log('\nDone.\n')
  console.log('Login credentials:')
  console.log('  super_admin:        super-admin@medmove.dev / SuperAdminPass123!')
  console.log('  admin:              admin@medmove.dev / AdminPass123!')
  console.log('  pharmacy 1 (verif): pharmacy-owner@medmove.dev / PharmaPass123!')
  console.log('  pharmacy 2 (verif): pharmacy2-owner@medmove.dev / Pharma2Pass123!')
  console.log('  pharmacy (pending): pending-pharmacy@medmove.dev / PendingPass123!')
  console.log('  clinic (verif):     clinic-owner@medmove.dev / ClinicPass123!')
  console.log('  hospital (verif):   hospital-owner@medmove.dev / HospitalPass123!')
  console.log('  ngo (verif):        ngo-owner@medmove.dev / NgoPass123!')
  console.log('  distributor:        distributor-owner@medmove.dev / DistribPass123!')
  console.log('  logistics owner:    logistics-owner@medmove.dev / LogisticsPass123!')
  console.log('  pharmacy staff:     pharmacy-staff@medmove.dev / StaffPass123!')
  console.log('  logistics staff:    logistics-staff@medmove.dev / LogStaffPass123!')

  // Reference no-ops to please the linter — these are intentionally seeded
  // for hand-testing and have no further work in this script.
  void superAdminUser
  void distributorOrg
  void pendingPharmacyOrg
  void _listingB
  void _listingD
  void _listingF
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
