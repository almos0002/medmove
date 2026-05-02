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
    email: 'org1-owner@medmove.dev',
    password: 'Org1OwnerPass123!',
    name: 'Olivia Org One Owner',
    role: 'org_owner',
    orgLabel: 'SwiftMove Logistics (verified)',
  },
  {
    email: 'org2-owner@medmove.dev',
    password: 'Org2OwnerPass123!',
    name: 'Oscar Org Two Owner',
    role: 'org_owner',
    orgLabel: 'NorthStar Delivery (verified)',
  },
  {
    email: 'logistics1@medmove.dev',
    password: 'Logistics1Pass123!',
    name: 'Liam Logistics One',
    role: 'logistics_staff',
    orgLabel: 'SwiftMove Logistics (verified)',
  },
  {
    email: 'logistics2@medmove.dev',
    password: 'Logistics2Pass123!',
    name: 'Lena Logistics Two',
    role: 'logistics_staff',
    orgLabel: 'NorthStar Delivery (verified)',
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
