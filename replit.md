# MedMove - TanStack Start App

## Step 14 — MVP polish (2026-05)
**Goal:** ship the polish layer needed to call the platform a working MVP — settings/profile, reusable feedback + table primitives, an expanded seed, and the full operator documentation set.

**New routes**
- `/profile` — edit display name; read-only email/role/verified status.
- `/account` — change password (revokes other sessions on success); email is read-only.
- `/account/notifications` — toggle in-app, email, SMS, WhatsApp delivery channels.
- `/admin/settings` — site name, support email/phone, banner, sign-up gate, grace-period days. Single-row `platform_settings` table.
- `/org/settings` — verification status + capability flags + document counts; surfaces rejection reason if any.
- `/suspended` — friendly read-only landing for suspended orgs (interceptor in `/org` guard, admins exempt).
- `/unauthorized` — generic 403 surface.

**New schema (Drizzle, pushed via `npm run db:push -- --force`)**
- `user_notification_preferences` — one row per user (lazy-created on first read), booleans for `inAppEnabled` / `emailEnabled` / `smsEnabled` / `whatsappEnabled`.
- `platform_settings` — singleton row guarded by a unique partial index on `singleton`. Contains `siteName`, `supportEmail`, `supportPhone`, `bannerMessage`, `signupsEnabled`, `graceDays`.

**New server fns** (`src/server/functions/`)
- `account.ts` — `getMyAccount`, `updateMyAccount`, `changePassword`.
- `notificationPreferences.ts` — `getMyNotificationPreferences`, `updateMyNotificationPreferences`.
- `platformSettings.ts` — admin `getAdminPlatformSettings` / `adminUpdatePlatformSettings`; public `getPublicPlatformSettings` (safe subset).
All fns re-exported from `src/server/functions/index.ts`. Each ships a Zod validator in `src/lib/validators/`.

**New reusable primitives**
- `src/lib/dates.ts` — `formatDate`, `formatDateTime`, `formatRelative`; re-exports expiry helpers.
- `src/components/feedback/UnauthorizedPage.tsx`, `SuspendedOrgPage.tsx`, `ErrorBoundary.tsx`, `SectionLoading.tsx`.
- `src/components/dialogs/ConfirmDialog.tsx`.
- `src/components/data/TableToolbar.tsx`.
- `src/components/data/index.ts` — barrel for every status badge + chip + toolbar.

**AppShell wiring**
- New top-bar `UserMenu` dropdown: avatar + email + role, links to Profile / Account / Notifications, sign-out at the bottom (red).
- `Settings` link added to admin nav (`/admin/settings`) and org nav (`/org/settings`).
- `/org` loader bounces suspended orgs to `/suspended` (admins exempt).

**Expanded dev seed** (`scripts/seed.ts`, idempotent)
- 12 users: super_admin, admin, 2 verified-pharmacy owners, 1 pending-pharmacy owner, clinic owner, hospital owner, NGO owner, distributor owner, logistics owner, pharmacy staff, logistics staff.
- 9 organisations covering every type + verification state.
- 7 inventory batches across the verified orgs.
- 6 listings (4 active + 2 pending_admin) plus 1 unlisted clinic batch.
- 3 transfer requests in `pending_admin` / `accepted` / `completed`.
- 3 deliveries in `pending` / `in_transit` / `delivered`.
- 4 demo in-app notifications (org-verified, listing-approved, request-created, delivery-in-transit).
- 3 audit log entries (uses `action` + `metadata.summary`; column names confirmed against `src/lib/schema/audit.ts`).

**Documentation suite**
- `README.md` rewritten — architecture, server-fn pattern, permissions, settings/profile catalogue, seed credentials, scripts, doc index, design language.
- `docs/TESTING.md`, `docs/SECURITY.md`, `docs/COMPLIANCE.md`, `docs/DEPLOYMENT.md`, `docs/ENVIRONMENT.md`, `docs/MIGRATIONS.md` — each is a checklist tuned to MedMove's MVP scope (no payments, no public browsing, no cold-chain, no controlled drugs).

**Notes for future work**
- `notification_preferences` is honoured today only at the dispatch-stub layer; real channel providers remain TODO.
- `platform_settings.bannerMessage` is rendered on the dashboard; admin updates are reflected after refresh. SSE/live-push is out of scope for MVP.
- Seed inserts audit logs directly (not via service fns) to keep the script standalone; the format mirrors `writeAudit` so the rows render correctly in `/admin/audit-logs`.

## Overview
MedMove is a B2B platform for redistributing near-expiry medicine between verified pharmacies, hospitals/NGOs, distributors and logistics partners, with admin verification of every donation/sale.
Built with TanStack Start (full-stack React framework), TanStack Router for file-based routing, Tailwind CSS v4 for styling, Better Auth for authentication, Drizzle ORM with Replit Postgres for persistence, and Nitro for the server.

**Core business workflow:** see [`WORKFLOW.md`](./WORKFLOW.md) for the full source → admin → receiver flow.

## Tech Stack
- **Framework**: TanStack Start (React SSR/full-stack)
- **Router**: TanStack Router (file-based routing)
- **Styling**: Tailwind CSS v4 (configured via `@theme` in `src/styles.css`)
- **Icons**: lucide-react
- **Fonts**: **Poppins only**, loaded from Google Fonts in `__root.tsx` (weights 300/400/500/600/700/800). Both `--font-display` and `--font-body` resolve to Poppins. NO serif, NO italic, NO secondary family.

