import { relations } from 'drizzle-orm'
import {
  pgTable,
  uuid,
  text,
  timestamp,
  bigint,
  index,
  uniqueIndex,
  jsonb,
} from 'drizzle-orm/pg-core'
import { user } from '../auth-schema'
import {
  orgTypeEnum,
  orgVerificationStatusEnum,
  orgMemberRoleEnum,
  docTypeEnum,
  docStatusEnum,
} from './enums'

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    type: orgTypeEnum('type').notNull(),
    licenseNumber: text('license_number').notNull(),
    contactEmail: text('contact_email').notNull(),
    contactPhone: text('contact_phone').notNull(),
    addressLine1: text('address_line1').notNull(),
    addressLine2: text('address_line2'),
    city: text('city').notNull(),
    state: text('state'),
    postalCode: text('postal_code'),
    country: text('country').notNull(),
    verificationStatus: orgVerificationStatusEnum('verification_status')
      .notNull()
      .default('pending'),
    verifiedAt: timestamp('verified_at'),
    verifiedByUserId: text('verified_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    rejectionReason: text('rejection_reason'),
    suspendedAt: timestamp('suspended_at'),
    suspensionReason: text('suspension_reason'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex('organizations_license_number_uq').on(t.licenseNumber),
    index('organizations_type_idx').on(t.type),
    index('organizations_verification_status_idx').on(t.verificationStatus),
    index('organizations_city_idx').on(t.city),
  ],
)

export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: orgMemberRoleEnum('role').notNull().default('member'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('organization_members_org_user_uq').on(
      t.organizationId,
      t.userId,
    ),
    index('organization_members_user_idx').on(t.userId),
  ],
)

export const organizationDocuments = pgTable(
  'organization_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    documentType: docTypeEnum('document_type').notNull(),
    fileUrl: text('file_url').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    uploadedByUserId: text('uploaded_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    status: docStatusEnum('status').notNull().default('pending'),
    reviewedByUserId: text('reviewed_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    reviewedAt: timestamp('reviewed_at'),
    reviewNotes: text('review_notes'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index('organization_documents_org_idx').on(t.organizationId),
    index('organization_documents_status_idx').on(t.status),
  ],
)

export const organizationsRelations = relations(organizations, ({ many, one }) => ({
  members: many(organizationMembers),
  documents: many(organizationDocuments),
  verifiedBy: one(user, {
    fields: [organizations.verifiedByUserId],
    references: [user.id],
  }),
}))

export const organizationMembersRelations = relations(
  organizationMembers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationMembers.organizationId],
      references: [organizations.id],
    }),
    user: one(user, {
      fields: [organizationMembers.userId],
      references: [user.id],
    }),
  }),
)

export const organizationDocumentsRelations = relations(
  organizationDocuments,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationDocuments.organizationId],
      references: [organizations.id],
    }),
    uploadedBy: one(user, {
      fields: [organizationDocuments.uploadedByUserId],
      references: [user.id],
    }),
    reviewedBy: one(user, {
      fields: [organizationDocuments.reviewedByUserId],
      references: [user.id],
    }),
  }),
)
