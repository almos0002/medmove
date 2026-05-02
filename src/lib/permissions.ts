/**
 * Central definitions of the MedMove RBAC model.
 *
 * Roles live on `user.role` (text column populated by Better Auth's
 * additionalFields). Organization types live on `organizations.type`
 * (Postgres enum).
 *
 * IMPORTANT: this file is the *source of truth* for what a role can do; the
 * server guards in `src/server/guards/` consume it. Never branch on roles
 * inline — always reference `ROLES` and the helpers below so we don't leave
 * dangling string literals when we add new roles.
 */

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  SELLER: 'seller',
  BUYER: 'buyer',
  LOGISTICS_USER: 'logistics_user',
} as const

export type AppRole = (typeof ROLES)[keyof typeof ROLES]

export const ALL_ROLES: ReadonlyArray<AppRole> = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.SELLER,
  ROLES.BUYER,
  ROLES.LOGISTICS_USER,
] as const

export const ADMIN_ROLES: ReadonlyArray<AppRole> = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
] as const

/** Roles a user is allowed to choose at public sign-up. */
export const PUBLIC_SIGNUP_ROLES: ReadonlyArray<AppRole> = [
  ROLES.SELLER,
  ROLES.BUYER,
  ROLES.LOGISTICS_USER,
] as const

export const ORG_TYPES = {
  PHARMACY: 'pharmacy',
  CLINIC: 'clinic',
  HOSPITAL: 'hospital',
  NGO: 'ngo',
  LOGISTICS: 'logistics',
} as const

export type OrgType = (typeof ORG_TYPES)[keyof typeof ORG_TYPES]

/** Org types whose members may act as sellers. */
export const SELLER_ORG_TYPES: ReadonlyArray<OrgType> = [
  ORG_TYPES.PHARMACY,
  ORG_TYPES.CLINIC,
] as const

/** Org types whose members may act as buyers. */
export const BUYER_ORG_TYPES: ReadonlyArray<OrgType> = [
  ORG_TYPES.HOSPITAL,
  ORG_TYPES.CLINIC,
  ORG_TYPES.NGO,
] as const

export const LOGISTICS_ORG_TYPES: ReadonlyArray<OrgType> = [
  ORG_TYPES.LOGISTICS,
] as const

export function isAdminRole(role: AppRole | null | undefined): boolean {
  return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN
}

export function isSeller(role: AppRole | null | undefined): boolean {
  return role === ROLES.SELLER
}

export function isBuyer(role: AppRole | null | undefined): boolean {
  return role === ROLES.BUYER
}

export function isLogisticsUser(role: AppRole | null | undefined): boolean {
  return role === ROLES.LOGISTICS_USER
}

/** Default landing page after sign-in for each role. */
export function homePathForRole(role: AppRole | null | undefined): string {
  if (!role) return '/sign-in'
  switch (role) {
    case ROLES.SUPER_ADMIN:
    case ROLES.ADMIN:
      return '/admin'
    case ROLES.SELLER:
      return '/seller'
    case ROLES.BUYER:
      return '/buyer'
    case ROLES.LOGISTICS_USER:
      return '/logistics'
    default:
      return '/dashboard'
  }
}
