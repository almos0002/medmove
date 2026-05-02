# MedMove - TanStack Start App

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
