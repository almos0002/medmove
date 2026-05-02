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
