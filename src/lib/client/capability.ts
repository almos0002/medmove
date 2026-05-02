import {
  CAPABILITIES,
  type Capability,
  type AppRole,
  type OrgType,
  ROLES,
  isAdminRole,
  isOrgOwner,
} from '@/lib/permissions'

/**
 * Client-side capability helpers. These are UX gates only — the server
 * always re-checks via `requireCapability`. Treat them as "hide the
 * button if it would 403 anyway", never as security.
 */

export type SessionUser = { id: string; email: string; role: AppRole } | null
export type SessionOrg = {
  id: string
  type: OrgType
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'suspended'
  canListMedicine: boolean
  canRequestMedicine: boolean
  canDeliverMedicine: boolean
} | null

export function clientHasCapability(
  user: SessionUser,
  org: SessionOrg,
  cap: Capability,
): boolean {
  if (!user) return false
  if (isAdminRole(user.role)) return true
  if (!org) return false
  if (org.verificationStatus !== 'verified') return false
  switch (cap) {
    case CAPABILITIES.CAN_LIST_MEDICINE:
      return org.canListMedicine
    case CAPABILITIES.CAN_REQUEST_MEDICINE:
      return org.canRequestMedicine
    case CAPABILITIES.CAN_DELIVER_MEDICINE:
      return org.canDeliverMedicine
  }
}

export function canEditOrganizationProfile(
  user: SessionUser,
  org: SessionOrg,
): boolean {
  if (!user || !org) return false
  if (isAdminRole(user.role)) return true
  if (!isOrgOwner(user.role)) return false
  // Owners can only edit while not yet verified (pending or rejected).
  return (
    org.verificationStatus === 'pending' ||
    org.verificationStatus === 'rejected'
  )
}

export function canUploadOrgDocuments(
  user: SessionUser,
  org: SessionOrg,
): boolean {
  if (!user || !org) return false
  if (isAdminRole(user.role)) return true
  // Per `uploadOrganizationDocument`: any org member can upload, but only
  // while the org is not yet verified.
  if (user.role !== ROLES.ORG_OWNER && user.role !== ROLES.ORG_STAFF)
    return false
  return org.verificationStatus !== 'verified'
}
