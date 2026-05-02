import { pgEnum } from 'drizzle-orm/pg-core'

export const orgTypeEnum = pgEnum('org_type', [
  'pharmacy',
  'hospital',
  'clinic',
  'ngo',
  'distributor',
  'logistics_partner',
])

export const orgVerificationStatusEnum = pgEnum('org_verification_status', [
  'pending',
  'verified',
  'rejected',
  'suspended',
])

export const orgMemberRoleEnum = pgEnum('org_member_role', ['owner', 'member'])

export const docTypeEnum = pgEnum('document_type', [
  'pharmacy_license',
  'business_registration',
  'tax_certificate',
  'authorized_person_id',
  'other',
])

export const docStatusEnum = pgEnum('document_status', [
  'pending',
  'approved',
  'rejected',
])

export const medicineFormEnum = pgEnum('medicine_form', [
  'tablet',
  'capsule',
  'syrup',
  'suspension',
  'injection',
  'cream',
  'ointment',
  'drops',
  'inhaler',
  'patch',
  'powder',
  'sachet',
  'other',
])

export const storageTypeEnum = pgEnum('storage_type', [
  'room_temperature',
  'cool_dry_place',
  'refrigerated',
])

export const sealedStatusEnum = pgEnum('sealed_status', ['sealed', 'opened'])

export const listingStatusEnum = pgEnum('listing_status', [
  'draft',
  'pending_admin',
  'active',
  'rejected',
  'sold_out',
  'expired',
  'withdrawn',
])

export const transferRequestStatusEnum = pgEnum('transfer_request_status', [
  'pending_admin',
  'rejected',
  'pending_seller',
  'declined',
  'accepted',
  'awaiting_handoff',
  'dispatched',
  'completed',
  'expired',
  'cancelled',
])

/**
 * Delivery lifecycle (Step 10):
 *   pending           — admin created the delivery, no pickup booked yet
 *   pickup_scheduled  — admin booked a pickup window with the seller
 *   picked_up         — courier collected the goods from the seller
 *   in_transit        — package en route to the receiver
 *   delivered         — receiver confirmed receipt (request → completed)
 *   failed            — pickup or in-transit attempt aborted permanently
 *   cancelled         — delivery cancelled before pickup
 *   disputed          — receiver rejected/contested receipt
 *   scheduled         — legacy alias retained for any historical rows
 */
export const deliveryStatusEnum = pgEnum('delivery_status', [
  'pending',
  'pickup_scheduled',
  'picked_up',
  'scheduled',
  'in_transit',
  'delivered',
  'failed',
  'cancelled',
  'disputed',
])

export const dispatchMethodEnum = pgEnum('dispatch_method', [
  'buyer_pickup',
  'seller_drop_off',
  'third_party_courier',
])
