import { relations, sql } from 'drizzle-orm'
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  date,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { medicineFormEnum, storageTypeEnum, sealedStatusEnum } from './enums'

/**
 * Admin-curated catalog. Sellers must pick from this list — no free-text
 * medicine names. is_controlled and requires_cold_chain are flagged so the
 * service layer can refuse to create batches/listings for them in MVP.
 */
export const medicines = pgTable(
  'medicines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    genericName: text('generic_name'),
    strength: text('strength').notNull(), // e.g. "500 mg"
    form: medicineFormEnum('form').notNull(),
    manufacturer: text('manufacturer'),
    atcCode: text('atc_code'),
    isControlled: boolean('is_controlled').notNull().default(false),
    requiresColdChain: boolean('requires_cold_chain').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex('medicines_name_strength_form_uq').on(t.name, t.strength, t.form),
    index('medicines_name_idx').on(t.name),
    index('medicines_is_active_idx').on(t.isActive),
  ],
)

/**
 * A seller's physical batch of stock. Created BEFORE a listing — so the seller
 * can record what's on the shelf, and choose to list some/all of it.
 *
 * quantity_on_hand is the source of truth for what's physically in the batch.
 * A listing decrements its own quantity_available; on transfer completion the
 * service layer also decrements quantity_on_hand here.
 */
export const inventoryBatches = pgTable(
  'inventory_batches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    medicineId: uuid('medicine_id')
      .notNull()
      .references(() => medicines.id, { onDelete: 'restrict' }),
    batchNumber: text('batch_number').notNull(),
    manufactureDate: date('manufacture_date'),
    expiryDate: date('expiry_date').notNull(),
    quantityOnHand: integer('quantity_on_hand').notNull(),
    unit: text('unit').notNull(), // 'pack' | 'strip' | 'bottle' | 'box' | 'vial'
    storageType: storageTypeEnum('storage_type').notNull(),
    sealedStatus: sealedStatusEnum('sealed_status').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex('inventory_batches_org_medicine_batch_uq').on(
      t.organizationId,
      t.medicineId,
      t.batchNumber,
    ),
    index('inventory_batches_org_idx').on(t.organizationId),
    index('inventory_batches_medicine_idx').on(t.medicineId),
    index('inventory_batches_expiry_idx').on(t.expiryDate),
    check('inventory_batches_qty_non_negative', sql`${t.quantityOnHand} >= 0`),
  ],
)

export const medicinesRelations = relations(medicines, ({ many }) => ({
  batches: many(inventoryBatches),
}))

export const inventoryBatchesRelations = relations(inventoryBatches, ({ one }) => ({
  organization: one(organizations, {
    fields: [inventoryBatches.organizationId],
    references: [organizations.id],
  }),
  medicine: one(medicines, {
    fields: [inventoryBatches.medicineId],
    references: [medicines.id],
  }),
}))
