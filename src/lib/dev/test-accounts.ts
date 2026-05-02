/**
 * DEV-ONLY: Hard-coded list of seeded test accounts surfaced by the
 * sign-in page's "Test accounts" picker.
 *
 * Must stay in sync with `scripts/seed.ts`. Imported only from the
 * sign-in page, which itself only renders the picker when
 * `import.meta.env.DEV === true` — Vite tree-shakes this module out
 * of production bundles entirely.
 */
export type TestAccount = {
  email: string
  password: string
  name: string
  role:
    | 'super_admin'
    | 'admin'
    | 'org_owner'
    | 'org_staff'
    | 'logistics_staff'
  orgLabel: string
}

export const TEST_ACCOUNTS: TestAccount[] = [
  {
    email: 'super-admin@medmove.dev',
    password: 'SuperAdminPass123!',
    name: 'MedMove Super Admin',
    role: 'super_admin',
    orgLabel: 'Platform',
  },
  {
    email: 'admin@medmove.dev',
    password: 'AdminPass123!',
    name: 'MedMove Admin',
    role: 'admin',
    orgLabel: 'Platform',
  },
  {
    email: 'pharmacy-owner@medmove.dev',
    password: 'PharmaPass123!',
    name: 'Priya Pharmacy Owner',
    role: 'org_owner',
    orgLabel: 'GoodHealth Pharmacy (verified)',
  },
  {
    email: 'pharmacy2-owner@medmove.dev',
    password: 'Pharma2Pass123!',
    name: 'Pavel Pharmacy Two Owner',
    role: 'org_owner',
    orgLabel: 'CityCare Pharmacy (verified)',
  },
  {
    email: 'pending-pharmacy@medmove.dev',
    password: 'PendingPass123!',
    name: 'Pat Pending Pharmacy',
    role: 'org_owner',
    orgLabel: 'BrightSide Pharmacy (pending verification)',
  },
  {
    email: 'clinic-owner@medmove.dev',
    password: 'ClinicPass123!',
    name: 'Carla Clinic Owner',
    role: 'org_owner',
    orgLabel: 'Riverside Family Clinic (verified)',
  },
  {
    email: 'hospital-owner@medmove.dev',
    password: 'HospitalPass123!',
    name: 'Henry Hospital Owner',
    role: 'org_owner',
    orgLabel: "St Mary's Community Hospital (verified)",
  },
  {
    email: 'ngo-owner@medmove.dev',
    password: 'NgoPass123!',
    name: 'Nora NGO Owner',
    role: 'org_owner',
    orgLabel: 'OpenHands Relief (verified)',
  },
  {
    email: 'distributor-owner@medmove.dev',
    password: 'DistribPass123!',
    name: 'Dana Distributor Owner',
    role: 'org_owner',
    orgLabel: 'NorthStar Distribution (verified)',
  },
  {
    email: 'logistics-owner@medmove.dev',
    password: 'LogisticsPass123!',
    name: 'Liam Logistics Owner',
    role: 'org_owner',
    orgLabel: 'SwiftMove Logistics (verified)',
  },
  {
    email: 'pharmacy-staff@medmove.dev',
    password: 'StaffPass123!',
    name: 'Sam Pharmacy Staff',
    role: 'org_staff',
    orgLabel: 'GoodHealth Pharmacy (verified)',
  },
  {
    email: 'logistics-staff@medmove.dev',
    password: 'LogStaffPass123!',
    name: 'Lena Logistics Staff',
    role: 'logistics_staff',
    orgLabel: 'SwiftMove Logistics (verified)',
  },
]

export function formatRoleLabel(role: TestAccount['role']): string {
  switch (role) {
    case 'super_admin':
      return 'Super admin'
    case 'admin':
      return 'Admin'
    case 'org_owner':
      return 'Org owner'
    case 'org_staff':
      return 'Org staff'
    case 'logistics_staff':
      return 'Logistics staff'
  }
}