## Visual System (Airbnb-style, 2026-05)
**Hard rules — do not violate without explicit user permission:**
- **Poppins only.** No serif, no italic display, no second family.
- **Squircle corners only.** Use `squircle / squircle-lg / -md / -sm / -xs` (50/36/22/14/10 px). The single approved `rounded-full` exception is the sign-up role-selector check dot.
- **Pure `#FFFFFF` surfaces.** No translucent fills (`bg-white/95`, `/80` etc), no gradients, no `backdrop-blur`, no glassmorphism. Modal overlays may keep `bg-black/40` (no blur) for backdrop dim.
- **No shadows.** Tokens enforced via `.no-shadow` helper; surfaces separate via soft borders.
- **Soft ink-tinted borders.** `--color-mm-line` = `rgba(17,17,17,0.08)`, `--color-mm-line-strong` = `rgba(17,17,17,0.16)`. Never `border-black`.
- **Ink `#111`, muted `#2a2a2a`, subtle `#565656`.** Accent is **deep teal `#0d4f40`**, used for primary buttons, active sidebar item, the CTA banner background, and small accent dots/badges.
- **Photo-forward.** Heroes and section blocks lean on imagery from `public/img/` (3 generated heroes + 7 stock photos: shelves, doctor, warehouse, aid, supply, courier, vials).
- **Helpers in `styles.css`:** `.eyebrow` (sentence-case 13px label), `.hairline` / `.hairline-v` (soft dividers), `.tick` (small teal dot), `.photo-card` (border + scale hover, no shadow).
- **Primitives**: `button` (squircle-sm, teal primary, dark variant), `input`/`textarea` (boxed squircle-sm, teal focus ring), `card` (squircle-md), `badge` (squircle pill), `label` (sentence case, no uppercase tracking).
- **Auth**: Better Auth (email/password) with `inferAdditionalFields` plugin for `role` + `organizationName`
- **Database**: Replit Postgres via `DATABASE_URL`
- **ORM**: Drizzle ORM (`postgres-js` driver) + `drizzle-kit` for schema push
- **Build Tool**: Vite v8
- **Language**: TypeScript
- **Testing**: Vitest + React Testing Library

## Project Structure
- `src/routes/` - File-based routes (TanStack Router, flat convention)
  - `__root.tsx` - Root layout (HTML shell, Poppins font from Google Fonts, devtools)
  - `index.tsx` - Home / landing page
  - `sign-in.tsx`, `sign-up.tsx` - Auth pages (sign-up exposes `org_owner` / `org_staff` / `logistics_staff` only)
  - `dashboard.tsx` - Universal post-login redirect to role-specific console
  - `admin.tsx` + `admin.index.tsx` - Admin/super_admin layout + index (guarded)
  - `admin.medicines.tsx` / `admin.medicines.new.tsx` / `admin.medicines.$medicineId.tsx` - Catalog list, create, edit (admin-only)
  - `org.inventory.tsx` / `org.inventory.new.tsx` / `org.inventory.$batchId.tsx` - Inventory list (TanStack Table + filters), add batch, batch detail (org members + admins)
  - `org.listings.tsx` / `org.listings.new.tsx` / `org.listings.$listingId.tsx` - Seller-side listings (TanStack Table + filters), create-from-batch form, detail page with Submit / Withdraw actions
  - `admin.listings.tsx` / `admin.listings.$listingId.tsx` - Admin review queue (defaults to `pending_admin`, status filter widens to all) + detail with Approve / Reject dialogs
  - `org.tsx` + `org.index.tsx` - **Unified** console for `org_owner` and `org_staff`. UI is the same for both roles — capability flags on the org row decide which actions render.
  - `logistics.tsx` + `logistics.index.tsx` - Logistics layout + index (guarded; admins allowed)
  - `api/auth/$.ts` - Splat route forwarding all `/api/auth/*` to Better Auth handler
- `src/lib/`
  - `permissions.ts` - **Single source of truth** for the role/org-type/capability model. Exports `ROLES`, `ORG_TYPES`, `CAPABILITIES`, `AppRole`, `OrgType`, `Capability`, `ADMIN_ROLES`, `PUBLIC_SIGNUP_ROLES`, `defaultCapabilitiesForType()`, `hasCapability()`, `isAdminRole()`, `isOrgMemberRole()`, `isOrgOwner()`, `homePathForRole()`.
  - `db.ts` - Drizzle client (postgres-js, reads `DATABASE_URL`)
  - `auth.ts` - Better Auth server config (drizzleAdapter, role + organizationName additional fields, default role `org_staff`, public-signup role allowlist enforced server-side)
  - `auth-client.ts` - Better Auth React client with `inferAdditionalFields<typeof auth>()`
  - `auth-schema.ts` - Better Auth tables: `user`, `session`, `account`, `verification`
  - `schema/` - Business domain Drizzle schema
    - `enums.ts` - All `pgEnum` definitions; `orgTypeEnum` = `pharmacy | hospital | clinic | ngo | distributor | logistics_partner`
    - `organizations.ts` - `organizations` (now with `can_list_medicine`, `can_request_medicine`, `can_deliver_medicine` boolean columns, default `false`), `organization_members`, `organization_documents`
    - `medicines.ts` - `medicines` (catalog), `inventory_batches`
    - `listings.ts` - `listings`, `transfer_requests`, `deliveries` (deliveries has `assignedLogisticsUserId/OrgId/At/ByUserId` + index)
    - `audit.ts` - append-only `audit_logs`
- `src/server/` - Server-only business logic layer
  - `errors.ts` - `AppError` class + `toClientError`
  - `context.ts` - `getRequestContext()` with role coercion (unknown→`org_staff` fallback). `PrimaryOrg` exposes the three capability flags so the UI can render conditionally — but **server fns must always re-check via `requireCapability`**.
  - `audit.ts`, `transitions.ts` - audit writer + state-transition assertions
  - `guards/` - hub re-exports (`index.ts`):
    - `requireAuth`, `requireRole`, `requireOrgMember`, `requireVerifiedOrg` (existing)
    - `requireAdmin` - allows `admin` OR `super_admin`
    - `requireOrganizationAccess` - admin bypass + verified-org default for non-admins
    - `requireCapability(ctx, orgId, capability)` — **the single capability gate**: admin bypass, otherwise membership + verified org + capability flag in one shot. Returns `{user, membership, org}`.
    - `getCurrentUser` - non-throwing accessor
  - `validators/` - Zod input schemas per domain. `organizations.ts` adds `updateOrganizationCapabilitiesSchema` (refined to require ≥1 flag).
  - `functions/` - `createServerFn` handlers; new `session.getServerSession`, new `deliveries.adminAssignDeliveryLogistics`, new `deliveries.listMyAssignedDeliveries`, new `organizations.adminUpdateOrganizationCapabilities`. `markDispatched` accepts admin OR assigned `logistics_staff` user OR member of an org with `can_deliver_medicine` (assigned logistics org if set, else seller org). `createOrganization` seeds capability flags from `defaultCapabilitiesForType(type)`.
