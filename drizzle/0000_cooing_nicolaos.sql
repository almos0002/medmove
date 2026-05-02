CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'pickup_scheduled', 'picked_up', 'scheduled', 'in_transit', 'delivered', 'failed', 'cancelled', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."dispatch_method" AS ENUM('buyer_pickup', 'seller_drop_off', 'third_party_courier');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('pharmacy_license', 'business_registration', 'tax_certificate', 'authorized_person_id', 'other');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'pending_admin', 'active', 'rejected', 'sold_out', 'expired', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."medicine_form" AS ENUM('tablet', 'capsule', 'syrup', 'suspension', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'patch', 'powder', 'sachet', 'other');--> statement-breakpoint
CREATE TYPE "public"."org_member_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TYPE "public"."org_type" AS ENUM('pharmacy', 'hospital', 'clinic', 'ngo', 'distributor', 'logistics_partner');--> statement-breakpoint
CREATE TYPE "public"."org_verification_status" AS ENUM('pending', 'verified', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."sealed_status" AS ENUM('sealed', 'opened');--> statement-breakpoint
CREATE TYPE "public"."storage_type" AS ENUM('room_temperature', 'cool_dry_place', 'refrigerated');--> statement-breakpoint
CREATE TYPE "public"."transfer_request_status" AS ENUM('pending_admin', 'rejected', 'pending_seller', 'declined', 'accepted', 'awaiting_handoff', 'dispatched', 'completed', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."notification_audience" AS ENUM('user', 'organization', 'admins');--> statement-breakpoint
CREATE TYPE "public"."notification_severity" AS ENUM('info', 'success', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('organization.pending_verification', 'organization.verified', 'organization.rejected', 'organization.suspended', 'listing.pending_review', 'listing.approved', 'listing.rejected', 'listing.withdrawn', 'transfer_request.created', 'transfer_request.admin_approved', 'transfer_request.admin_rejected', 'transfer_request.seller_accepted', 'transfer_request.seller_declined', 'delivery.created', 'delivery.logistics_assigned', 'delivery.pickup_scheduled', 'delivery.in_transit', 'delivery.delivered', 'delivery.failed', 'inventory.expiring_soon', 'inventory.critical_expiry', 'inventory.expired', 'inventory.safe');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'org_staff' NOT NULL,
	"organization_name" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"document_type" "document_type" NOT NULL,
	"file_url" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint,
	"uploaded_by_user_id" text,
	"status" "document_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" text,
	"reviewed_at" timestamp,
	"review_notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "org_member_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "org_type" NOT NULL,
	"license_number" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text NOT NULL,
	"address_line1" text NOT NULL,
	"address_line2" text,
	"city" text NOT NULL,
	"state" text,
	"postal_code" text,
	"country" text NOT NULL,
	"verification_status" "org_verification_status" DEFAULT 'pending' NOT NULL,
	"can_list_medicine" boolean DEFAULT false NOT NULL,
	"can_request_medicine" boolean DEFAULT false NOT NULL,
	"can_deliver_medicine" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp,
	"verified_by_user_id" text,
	"rejection_reason" text,
	"suspended_at" timestamp,
	"suspension_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"medicine_id" uuid NOT NULL,
	"batch_number" text NOT NULL,
	"manufacture_date" date,
	"expiry_date" date NOT NULL,
	"quantity_on_hand" integer NOT NULL,
	"unit" text NOT NULL,
	"storage_type" "storage_type" NOT NULL,
	"sealed_status" "sealed_status" NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_batches_qty_non_negative" CHECK ("inventory_batches"."quantity_on_hand" >= 0)
);
--> statement-breakpoint
CREATE TABLE "medicines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"generic_name" text,
	"strength" text NOT NULL,
	"form" "medicine_form" NOT NULL,
	"manufacturer" text,
	"atc_code" text,
	"is_controlled" boolean DEFAULT false NOT NULL,
	"requires_cold_chain" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_request_id" uuid NOT NULL,
	"dispatch_method" "dispatch_method" NOT NULL,
	"pickup_address" text NOT NULL,
	"dropoff_address" text NOT NULL,
	"seller_contact_name" text NOT NULL,
	"seller_contact_phone" text NOT NULL,
	"buyer_contact_name" text NOT NULL,
	"buyer_contact_phone" text NOT NULL,
	"courier_reference" text,
	"pickup_scheduled_at" timestamp,
	"pickup_scheduled_by_user_id" text,
	"picked_up_at" timestamp,
	"picked_up_by_user_id" text,
	"dispatched_at" timestamp,
	"dispatched_by_user_id" text,
	"dispatch_notes" text,
	"received_at" timestamp,
	"received_by_user_id" text,
	"receipt_notes" text,
	"received_quantity" integer,
	"failed_at" timestamp,
	"failed_by_user_id" text,
	"failure_reason" text,
	"cancelled_at" timestamp,
	"cancelled_by_user_id" text,
	"cancellation_reason" text,
	"assigned_logistics_user_id" text,
	"assigned_logistics_org_id" uuid,
	"assigned_at" timestamp,
	"assigned_by_user_id" text,
	"status" "delivery_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deliveries_received_qty_non_negative" CHECK ("deliveries"."received_quantity" IS NULL OR "deliveries"."received_quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"seller_org_id" uuid NOT NULL,
	"quantity_listed" integer NOT NULL,
	"quantity_available" integer NOT NULL,
	"price_per_unit_cents" integer,
	"currency" text DEFAULT 'USD',
	"photo_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"pickup_city" text NOT NULL,
	"pickup_country" text NOT NULL,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp,
	"approved_at" timestamp,
	"approved_by_user_id" text,
	"rejection_reason" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "listings_qty_listed_positive" CHECK ("listings"."quantity_listed" > 0),
	CONSTRAINT "listings_qty_available_non_negative" CHECK ("listings"."quantity_available" >= 0),
	CONSTRAINT "listings_qty_available_lte_listed" CHECK ("listings"."quantity_available" <= "listings"."quantity_listed"),
	CONSTRAINT "listings_price_non_negative" CHECK ("listings"."price_per_unit_cents" IS NULL OR "listings"."price_per_unit_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "transfer_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"requester_org_id" uuid NOT NULL,
	"requester_user_id" text,
	"quantity_requested" integer NOT NULL,
	"intended_use" text NOT NULL,
	"status" "transfer_request_status" DEFAULT 'pending_admin' NOT NULL,
	"admin_reviewed_by_user_id" text,
	"admin_reviewed_at" timestamp,
	"admin_review_notes" text,
	"seller_reviewed_by_user_id" text,
	"seller_reviewed_at" timestamp,
	"seller_review_notes" text,
	"cancellation_reason" text,
	"expires_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transfer_requests_qty_positive" CHECK ("transfer_requests"."quantity_requested" > 0)
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text,
	"actor_org_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audience" "notification_audience" NOT NULL,
	"recipient_user_id" text NOT NULL,
	"recipient_org_id" uuid,
	"type" "notification_type" NOT NULL,
	"severity" "notification_severity" DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"entity_type" text,
	"entity_id" text,
	"link" text,
	"metadata" jsonb,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_documents" ADD CONSTRAINT "organization_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_documents" ADD CONSTRAINT "organization_documents_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_documents" ADD CONSTRAINT "organization_documents_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_verified_by_user_id_user_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_transfer_request_id_transfer_requests_id_fk" FOREIGN KEY ("transfer_request_id") REFERENCES "public"."transfer_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_pickup_scheduled_by_user_id_user_id_fk" FOREIGN KEY ("pickup_scheduled_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_picked_up_by_user_id_user_id_fk" FOREIGN KEY ("picked_up_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_dispatched_by_user_id_user_id_fk" FOREIGN KEY ("dispatched_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_received_by_user_id_user_id_fk" FOREIGN KEY ("received_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_failed_by_user_id_user_id_fk" FOREIGN KEY ("failed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_cancelled_by_user_id_user_id_fk" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_assigned_logistics_user_id_user_id_fk" FOREIGN KEY ("assigned_logistics_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_assigned_logistics_org_id_organizations_id_fk" FOREIGN KEY ("assigned_logistics_org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_assigned_by_user_id_user_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_batch_id_inventory_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."inventory_batches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_org_id_organizations_id_fk" FOREIGN KEY ("seller_org_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_approved_by_user_id_user_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_requester_org_id_organizations_id_fk" FOREIGN KEY ("requester_org_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_requester_user_id_user_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_admin_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("admin_reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_requests" ADD CONSTRAINT "transfer_requests_seller_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("seller_reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_org_id_organizations_id_fk" FOREIGN KEY ("actor_org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_org_id_organizations_id_fk" FOREIGN KEY ("recipient_org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "organization_documents_org_idx" ON "organization_documents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_documents_status_idx" ON "organization_documents" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_members_org_user_uq" ON "organization_members" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "organization_members_user_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_license_number_uq" ON "organizations" USING btree ("license_number");--> statement-breakpoint
CREATE INDEX "organizations_type_idx" ON "organizations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "organizations_verification_status_idx" ON "organizations" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "organizations_city_idx" ON "organizations" USING btree ("city");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_batches_org_medicine_batch_uq" ON "inventory_batches" USING btree ("organization_id","medicine_id","batch_number");--> statement-breakpoint
CREATE INDEX "inventory_batches_org_idx" ON "inventory_batches" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "inventory_batches_medicine_idx" ON "inventory_batches" USING btree ("medicine_id");--> statement-breakpoint
CREATE INDEX "inventory_batches_expiry_idx" ON "inventory_batches" USING btree ("expiry_date");--> statement-breakpoint
CREATE UNIQUE INDEX "medicines_name_strength_form_uq" ON "medicines" USING btree ("name","strength","form");--> statement-breakpoint
CREATE INDEX "medicines_name_idx" ON "medicines" USING btree ("name");--> statement-breakpoint
CREATE INDEX "medicines_is_active_idx" ON "medicines" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "deliveries_transfer_request_uq" ON "deliveries" USING btree ("transfer_request_id");--> statement-breakpoint
CREATE INDEX "deliveries_status_idx" ON "deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "deliveries_assigned_logistics_user_idx" ON "deliveries" USING btree ("assigned_logistics_user_id");--> statement-breakpoint
CREATE INDEX "listings_status_idx" ON "listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listings_seller_org_idx" ON "listings" USING btree ("seller_org_id");--> statement-breakpoint
CREATE INDEX "listings_batch_idx" ON "listings" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "listings_pickup_city_idx" ON "listings" USING btree ("pickup_city");--> statement-breakpoint
CREATE INDEX "transfer_requests_listing_idx" ON "transfer_requests" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "transfer_requests_requester_org_idx" ON "transfer_requests" USING btree ("requester_org_id");--> statement-breakpoint
CREATE INDEX "transfer_requests_status_idx" ON "transfer_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transfer_requests_expires_at_idx" ON "transfer_requests" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "transfer_requests_active_uq" ON "transfer_requests" USING btree ("listing_id","requester_org_id") WHERE status IN ('pending_admin','pending_seller','accepted','awaiting_handoff','dispatched');--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_user_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_org_idx" ON "audit_logs" USING btree ("actor_org_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_recipient_user_idx" ON "notifications" USING btree ("recipient_user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_audience_idx" ON "notifications" USING btree ("audience","created_at");--> statement-breakpoint
CREATE INDEX "notifications_entity_idx" ON "notifications" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "notifications_unread_user_idx" ON "notifications" USING btree ("recipient_user_id") WHERE read_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_user_entity_type_uq" ON "notifications" USING btree ("recipient_user_id","entity_type","entity_id","type");