import { relations, sql } from 'drizzle-orm'
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core'
import { user } from '../auth-schema'
import { organizations } from './organizations'
import { inventoryBatches } from './medicines'
import {
  listingStatusEnum,
  transferRequestStatusEnum,
  deliveryStatusEnum,
  dispatchMethodEnum,
} from './enums'

/**
 * A listing is the seller's offer to redistribute some/all of an inventory
 * batch. quantity_listed is fixed at submission; quantity_available is what's
 * still claimable after pending/accepted requests.
 *
 * photo_urls is a JSON array of object-storage URLs. Once we add R2/S3 these
 * become signed URLs.
 */
export const listings = pgTable(
  'listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => inventoryBatches.id, { onDelete: 'restrict' }),
    // Denormalized for fast filter-by-seller queries. Must match batch.organizationId.
    sellerOrgId: uuid('seller_org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    quantityListed: integer('quantity_listed').notNull(),
    quantityAvailable: integer('quantity_available').notNull(),
    pricePerUnitCents: integer('price_per_unit_cents'), // null = free / donation
    currency: text('currency').default('USD'),
    photoUrls: jsonb('photo_urls').$type<string[]>().notNull().default([]),
    notes: text('notes'),
    pickupCity: text('pickup_city').notNull(),
    pickupCountry: text('pickup_country').notNull(),
    status: listingStatusEnum('status').notNull().default('draft'),
    submittedAt: timestamp('submitted_at'),
    approvedAt: timestamp('approved_at'),
    approvedByUserId: text('approved_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    rejectionReason: text('rejection_reason'),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index('listings_status_idx').on(t.status),
    index('listings_seller_org_idx').on(t.sellerOrgId),
    index('listings_batch_idx').on(t.batchId),
    index('listings_pickup_city_idx').on(t.pickupCity),
    check('listings_qty_listed_positive', sql`${t.quantityListed} > 0`),
    check('listings_qty_available_non_negative', sql`${t.quantityAvailable} >= 0`),
    check(
      'listings_qty_available_lte_listed',
      sql`${t.quantityAvailable} <= ${t.quantityListed}`,
    ),
    check(
      'listings_price_non_negative',
      sql`${t.pricePerUnitCents} IS NULL OR ${t.pricePerUnitCents} >= 0`,
    ),
  ],
)

/**
 * A buyer's request to take stock from a listing. Goes through admin then seller.
 * expires_at lets a background job mark stale requests as 'expired'.
 */
export const transferRequests = pgTable(
  'transfer_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'restrict' }),
    requesterOrgId: uuid('requester_org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    requesterUserId: text('requester_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    quantityRequested: integer('quantity_requested').notNull(),
    intendedUse: text('intended_use').notNull(),
    status: transferRequestStatusEnum('status').notNull().default('pending_admin'),
    adminReviewedByUserId: text('admin_reviewed_by_user_id').references(
      () => user.id,
      { onDelete: 'set null' },
    ),
    adminReviewedAt: timestamp('admin_reviewed_at'),
    adminReviewNotes: text('admin_review_notes'),
    sellerReviewedByUserId: text('seller_reviewed_by_user_id').references(
      () => user.id,
      { onDelete: 'set null' },
    ),
    sellerReviewedAt: timestamp('seller_reviewed_at'),
    sellerReviewNotes: text('seller_review_notes'),
    cancellationReason: text('cancellation_reason'),
    expiresAt: timestamp('expires_at').notNull(),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index('transfer_requests_listing_idx').on(t.listingId),
    index('transfer_requests_requester_org_idx').on(t.requesterOrgId),
    index('transfer_requests_status_idx').on(t.status),
    index('transfer_requests_expires_at_idx').on(t.expiresAt),
    check(
      'transfer_requests_qty_positive',
      sql`${t.quantityRequested} > 0`,
    ),
  ],
)

/**
 * Physical handoff record. Exactly one per accepted transfer_request
 * (enforced by unique index on transfer_request_id).
 */
export const deliveries = pgTable(
  'deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    transferRequestId: uuid('transfer_request_id')
      .notNull()
      .references(() => transferRequests.id, { onDelete: 'cascade' }),
    dispatchMethod: dispatchMethodEnum('dispatch_method').notNull(),
    pickupAddress: text('pickup_address').notNull(),
    dropoffAddress: text('dropoff_address').notNull(),
    sellerContactName: text('seller_contact_name').notNull(),
    sellerContactPhone: text('seller_contact_phone').notNull(),
    buyerContactName: text('buyer_contact_name').notNull(),
    buyerContactPhone: text('buyer_contact_phone').notNull(),
    courierReference: text('courier_reference'),
    dispatchedAt: timestamp('dispatched_at'),
    dispatchedByUserId: text('dispatched_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    dispatchNotes: text('dispatch_notes'),
    receivedAt: timestamp('received_at'),
    receivedByUserId: text('received_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    receiptNotes: text('receipt_notes'),
    receivedQuantity: integer('received_quantity'),
    // Optional logistics assignment. Set when an admin routes a delivery to a
    // verified logistics-org user; that user can then progress dispatch state.
    assignedLogisticsUserId: text('assigned_logistics_user_id').references(
      () => user.id,
      { onDelete: 'set null' },
    ),
    assignedLogisticsOrgId: uuid('assigned_logistics_org_id').references(
      () => organizations.id,
      { onDelete: 'set null' },
    ),
    assignedAt: timestamp('assigned_at'),
    assignedByUserId: text('assigned_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    status: deliveryStatusEnum('status').notNull().default('scheduled'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex('deliveries_transfer_request_uq').on(t.transferRequestId),
    index('deliveries_status_idx').on(t.status),
    index('deliveries_assigned_logistics_user_idx').on(
      t.assignedLogisticsUserId,
    ),
    check(
      'deliveries_received_qty_non_negative',
      sql`${t.receivedQuantity} IS NULL OR ${t.receivedQuantity} >= 0`,
    ),
  ],
)

export const listingsRelations = relations(listings, ({ one, many }) => ({
  batch: one(inventoryBatches, {
    fields: [listings.batchId],
    references: [inventoryBatches.id],
  }),
  sellerOrg: one(organizations, {
    fields: [listings.sellerOrgId],
    references: [organizations.id],
  }),
  approvedBy: one(user, {
    fields: [listings.approvedByUserId],
    references: [user.id],
  }),
  createdBy: one(user, {
    fields: [listings.createdByUserId],
    references: [user.id],
  }),
  requests: many(transferRequests),
}))

export const transferRequestsRelations = relations(
  transferRequests,
  ({ one }) => ({
    listing: one(listings, {
      fields: [transferRequests.listingId],
      references: [listings.id],
    }),
    requesterOrg: one(organizations, {
      fields: [transferRequests.requesterOrgId],
      references: [organizations.id],
    }),
    requesterUser: one(user, {
      fields: [transferRequests.requesterUserId],
      references: [user.id],
    }),
    delivery: one(deliveries, {
      fields: [transferRequests.id],
      references: [deliveries.transferRequestId],
    }),
  }),
)

export const deliveriesRelations = relations(deliveries, ({ one }) => ({
  transferRequest: one(transferRequests, {
    fields: [deliveries.transferRequestId],
    references: [transferRequests.id],
  }),
}))
