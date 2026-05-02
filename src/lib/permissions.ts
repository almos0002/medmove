/**
 * MedMove RBAC + capability model (Step 4 — revised).
 *
 * IMPORTANT design notes:
 * - User roles describe *what kind of actor* a person is (admin, member of an
 *   organisation, logistics worker). They are stored on `user.role`.
 * - Organization capabilities describe *what business actions an org may
 *   perform*. They are stored as boolean columns on `organizations`
 *   (`can_list_medicine`, `can_request_medicine`, `can_deliver_medicine`).
 * - In this platform a single org (e.g. a pharmacy) may both LIST and REQUEST
 *   medicine, so user-level "seller" / "buyer" roles would be wrong. The user
 *   has a role; the org has capabilities; every protected server function
 *   must check **both**.
 * - Only verified organisations may exercise capabilities — the capability
 *   guard always re-checks `verificationStatus === 'verified'`.
 * - This file is the single source of truth. Never branch on roles or types
 *   inline; always reference `ROLES`, `ORG_TYPES`, `CAPABILITIES`.
 */

// ─── User roles ────────────────────────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  ORG_OWNER: 'org_owner',
  ORG_STAFF: 'org_staff',
  LOGISTICS_STAFF: 'logistics_staff',
} as const

export type AppRole = (typeof ROLES)[keyof typeof ROLES]

export const ALL_ROLES: ReadonlyArray<AppRole> = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.ORG_OWNER,
  ROLES.ORG_STAFF,
  ROLES.LOGISTICS_STAFF,
] as const

export const ADMIN_ROLES: ReadonlyArray<AppRole> = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
] as const

/** Roles a user may select at public sign-up (admins are bootstrapped). */
export const PUBLIC_SIGNUP_ROLES: ReadonlyArray<AppRole> = [
  ROLES.ORG_OWNER,
  ROLES.ORG_STAFF,
  ROLES.LOGISTICS_STAFF,
] as const

/** Roles considered "members of an org" (owner + staff). */
export const ORG_MEMBER_ROLES: ReadonlyArray<AppRole> = [
  ROLES.ORG_OWNER,
  ROLES.ORG_STAFF,
] as const

// ─── Organization types ────────────────────────────────────────────────────
export const ORG_TYPES = {
  PHARMACY: 'pharmacy',
  CLINIC: 'clinic',
  HOSPITAL: 'hospital',
  NGO: 'ngo',
  DISTRIBUTOR: 'distributor',
  LOGISTICS_PARTNER: 'logistics_partner',
} as const

export type OrgType = (typeof ORG_TYPES)[keyof typeof ORG_TYPES]

// ─── Capabilities ──────────────────────────────────────────────────────────
export const CAPABILITIES = {
  CAN_LIST_MEDICINE: 'can_list_medicine',
  CAN_REQUEST_MEDICINE: 'can_request_medicine',
  CAN_DELIVER_MEDICINE: 'can_deliver_medicine',
} as const

export type Capability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES]

/** Shape of capabilities as stored on an organization row. */
export type OrgCapabilities = {
  canListMedicine: boolean
  canRequestMedicine: boolean
  canDeliverMedicine: boolean
}

/**
 * Default capabilities granted to a *new* organization based on its declared
 * type. Admins can adjust these post-verification via
 * `adminUpdateOrganizationCapabilities`. Rules implemented:
 *   - PHARMACY / CLINIC: list + request
 *   - HOSPITAL: request only (admin may enable list)
 *   - NGO: request only
 *   - DISTRIBUTOR: deliver
 *   - LOGISTICS_PARTNER: deliver
 */
export function defaultCapabilitiesForType(type: OrgType): OrgCapabilities {
  switch (type) {
    case ORG_TYPES.PHARMACY:
    case ORG_TYPES.CLINIC:
      return {
        canListMedicine: true,
        canRequestMedicine: true,
        canDeliverMedicine: false,
      }
    case ORG_TYPES.HOSPITAL:
      return {
        canListMedicine: false,
        canRequestMedicine: true,
        canDeliverMedicine: false,
      }
    case ORG_TYPES.NGO:
      return {
        canListMedicine: false,
        canRequestMedicine: true,
        canDeliverMedicine: false,
      }
    case ORG_TYPES.DISTRIBUTOR:
    case ORG_TYPES.LOGISTICS_PARTNER:
      return {
        canListMedicine: false,
        canRequestMedicine: false,
        canDeliverMedicine: true,
      }
  }
}

/**
 * Pure check against an org row's capability flags. Does NOT check
 * verification status — callers should do that, or use the
 * `requireCapability` guard which checks both.
 */
export function hasCapability(
  org: Partial<OrgCapabilities> | null | undefined,
  capability: Capability,
): boolean {
  if (!org) return false
  switch (capability) {
    case CAPABILITIES.CAN_LIST_MEDICINE:
      return !!org.canListMedicine
    case CAPABILITIES.CAN_REQUEST_MEDICINE:
      return !!org.canRequestMedicine
    case CAPABILITIES.CAN_DELIVER_MEDICINE:
      return !!org.canDeliverMedicine
  }
}

// ─── Role helpers ──────────────────────────────────────────────────────────
export function isAdminRole(role: AppRole | null | undefined): boolean {
  return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN
}

export function isOrgMemberRole(role: AppRole | null | undefined): boolean {
  return role === ROLES.ORG_OWNER || role === ROLES.ORG_STAFF
}

export function isOrgOwner(role: AppRole | null | undefined): boolean {
  return role === ROLES.ORG_OWNER
}

export function isLogisticsStaff(role: AppRole | null | undefined): boolean {
  return role === ROLES.LOGISTICS_STAFF
}

/** Default landing page after sign-in for each role. */
export function homePathForRole(role: AppRole | null | undefined): string {
  if (!role) return '/sign-in'
  switch (role) {
    case ROLES.SUPER_ADMIN:
    case ROLES.ADMIN:
      return '/admin'
    case ROLES.ORG_OWNER:
    case ROLES.ORG_STAFF:
      return '/org'
    case ROLES.LOGISTICS_STAFF:
      return '/logistics'
    default:
      return '/dashboard'
  }
}