- `scripts/seed.ts` - Idempotent seed (re-stamps capability flags every run): super_admin + admin + 4 org_owners (pharmacy/hospital/distributor/logistics_partner) + pharmacy_staff (org_staff) + logistics_staff, four verified orgs with type-default capabilities, 10-medicine catalog, 1 demo listing.
- `src/components/`
  - `ui/` — primitives (`button`, `input`, `label`, `textarea`, `card`, `badge`, `separator`, `skeleton`, `switch`, `select`, `dialog`, `alert-dialog`, `tabs`). All use `squircle*` utilities, never `shadow-*`.
  - `data/` — `StatusBadge` (org verification + doc status), `CapabilityChip(Row)`, `OrgTypeBadge`, `OrgTypeLabel`.
  - `feedback/` — `EmptyState`, `PageError`, `PageLoading`, `NotFoundPage` (no nested `<html>` — wrapped by root `shellComponent`).
  - `layout/` — `AppShell` (sidebar + topbar; sections `'app' | 'admin' | 'logistics'`; admin-as-support banner) and `PageHeader`.
- `src/lib/utils.ts` — `cn()` (clsx + tailwind-merge); `src/lib/query-client.ts` — singleton TanStack Query client used in `__root.tsx`.
- `src/lib/client/capability.ts` — pure UI helpers (`canUploadOrgDocuments`, `canManageOrgMembers`) — server fns are still the source of truth.

## Step 13: marketplace discovery — search, filters, sort, pagination, table view

Extends the Step 9 marketplace card grid into a full discovery surface for verified buyers. The page is **never public** — `listMarketplaceListings` enforces the same gate as before (admin OR `verified` org with `can_request_medicine`); unverified / un-orged callers receive an empty result so the UI can render an upsell banner without leaking inventory.

- **Validator** (`src/server/validators/listings.ts`) — `listMarketplaceListingsSchema` adds `medicineForm` (full enum), `listingType` (donation / sale, reuses Step-9 `listingTypeFilter`), `minQuantity` (positive int, max 1M), `sort` (`expiry_asc` default · `newest` · `quantity_desc` · `location` placeholder), `page` (≥ 1, default 1), `pageSize` (≤ 60, default 24). Replaces the prior `limit` field. Exports new `medicineFormSchema`, `marketplaceSortSchema`, and `ListMarketplaceListingsInput`.
- **Server fn** (`src/server/functions/listings.ts`) — broader search across `medicines.name`, `genericName`, `strength`, `manufacturer`, and `inventoryBatches.batchNumber` (single ILIKE OR group). Hardened safety predicates (in addition to active + qty > 0 + in-date + own-org-excluded): `inventoryBatches.sealedStatus = 'sealed'`, `storageType ≠ 'refrigerated'`, `medicines.isActive = true`, `isControlled = false`, `requiresColdChain = false` — these mirror the inventory listing-eligibility rules so a listing that violated any of them post-approval still gets hidden. Sort modes resolve to deterministic ORDER BY tuples (always tie-break with expiry asc except for newest). Pagination is `LIMIT pageSize OFFSET (page-1)*pageSize`, with the row query and a `count(*)::int` query running in `Promise.all` against the same WHERE. Returns `{ items, total, page, pageSize, pageCount }`.
- **Reusable filter bar** (`src/components/marketplace/MarketplaceFilters.tsx`) — pure controlled component (`value`, `hasFilters`, `onChange(key, value)`, `onClear`). Two rows: search + city + sort + Clear (top), then 4-up form / type / expiry-window / min-quantity selects. All `<Select>` "any" sentinels collapse to `undefined` upstream so URL stays clean. Reusable for future faceted views (e.g. admin discovery preview).
- **Listing card** (`src/components/marketplace/ListingCard.tsx`) — extracted from the prior inline component. Exports `ListingCard` and `PriceTag` (also reused inside the table cell). Card layout is unchanged; only file location moved.
- **Page** (`src/routes/org.marketplace.tsx`) — `validateSearch` now covers `q`, `city`, `form`, `type`, `expiry`, `minQty`, `sort`, `view` (`cards` | `table`), `page`. All filter mutations clear `page`. View mode is sticky in the URL (so refresh + back/forward preserve table mode). New `ListingTable` (TanStack Table) renders columns: medicine (name + strength + form + generic), seller, available, price (`PriceTag`), expiry (date + `ExpiryStatusBadge`), pickup, open. New `Pagination` row only shows when `pageCount > 1`. Empty state branches: when filters are present → "No matches" with a Clear-filters secondary action; when not → behaviour-preserving copy depending on verification + `can_request_medicine` state. Header description swaps in `total.toLocaleString()` of approved listings for verified buyers.
- **Constants** (`src/components/data/ListingStatusBadge.tsx`) — added `MARKETPLACE_EXPIRY_WINDOW_FILTERS` (only positive windows; "expired" is server-filtered), `MARKETPLACE_SORT_OPTIONS`, `MARKETPLACE_LISTING_TYPE_FILTERS`, `MARKETPLACE_QUANTITY_FILTERS` (10/50/100/500), and a `MarketplaceSortValue` type alias. Existing `LISTING_TYPE_FILTERS` (used elsewhere) is left intact.
- **Detail page** (`src/routes/org.marketplace.$listingId.tsx`) — unchanged; `getMarketplaceListing` already enforced own-org / active / `can_request_medicine` checks in Step 9.

## Step 11: audit logs + reporting dashboards

Append-only audit history exposed through admin and org-scoped surfaces, plus a live metrics dashboard for both audiences.

- **Schema** — no migration. The existing `audit_logs` table (Step 5) is the source of truth; immutability is enforced in app code (no `update`/`delete` server fns in `server/functions/audit.ts` by design).
- **Action registry** (`src/lib/audit-events.ts`) — central list of `AUDIT_ACTIONS` (39 known actions across organizations, documents, medicines, inventory, listings, transfers, deliveries) and `AUDIT_ENTITY_TYPES`. Helpers: `auditActionLabel(action)` (friendly text + safe fallback for unregistered actions), `auditActionTone(action)` (success / warn / danger / accent / neutral / outline mapped from verb suffix), and `AUDIT_ENTITY_LABELS` for entity badges. The `audit_logs.action` column stays free-form `text` so new actions never need a migration.
- **Validators** (`server/validators/audit.ts`): `listAuditLogsSchema` (action, entityType, entityId, actorUserId, actorOrgId, search, dateFrom/dateTo `YYYY-MM-DD`, limit/offset), `getAuditLogSchema`, `orgScopeSchema`, `recentActivitySchema`. Date inputs are widened to start/end-of-day UTC server-side.
- **Server fns** (`server/functions/audit.ts`):
  - `adminListAuditLogs` — admin-only; joins `actorUser` and `actorOrg` (aliased), returns rows + total + paging info; applies all filter combinations; full-text-ish `ilike` across action/email/orgName/entityId.
  - `listOrgAuditLogs` — any org member (or admin); forces `actorOrgId = organizationId`; same filters minus `actorOrgId`.
  - `getAuditLog` — admin can view any row; org users can only view rows whose `actorOrgId` matches their primary org (returns `FORBIDDEN` otherwise).
  - `listRecentActivity` — recent feed for dashboards. Admin-only when `organizationId` is omitted; otherwise scoped + member-checked.
