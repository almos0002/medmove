/**
 * Step 11 — registry of all known audit event types.
 *
 * `writeAudit()` accepts free-form `action` strings, but the platform writes
 * a fixed, well-known set today. Centralising them here gives us:
 *   - One source of truth for filter dropdowns / labels / tones in the UI.
 *   - Type-safety for callers that want it (`AuditAction`).
 *   - A list to seed the `?action=` filter on the audit logs page.
 *
 * The audit_logs table itself stays append-only and the column stays `text`
 * so we can introduce new actions without a migration.
 */

export const AUDIT_ENTITY_TYPES = [
  'organization',
  'organization_document',
  'medicine',
  'inventory_batch',
  'listing',
  'transfer_request',
  'delivery',
] as const
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number]

export const AUDIT_ENTITY_LABELS: Record<AuditEntityType, string> = {
  organization: 'Organization',
  organization_document: 'Document',
  medicine: 'Medicine',
  inventory_batch: 'Inventory batch',
  listing: 'Listing',
  transfer_request: 'Transfer request',
  delivery: 'Delivery',
}

export const AUDIT_ACTIONS = [
  // organizations
  'organization.created',
  'organization.verified',
  'organization.rejected',
  'organization.suspended',
  'organization.capabilities_updated',
  'organization_document.uploaded',
  'organization_document.approved',
  'organization_document.rejected',
  // medicines + inventory
  'medicine.created',
  'medicine.updated',
  'inventory_batch.created',
  'inventory_batch.decremented',
  // listings
  'listing.created',
  'listing.submitted',
  'listing.withdrawn',
  'listing.approved',
  'listing.rejected',
  'listing.quantity_decremented',
  'listing.quantity_restored',
  'listing.sold_out',
  'listing.reopened',
  // transfer requests
  'transfer_request.created',
  'transfer_request.admin_approved',
  'transfer_request.admin_rejected',
  'transfer_request.seller_accepted',
  'transfer_request.seller_declined',
  'transfer_request.awaiting_handoff',
  'transfer_request.dispatched',
  'transfer_request.completed',
  'transfer_request.cancelled',
  // deliveries
  'delivery.created',
  'delivery.logistics_assigned',
  'delivery.pickup_scheduled',
  'delivery.picked_up',
  'delivery.in_transit',
  'delivery.confirmed',
  'delivery.failed',
  'delivery.cancelled',
  'delivery.disputed',
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

/**
 * Friendly human label for an action. Falls back to a prettified form if
 * the audit row uses an action we haven't registered yet (forward-compat).
 */
export function auditActionLabel(action: string): string {
  const known = AUDIT_ACTION_LABELS[action as AuditAction]
  if (known) return known
  // foo.bar_baz → "Bar baz" prefixed by entity
  const [entity, rest = ''] = action.split('.')
  const verb = rest.replace(/_/g, ' ').trim()
  const entityLabel =
    AUDIT_ENTITY_LABELS[entity as AuditEntityType] ?? entity.replace(/_/g, ' ')
  return `${entityLabel} · ${verb || 'event'}`
}

const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  'organization.created': 'Organization registered',
  'organization.verified': 'Organization verified',
  'organization.rejected': 'Organization rejected',
  'organization.suspended': 'Organization suspended',
  'organization.capabilities_updated': 'Capabilities updated',
  'organization_document.uploaded': 'Document uploaded',
  'organization_document.approved': 'Document approved',
  'organization_document.rejected': 'Document rejected',
  'medicine.created': 'Medicine added',
  'medicine.updated': 'Medicine updated',
  'inventory_batch.created': 'Batch added to inventory',
  'inventory_batch.decremented': 'Batch quantity decremented',
  'listing.created': 'Listing drafted',
  'listing.submitted': 'Listing submitted for review',
  'listing.withdrawn': 'Listing withdrawn',
  'listing.approved': 'Listing approved',
  'listing.rejected': 'Listing rejected',
  'listing.quantity_decremented': 'Listing quantity decreased',
  'listing.quantity_restored': 'Listing quantity restored',
  'listing.sold_out': 'Listing sold out',
  'listing.reopened': 'Listing reopened',
  'transfer_request.created': 'Transfer request submitted',
  'transfer_request.admin_approved': 'Request approved by admin',
  'transfer_request.admin_rejected': 'Request rejected by admin',
  'transfer_request.seller_accepted': 'Request accepted by seller',
  'transfer_request.seller_declined': 'Request declined by seller',
  'transfer_request.awaiting_handoff': 'Awaiting handoff',
  'transfer_request.dispatched': 'Request dispatched',
  'transfer_request.completed': 'Transfer completed',
  'transfer_request.cancelled': 'Transfer cancelled',
  'delivery.created': 'Delivery created',
  'delivery.logistics_assigned': 'Logistics assigned',
  'delivery.pickup_scheduled': 'Pickup scheduled',
  'delivery.picked_up': 'Picked up',
  'delivery.in_transit': 'In transit',
  'delivery.confirmed': 'Delivery confirmed',
  'delivery.failed': 'Delivery failed',
  'delivery.cancelled': 'Delivery cancelled',
  'delivery.disputed': 'Delivery disputed',
}

export type AuditTone =
  | 'neutral'
  | 'success'
  | 'warn'
  | 'danger'
  | 'accent'
  | 'outline'

/**
 * Map an action to a Badge tone for visual scanning. Anything "approval-ish"
 * is success, "rejection/failure" is danger, "submitted/created" is accent,
 * fallbacks to neutral.
 */
export function auditActionTone(action: string): AuditTone {
  if (
    action.endsWith('.verified') ||
    action.endsWith('.approved') ||
    action.endsWith('.confirmed') ||
    action.endsWith('.completed') ||
    action === 'transfer_request.seller_accepted' ||
    action === 'transfer_request.admin_approved' ||
    action === 'listing.reopened' ||
    action === 'listing.quantity_restored'
  ) {
    return 'success'
  }
  if (
    action.endsWith('.rejected') ||
    action.endsWith('.failed') ||
    action.endsWith('.disputed') ||
    action.endsWith('.cancelled') ||
    action.endsWith('.declined') ||
    action.endsWith('.suspended') ||
    action === 'transfer_request.seller_declined' ||
    action === 'transfer_request.admin_rejected'
  ) {
    return 'danger'
  }
  if (
    action.endsWith('.submitted') ||
    action.endsWith('.created') ||
    action.endsWith('.uploaded')
  ) {
    return 'accent'
  }
  if (
    action.endsWith('.scheduled') ||
    action.endsWith('.picked_up') ||
    action.endsWith('.in_transit') ||
    action.endsWith('.dispatched') ||
    action.endsWith('.awaiting_handoff') ||
    action.endsWith('.logistics_assigned') ||
    action === 'organization.capabilities_updated'
  ) {
    return 'warn'
  }
  return 'neutral'
}
