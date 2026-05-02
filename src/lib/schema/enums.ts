import { pgEnum } from 'drizzle-orm/pg-core'

export const orgTypeEnum = pgEnum('org_type', [
  'pharmacy',
  'hospital',
  'clinic',
  'ngo',
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

export const deliveryStatusEnum = pgEnum('delivery_status', [
  'scheduled',
  'in_transit',
  'delivered',
  'disputed',
])

export const dispatchMethodEnum = pgEnum('dispatch_method', [
  'buyer_pickup',
  'seller_drop_off',
  'third_party_courier',
])