- **Reporting fns** (`server/functions/reports.ts`):
  - `getAdminReportMetrics` — 12 parallel `COUNT`/`SUM` queries: org status counters, listings (active / pending review), transfers (pending / in-flight / completed), failed deliveries, units rescued (`SUM(deliveries.receivedQuantity WHERE status='delivered')`), donated units (price NULL), and stock value saved (`SUM(receivedQuantity × listing.pricePerUnitCents)` joined via transferRequests, paid listings only).
  - `getOrgReportMetrics` — same shape but scoped to one org as seller (listings/inventory/seller-side transfers + impact) and as buyer (incoming requests + completed buys); membership re-checked at call time.
- **Components** (`src/components/data/`):
  - `AuditEventBadge` — wraps `Badge` with tone + friendly label.
  - `MetricCard` — icon tile with tone variants (neutral / accent / warn / danger / success), optional `to`/`search`/`params` to make the card a deep-link.
  - `AuditLogDetailDialog` — read-only modal showing actor (user, org link, IP, UA), entity (type + ID), metadata, and side-by-side `before` / `after` JSON blocks.
  - `RecentActivityFeed` — compact divided list, optional `onSelect(id)` to open the detail dialog. Empty-state aware.
- **Routes**:
  - `/admin` — rewritten dashboard. Two metric rows (workload alerts + impact totals), pending-orgs queue, recent activity feed (clicks open detail dialog), and a footer card linking to Reports + Audit logs.
  - `/admin/reports` — full reporting dashboard. Sectioned `MetricCard` grids: Organizations, Marketplace, Logistics & impact. Recent activity feed at the bottom. CSV export button is disabled with `toast.info('CSV export is coming soon')`.
  - `/admin/audit-logs` — TanStack Table list. Filter bar: free-text search, action select (all 39 known actions), entity-type select, entity ID input, actor org ID input, dateFrom/dateTo. Search params drive the loader (`page`, `action`, `entityType`, `entityId`, `actorOrgId`, `actorUserId`, `q`, `dateFrom`, `dateTo`); page size 50; pagination via prev/next; row "Open" launches the detail dialog (data fetched lazily through `useQuery(['audit-log', id])`).
  - `/org/activity` — org-scoped twin: `MetricCard` grid of `getOrgReportMetrics` results, then a filtered table of `listOrgAuditLogs` (search + action + entityType, page size 25). Detail dialog reuses `getAuditLog` with the org-scoped guard.
- **Nav** (`AppShell`): `ADMIN_NAV` adds `Reports` (`BarChart3`) and `Audit logs` (`ScrollText`). `APP_NAV` adds `Activity` (`Activity`).
- **Empty / loading / error**: every loader uses `PageLoading` + `PageError`; tables and feeds use `EmptyState` with copy that distinguishes "no data yet" from "no matches for current filters" and offers a Clear-filters action when filters are active.
- **Authorization recap**: admin pages call `requireAdmin`; org pages re-validate `requireOrgMember(ctx, orgId)` for non-admins; `getAuditLog` enforces org scoping at the row level using `actorOrgId === ctx.primaryOrg.id`. Admins can view any org's report or audit row.

## Step 10: delivery / pickup tracking workflow

End-to-end delivery lifecycle layered on top of the Step-9 transfer-request loop:

- **Schema + transitions** — `delivery_status` enum extended with `pending`, `pickup_scheduled`, `picked_up`, `failed`, `cancelled` (legacy `scheduled` retained as alias). New `deliveries` columns: `pickupScheduledAt`, `pickedUpAt/ByUserId`, `failedAt/ByUserId/failureReason`, `cancelledAt/ByUserId/cancellationReason`. Default `status` is `pending`. `DELIVERY_TRANSITIONS` covers `pending → pickup_scheduled | cancelled`, `pickup_scheduled → picked_up | cancelled`, `picked_up → in_transit | failed`, `in_transit → delivered | failed | disputed`, `delivered → disputed`.
- **Server fns** (`functions/deliveries.ts`):
  - `adminCreateDelivery` — admin-only; only on `accepted` requests; transitions request → `awaiting_handoff`; captures pickup/dropoff addresses, both contacts, dispatch method, optional courier reference + notes.
  - `adminAssignDeliveryLogistics` — admin assigns a logistics user (must be `LOGISTICS_STAFF` and a member of a verified `logistics_partner` / `distributor` org with `can_deliver_medicine`); allowed in `pending` / `pickup_scheduled`.
  - `schedulePickup` — admin, `pending → pickup_scheduled`.
  - `markPickedUp` — admin **or** the assigned logistics user (membership re-checked at action time), `pickup_scheduled → picked_up`.
  - `markInTransit` — admin or assigned logistics; `picked_up → in_transit`; cascades transfer request `awaiting_handoff → dispatched`; can update courier reference + dispatch notes.
  - `confirmDelivery` — receiver-org member only; `in_transit → delivered`; cascades request → `completed`; **enforces `receivedQuantity === request.quantityRequested`** (mismatch must use dispute); decrements `inventoryBatches.quantityOnHand` and writes a `dispatch_to_buyer` `inventoryAdjustments` row.
  - `markDeliveryFailed` — admin or assigned logistics; `picked_up | in_transit → failed`; does **not** auto-cancel the request (admin can cancel separately).
  - `cancelDelivery` — admin only; `pending | pickup_scheduled → cancelled`; cascades request `awaiting_handoff → cancelled` and restores `listing.quantityAvailable` (reopening the listing if it was `sold_out`).
  - `disputeDelivery` — receiver; `in_transit | delivered → disputed`; reason ≥ 5 chars.
  - `getDelivery` — admin / sender / receiver / assigned logistics; full join (delivery + request + listing + batch + medicine + sellerOrg + requesterOrg + logisticsOrg + logisticsUser, aliased).
  - List fns: `adminListDeliveries` (search across medicine/seller/receiver, status filter), `listOutgoingDeliveries`, `listIncomingDeliveries`, `listMyAssignedDeliveries`, `adminListLogisticsCandidates` (verified `logistics_partner` / `distributor` orgs with `can_deliver_medicine` × their `LOGISTICS_STAFF` members).
  - All transitions wrapped in `db.transaction` with `writeAudit` rows and `assertTransition` against `DELIVERY_TRANSITIONS`.
