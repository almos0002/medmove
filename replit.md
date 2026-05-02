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
- **Font**: Poppins (loaded from Google Fonts in `__root.tsx`, set as default `font-sans`)
- **Auth**: Better Auth (email/password) with `inferAdditionalFields` plugin for `role` + `organizationName`
- **Database**: Replit Postgres via `DATABASE_URL`
- **ORM**: Drizzle ORM (`postgres-js` driver) + `drizzle-kit` for schema push
- **Build Tool**: Vite v8
- **Language**: TypeScript
- **Testing**: Vitest + React Testing Library

## Project Structure
- `src/routes/` - File-based routes (TanStack Router, flat convention)
  - `__root.tsx` - Root layout (HTML shell, Poppins font, devtools)
  - `index.tsx` - Home / landing page
  - `sign-in.tsx`, `sign-up.tsx` - Auth pages (sign-up exposes `org_owner` / `org_staff` / `logistics_staff` only)
  - `dashboard.tsx` - Universal post-login redirect to role-specific console
  - `admin.tsx` + `admin.index.tsx` - Admin/super_admin layout + index (guarded)
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