- **Validators** (`validators/deliveries.ts`): `adminCreateDeliverySchema`, `schedulePickupSchema` (datetime ≥ now − 5 min), `markPickedUpSchema`, `markInTransitSchema`, `markDeliveryFailedSchema` (reason ≥ 5), `cancelDeliverySchema` (reason ≥ 5), `confirmDeliverySchema`, `disputeDeliverySchema`, `assignDeliveryLogisticsSchema` (allows `pending` / `pickup_scheduled`), `getDeliverySchema`, `adminListDeliveriesSchema`, `listOrgDeliveriesSchema`, `listLogisticsCandidatesSchema`. Tuple-spread used for `inArray` casts.
- **Components**:
  - `DeliveryStatusBadge` — covers all 9 statuses (`pending / pickup_scheduled / picked_up / scheduled / in_transit / delivered / failed / cancelled / disputed`) with consistent tone + icon. `DELIVERY_STATUS_FILTERS` for selects.
  - `DeliveryTimeline` — vertical timeline rendering the ordered events (created / assigned / pickup_scheduled / picked_up / in_transit / delivered / failed / cancelled). `DELIVERY_TIMELINE_ICONS` exports the icon map. Skips events that haven't happened yet.
- **Routes**:
  - `/admin/deliveries` — TanStack Table list with search + status filter.
  - `/admin/deliveries/$deliveryId` — full detail surface; pickup + drop-off cards, courier card, failure / cancellation banners, timeline, linked records, and inline dialogs for **schedule pickup**, **mark picked up**, **mark in transit**, **mark failed**, **cancel delivery**, **assign / reassign logistics** (candidates loaded on dialog open via `useQuery`).
  - `/org/deliveries/outgoing` — sender list (`canListMedicine`).
  - `/org/deliveries/incoming` — receiver list (`canRequestMedicine`).
  - `/org/deliveries/$deliveryId` — status-aware banners, party cards, timeline, linked records. Receiver actions: **confirm delivery** dialog (qty defaults to `request.quantityRequested`; explanatory copy nudges users to dispute if mismatched) and **raise dispute** dialog.
  - `/logistics` rewritten — assigned-deliveries list with status filter.
  - `/logistics/$deliveryId` — courier surface; **mark picked up**, **mark in transit**, **mark failed** dialogs.
- **Cross-link**: on `/admin/requests/$requestId`, an `accepted` request gets a `Ready to dispatch` accent card with an inline `Create delivery` dialog. Submission calls `adminCreateDelivery` and navigates to the new `/admin/deliveries/$deliveryId`.
- **Nav**: `ADMIN_NAV` adds `Deliveries` (`Truck`). `APP_NAV` adds `Outgoing deliveries` (gated by `canListMedicine`) and `Incoming deliveries` (gated by `canRequestMedicine`). Logistics nav is unchanged.
- **Authorization recap**: state-changing fns use `requireAdmin` or the new `requireDeliveryCourier` helper (admin OR per-row assigned logistics user with re-checked role + org membership at action time). Receiver actions check `requesterOrgId` membership; sender views check `sellerOrgId` membership. **Read paths also re-check membership**: `getDelivery` only honours the assigned-logistics access path when the actor is still a current member of `assignedLogisticsOrgId` (so removed couriers cannot keep enumerating addresses / contacts), and `listMyAssignedDeliveries` filters by `assignedLogisticsOrgId IN (current memberships)`.
- **Validator constraints**: `schedulePickupSchema.pickupScheduledAt` enforces `>= now − 5 min`. `markDeliveryFailedSchema`, `cancelDeliverySchema`, and `disputeDeliverySchema` require `reason.trim().length >= 5`.

## Step 6: organization onboarding & verification UI

End-to-end flow shipped:

- **Sign-up (`/sign-up`)** — refactored to the new style: split-panel layout, role selector (`org_owner` / `org_staff` / `logistics_staff`), default-cap preview removed (kept on onboarding instead). After signup: `org_owner` → `/onboarding`; everyone else → `homePathForRole(role)`.
- **Onboarding (`/onboarding`)** — guards: signed in, `org_owner`, no existing primary org. RHF + Zod (`createOrganizationSchema`), org-type selector with live default-capability preview, full address form. Submits `createOrganization`, then routes to `/org/documents` to upload paperwork.
- **Org workspace (`/org/*`)** — wrapped by `AppShell section="app"`. First-run owners without an org are bounced to `/onboarding`.
  - `/org` — status banner per `verificationStatus` (pending / verified / rejected / suspended), capability summary, document counters, deep-links to profile + documents.
  - `/org/profile` — read-only snapshot of submitted info (editing arrives in a later milestone).
  - `/org/documents` — list with `DocStatusBadge`, upload dialog (URL + filename + MIME — actual file hosting is a future task), guidance card explaining the verification rule (≥1 approved pharmacy_license OR business_registration). Uploads are locked once the org is verified.
- **Admin (`/admin/*`)** — wrapped by `AppShell section="admin"`. Admin-only via `ADMIN_ROLES`.
  - `/admin` — counters + "awaiting verification" snapshot from `adminListOrganizations`.
  - `/admin/organizations` — status filter chips + free-text search wired through `validateSearch` so URLs are shareable. Each row shows pending-doc count; rendered via `CapabilityChipRow` (disabled chips hidden on the list).
  - `/admin/organizations/$orgId` — full review surface: profile, capability `Switch` toggles (each toggle is its own audit-logged mutation), per-doc approve / reject (Dialog with reason), org-level approve / reject / suspend / reinstate dialogs gated by current `verificationStatus` (matches `ORG_TRANSITIONS`).
- **Logistics (`/logistics/*`)** — wrapped by `AppShell section="logistics"`. Index is an empty state until the delivery workflow ships.
- **Dashboard (`/dashboard`)** — pure redirect: no session → `/sign-in`; org_owner without primary org → `/onboarding`; otherwise → `homePathForRole(role)`.

**Style rules enforced site-wide:**
- `squircle / squircle-lg / -md / -sm / -xs` instead of `rounded-*` (defined in `src/styles.css` via `corner-shape: squircle; border-radius: 50px`).
- No `shadow-*` utilities — depth comes from borders + soft tinted surfaces (`mm-*-soft` tokens).
- Warm canvas (`--color-mm-canvas`) + deep-teal accent (`--color-mm-accent`); status colours use `--color-mm-{ok,warn,bad,cool}` and matching `*-soft` tints.

**Data-fetching conventions:**
- TanStack Router **loaders** for SSR reads (`/org`, `/admin/organizations`, etc.) — never `useQuery` for initial fetches.
- TanStack Query **mutations only** for writes; on success, `await router.invalidate()` then route navigations / toasts.
- All toast feedback via `sonner` (Toaster mounted in `__root.tsx`).
- All error rendering through `PageError`, which parses `{code, message}` envelopes from `toClientError`.

## Step 9: request & claim workflow UI

End-to-end buyer ↔ admin ↔ seller transfer-request loop on top of the Step-3 transfers backend:

- **Marketplace (`/org/marketplace`)** — buyer-friendly responsive card grid (1 / 2 / 3 cols). Cards show first photo, medicine name + strength + generic, price tag (`Free` for donations / `xx.xx CCY/unit` for sales), pickup city, seller name + type, available quantity, and an `ExpiryStatusBadge` with day count. New `listMarketplaceListings` server fn joins listings + batch + medicine + sellerOrg, filters `status=active AND quantityAvailable>0 AND expiryDate>CURRENT_DATE`, excludes the caller's own org, ordered by soonest expiry first. Filters (URL-driven via `validateSearch`): medicine search, pickup city `ILIKE`, expiry-window select. Auth: admins see all; un-orged / non-`can_request_medicine` callers get an empty list plus an explanatory banner instead of an error (intentional upsell surface).
- **Marketplace listing detail (`/org/marketplace/$listingId`)** — new `getMarketplaceListing` server fn with the same join plus an `existingRequest` field (the caller org's in-flight request against this listing, if any). Hard-fails for non-active listings or own-org listings. Renders photo gallery (up to 6), three-up stat row (available/listed, price, pickup), batch + seller cards. Bottom of page is one of three states:
  - **Existing request** → status badge + summary + button to open `/org/requests/$requestId`.
  - **Eligible** (`verified && canRequestMedicine && !admin`) → RHF form (quantity ≤ available, intended-use ≥ 10 chars). Submits to `requestTransfer` then routes to the new request's detail page.
  - **Not eligible** → contextual warning banner (admin / no org / unverified / capability-off).
- **My requests (`/org/requests`)** — TanStack Table fed by new `listMyTransferRequests` server fn (joins request + listing + batch + medicine + sellerOrg, filters by status / medicine / expiry-window). Columns: medicine, seller, quantity, batch expiry (with badge), pickup, submitted, status, open. Filter bar mirrors `/org/listings` ergonomics. Empty state offers `Browse marketplace`.
- **Request detail (`/org/requests/$requestId`)** — joined fetch via new `getTransferRequest` (request + listing + batch + medicine + both orgs, aliased via `drizzle-orm/pg-core` `alias()`). Status-aware banners cover all 10 statuses. Stat row shows quantity, estimated total (qty × unit price, or `Free`), pickup. Cancel `Dialog` (reason ≥ 5 chars) for cancellable statuses (`pending_admin`, `pending_seller`, `accepted`, `awaiting_handoff`); the dialog copy makes clear that `accepted` / `awaiting_handoff` cancellations release the reserved quantity back to the listing.
- **Admin queue (`/admin/requests`)** — new `adminListTransferRequests` server fn (same joins as `getTransferRequest`, dual-aliased orgs for `requesterOrgSearch` / `sellerOrgSearch` `ILIKE`). Defaults the status filter to `pending_admin`; six-up filter bar (medicine / requester org / seller org / status / expiry / clear). Empty state distinguishes "queue clear" from "no matches".
- **Admin request detail (`/admin/requests/$requestId`)** — same join, with separate Requester and Seller cards (each linking to `/admin/organizations/$orgId`) plus a deep-link to the source listing. Pending requests get an Approve `Dialog` (optional notes → audit metadata, calls `adminApproveTransfer` → `pending_seller`) and a Reject `Dialog` (reason required, min 5 chars, calls `adminRejectTransfer`). Non-pending requests get a banner explaining the actions are disabled. Rejection notes from the admin surface on the requester's detail page.
- **Server fn additions** (`functions/transfers.ts`): `getTransferRequest`, `listMyTransferRequests`, `adminListTransferRequests`. `requestTransfer` now also blocks duplicate active requests from the same org against the same listing (active = `pending_admin | pending_seller | accepted | awaiting_handoff | dispatched`). `functions/listings.ts`: `listMarketplaceListings`, `getMarketplaceListing` (the latter returns `existingRequest` for the buyer's org). New validators: `getTransferRequestSchema`, `listMyTransferRequestsSchema`, `adminListTransferRequestsSchema`, `listMarketplaceListingsSchema`, `getMarketplaceListingSchema`.
- **Reusable**: `TransferRequestStatusBadge` covers all 10 transfer statuses (`pending_admin / rejected / pending_seller / declined / accepted / awaiting_handoff / dispatched / completed / expired / cancelled`) with consistent tone + icon mapping. `TRANSFER_REQUEST_STATUS_FILTERS` exports labelled options for selects.
- **Nav**: AppShell APP_NAV adds `Marketplace` (`ShoppingBag`) and `My requests` (`Inbox`), both gated by `canRequestMedicine` only. The Marketplace page itself surfaces the "unverified" banner so the verification flow is discoverable from there (rather than hiding the nav entry behind verification). ADMIN_NAV adds `Transfers` (`Inbox`).
- **Race-safe duplicate-request guard**: in addition to the in-tx SELECT in `requestTransfer`, a partial unique index `transfer_requests_active_uq` on `(listing_id, requester_org_id) WHERE status IN (active statuses)` is the Postgres-level backstop. The insert is wrapped to translate `23505` on this constraint into the same friendly CONFLICT error.
- **Validator parity**: `cancelTransferSchema.reason` now requires `min(5)` to match the cancel-dialog client schema (was `nonEmpty(500)` which allowed 1-char API submits).
- **`getMarketplaceListing` capability gate**: non-admin callers must hold `can_request_medicine` (in addition to the own-org and active-status checks) so the join's batch + seller details aren't enumerable by orgs that can't request anyway.

## Step 8: listing creation & admin approval workflow

End-to-end seller → admin loop shipped on top of the Step-3 listings backend:

- **Seller listings (`/org/listings`)** — server-loader feeds TanStack Table with status / medicine search / listing-type / expiry-window filters (URL-driven via `validateSearch`). Per-row: medicine, batch #, available/listed quantity, price (or "Free"), expiry badge, pickup city, status badge. Verified + `can_list_medicine` orgs see a "New listing" button; non-verified / non-listing orgs see explanatory banners.
- **New listing (`/org/listings/new`)** — gated by `verified && canListMedicine`. Inventory batch picker (loaded via `listInventoryBatches`, client-filtered to eligible: sealed, in-date, non-controlled, non-cold-chain, non-refrigerated, qty>0). Form (RHF + Zod `superRefine`):
  - quantity ≤ batch on-hand,
  - pricing mode `free | paid` (free → `pricePerUnitCents = null`, paid → required price),
  - currency (3-letter),
  - pickup city/country,
  - photo URLs (newline / comma separated — object-storage upload comes later),
  - notes.
  Two actions: **Save draft** (`createListing`) and **Submit for review** (`createListing` → `submitListing`). Server still re-runs every guard via `requireCapability(can_list_medicine)` plus controlled / cold-chain / opened / expired / quantity ceilings.
- **Listing detail (`/org/listings/$listingId`)** — joined fetch via new `getListing` (listing + batch + medicine + sellerOrg). Renders quantity, price, pickup, medicine + batch panels, photo URL list, notes, full timeline. Status-aware actions:
  - `draft` → Submit for review + Withdraw,
  - `pending_admin` / `active` → Withdraw (with confirm `AlertDialog` warning that withdrawals are terminal and blocked when transfer requests are in-flight),
  - `rejected` → reason banner shown with the admin's note,
  - `sold_out` / `expired` / `withdrawn` → terminal display only.
- **Admin queue (`/admin/listings`)** — new `adminListAllListings` server fn (joins listing + batch + medicine + sellerOrg, filters by status / medicine name / org name / listing type / expiry window, ordered by `submittedAt DESC`). Default view = `pending_admin`. Filter bar: medicine search, seller org search, status select (any of the 7 listing statuses), listing-type select (donation/sale), expiry-window select (expired / ≤30d / 31–90d / >90d), Clear button. URL-driven via `validateSearch`. Empty state distinguishes "queue is clear" from "no matches for filters".
- **Admin detail (`/admin/listings/$listingId`)** — same join via `getListing` (admin bypasses org membership). Side panel for seller org with deep-link to the org review page. Pending listings get an Approve `Dialog` (optional notes → audit metadata) and a Reject `Dialog` (reason required, min 5 chars, surfaced to seller). Both call the existing `adminApproveListing` / `adminRejectListing`. Non-pending listings get a banner explaining the actions are disabled.
- **Reusable**: `ListingStatusBadge` covers all 7 statuses (`draft / pending_admin / active / rejected / sold_out / expired / withdrawn`) with consistent tone + icon mapping; `LISTING_STATUS_FILTERS` exports the labelled options for selects.
- **Server fns added**: `getListing`, `listMyListings`, `adminListAllListings` — none require capability checks for read (mirrors inventory pattern); all enforce membership/admin-bypass via `requireOrgMember` / `requireAdmin`. Listing status names diverge from the original spec: there is no separate `RESERVED` / `COMPLETED` (those live on `transferRequests`), and `CANCELLED` ≈ `withdrawn`.
- **Nav**: AppShell adds `Listings` to both APP_NAV (after Inventory) and ADMIN_NAV (after Medicines).

## Step 7: medicine catalog & inventory batch UI

End-to-end CRUD shipped on top of the Step-3 backend:

- **Admin catalog (`/admin/medicines`)** — server-loader fed list with name/generic/manufacturer search and active/inactive toggle (URL-driven via `validateSearch`). Shows status pill, form, manufacturer per row.
- **Create medicine (`/admin/medicines/new`)** — RHF + Zod (`medicineFormSchema`), required `name` / `strength` / `form`; controlled + cold-chain are server-blocked at catalog edge so the UI doesn't expose them.
- **Edit medicine (`/admin/medicines/$medicineId`)** — same form + `Switch` to soft-disable (`isActive`). New server fns added: `updateMedicine`, `getMedicine` (audit-logged before/after).
- **Org inventory (`/org/inventory`)** — TanStack Table render with five columns (medicine / batch # / quantity / expiry / sealed / storage), filter bar (medicine search, batch number, `expiryStatus`, `sealedStatus`, `storageType`), URL-driven; admins bypass org membership for support reads. Verification + capability banners gate the "Add batch" button.
- **Add batch (`/org/inventory/new`)** — gated by `verified && canListMedicine`. Searchable catalog picker (`useQuery` against `listMedicines`). Form-level Zod `superRefine` enforces:
  - expiry strictly in the future,
  - manufacture ≤ expiry,
  - `sealedStatus === 'sealed'`,
  - `storageType !== 'refrigerated'`.
  Server still re-checks every rule plus `requireCapability(can_list_medicine)` and refuses controlled / cold-chain medicines.
- **Batch detail (`/org/inventory/$batchId`)** — joined fetch (`getInventoryBatch`) returns batch + medicine + organization; renders quantity / expiry / sealed / storage / notes. Admins or org members of the owning org may read.
- **Reusable data**: `src/lib/expiry.ts` (`classifyExpiry` → `safe` / `expiring_soon` / `critical` / `expired` at 90/30/0-day breakpoints), `ExpiryStatusBadge`, `SealedStatusBadge`, `StorageTypeBadge`, `MedicineFormLabel` (with `MEDICINE_FORMS` / `STORAGE_TYPES` arrays for selects).
- **Nav**: AppShell adds `Medicines` (admin) and `Inventory` (org) entries.

## Path Aliases (tsconfig)
- `@/*` and `#/*` both map to `./src/*`. Do **not** use `~/*` — it is not configured.

## Auth Roles, Org Types & Capabilities (Step 4 model)

**5 user roles** (stored as plain text on `user.role` via Better Auth `additionalFields`):
- `super_admin` — top-level admin (bootstrapped via seed, never via public signup)
- `admin` — verifier of orgs/listings/transfers (bootstrapped via seed)
- `org_owner` — owner of an org; can manage members and the org profile
- `org_staff` — staff inside an org; same business actions as the owner, no org-management. Default for unknown role values.
- `logistics_staff` — assigned per-delivery, can mark dispatched

**6 org types** (`org_type` enum):
- `pharmacy` (defaults: list + request)
- `clinic` (defaults: list + request)
- `hospital` (defaults: request only — admin can enable list)
- `ngo` (defaults: request only)
- `distributor` (defaults: deliver only)
- `logistics_partner` (defaults: deliver only)

**3 per-org capability flags** (boolean cols on `organizations`, default `false`):
- `can_list_medicine` — gate for inventory/listing/seller-side transfer & delivery actions
- `can_request_medicine` — gate for browsing the marketplace, requesting transfers, confirming/disputing receipt
- `can_deliver_medicine` — gate for dispatching deliveries (org-level; per-row LOGISTICS_STAFF assignment is still required for non-admin dispatchers)

**The authorization rule (enforced in every business server fn):**
> action allowed ⇔ caller is admin/super_admin **OR** caller is a member of an org whose `verificationStatus = 'verified'` **AND** that org has the relevant capability flag = `true`.

User role and org capability are checked together — `requireCapability(ctx, orgId, cap)` is the single helper that does both. Capability flags are managed by admins via `adminUpdateOrganizationCapabilities` (audit-logged); they are seeded from `defaultCapabilitiesForType` at org creation time.

## Environment Variables / Secrets
- `DATABASE_URL` — Replit Postgres connection string (auto-provisioned)
- `BETTER_AUTH_SECRET` — random secret for Better Auth
- `BETTER_AUTH_URL` — base URL (`http://localhost:5000` in dev)

## Running the App
```bash
npm run dev          # Dev server on port 5000
npm run build        # Production build
npm run test         # Run tests
npm run db:push      # Push schema to Postgres (drizzle-kit)
npm run db:studio    # Open Drizzle Studio
npm run db:seed      # Seed dev data
```

## Seeded dev credentials
- super_admin:        `super-admin@medmove.dev` / `SuperAdminPass123!`
- admin:              `admin@medmove.dev` / `AdminPass123!`
- org_owner (pharm):  `pharmacy-owner@medmove.dev` / `PharmaPass123!` — pharmacy org, list+request
- org_owner (hosp):   `hospital-owner@medmove.dev` / `HospitalPass123!` — hospital org, request only
- org_owner (dist):   `distributor-owner@medmove.dev` / `DistribPass123!` — distributor org, deliver only
- org_owner (log):    `logistics-owner@medmove.dev` / `LogisticsPass123!` — logistics_partner org, deliver only
- org_staff (pharm):  `pharmacy-staff@medmove.dev` / `StaffPass123!` — member of pharmacy org
- logistics_staff:    `logistics-staff@medmove.dev` / `LogStaffPass123!` — member of logistics_partner org

## Configuration Notes
- Dev server runs on `0.0.0.0:5000` with `allowedHosts: true` for Replit proxy compatibility
- Deployment target: autoscale (`npm run build` / `node .output/server/index.mjs`)
- Better Auth trusted origins include `localhost:5000` and `*.replit.dev` / `*.replit.app`
- Server functions available via `createServerFn` from `@tanstack/react-start`
- All admin-only server fns use `requireAdmin(ctx)`. All capability-gated business fns use `requireCapability(ctx, orgId, cap)`. The role-only `requireRole` helper is reserved for narrow role checks (e.g. logistics_staff list views).

## Step 12: in-app notifications + expiry alerts

Transactional notifications wired next to every audit-worthy state change, with email/SMS/WhatsApp dispatched after commit (provider stubs).

- **Schema** (`src/lib/schema/notifications.ts`) — `notifications` table with `audience` / `severity` / `type` pgEnums, recipient FKs (`user`/`organization` cascade), entity ref, jsonb metadata, single shared `read_at`, plus a partial unique index `notifications_org_entity_type_uq` (recipient_org_id IS NOT NULL) that backs idempotent expiry-scan inserts.
- **Service** (`src/server/notifications/`) — `createForUser` / `createForOrg` / `createForAdmins` accept an optional Drizzle `tx` so writes happen in the same transaction as `writeAudit`; `dispatchNotificationsAfterCommit(rows)` runs the channel fan-out (`channels/email`, `channels/sms`, `channels/whatsapp` — all stubs that just log) outside the transaction so a slow provider never rolls back the business write.
- **Inbox server fns** (`src/server/functions/notifications.ts`) — `listMyNotifications`, `countUnreadNotifications`, `markNotificationRead`, `markAllNotificationsRead`. Visibility is the union of (audience='user' AND recipientUserId=me) ∪ (audience='organization' AND recipientOrgId IN my orgs) ∪ (audience='admins' AND I'm admin). Org/admin rows use the shared `read_at` (MVP).
- **Wiring** — notification creation inserted next to `writeAudit` in:
  - `organizations.ts` — createOrganization → admins; adminApprove/Reject/Suspend → org.
  - `listings.ts` — submitListing → admins; adminApprove/Reject → seller org.
  - `transfers.ts` — requestTransfer → admins; adminApprove → seller org; adminReject/sellerAccept/sellerDecline → requester org.
  - `deliveries.ts` — adminCreateDelivery → seller + requester; adminAssignDeliveryLogistics → assigned logistics org; schedulePickup → seller; markInTransit → requester; confirmDelivery → seller; markDeliveryFailed → seller + requester.
- **Expiry module** (`src/server/expiry.ts`) — `getOrgExpirySummary(orgId)` returns counters (expired / ≤30d / 31–90d / safe) + top-N urgent batches; `runExpiryScan()` walks every org's non-empty batches and dedup-inserts critical / expiring_soon notifications via `ON CONFLICT DO NOTHING` against the partial unique index. Wrapped in `src/server/functions/expiry.ts` as `getOrgExpirySummaryFn` (org-member-scoped) + `adminRunExpiryScan` (admin-only) so route loaders never import postgres-js client-side.
- **UI** — `NotificationBell` (in `AppShell` topbar, polls `countUnreadNotifications` + opens dropdown of latest 8 with mark-all-read), `/notifications` route (full inbox with All/Unread filter), `ExpiryAlertCards` + `ExpiringInventoryTable` (verified-org-only block on `/org`, deep-links into `/org/inventory?expiryWindow=…` and `/org/inventory/$batchId`). Built on a new `dropdown-menu` primitive (`src/components/ui/dropdown-menu.tsx`).
- **Cron** — `runExpiryScan()` is idempotent and intended for a daily scheduler; see WORKFLOW.md for the deployment note.
