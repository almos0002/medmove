# MedMove - TanStack Start App

## Overview
MedMove is a B2B platform for redistributing near-expiry medicine between verified pharmacies, hospitals/NGOs, and logistics providers, with admin verification of every donation/sale.
Built with TanStack Start (full-stack React framework), TanStack Router for file-based routing, Tailwind CSS v4 for styling, Better Auth for authentication, Drizzle ORM with Replit Postgres for persistence, and Nitro for the server.

**Core business workflow:** see [`WORKFLOW.md`](./WORKFLOW.md) for the full pharmacy → admin → receiver flow.

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
  - `sign-in.tsx`, `sign-up.tsx` - Auth pages (sign-up exposes seller/buyer/logistics_user only)
  - `dashboard.tsx` - Universal post-login redirect to role-specific console
  - `admin.tsx` + `admin.index.tsx` - Admin/super_admin layout + index (guarded)
  - `seller.tsx` + `seller.index.tsx` - Seller layout + index (guarded; admins allowed)
  - `buyer.tsx` + `buyer.index.tsx` - Buyer layout + index (guarded; admins allowed)
  - `logistics.tsx` + `logistics.index.tsx` - Logistics layout + index (guarded; admins allowed)
  - `api/auth/$.ts` - Splat route forwarding all `/api/auth/*` to Better Auth handler
- `src/lib/`
  - `permissions.ts` - **Single source of truth** for the role/org-type model. Exports `ROLES`, `ORG_TYPES`, `AppRole`, `OrgType`, `ADMIN_ROLES`, `PUBLIC_SIGNUP_ROLES`, `isAdminRole()`, `homePathForRole()`.
  - `db.ts` - Drizzle client (postgres-js, reads `DATABASE_URL`)
  - `auth.ts` - Better Auth server config (drizzleAdapter, role + organizationName additional fields, default role `buyer`)
  - `auth-client.ts` - Better Auth React client with `inferAdditionalFields<typeof auth>()`
  - `auth-schema.ts` - Better Auth tables: `user`, `session`, `account`, `verification`
  - `schema/` - Business domain Drizzle schema
    - `enums.ts` - All `pgEnum` definitions; `orgTypeEnum` includes `pharmacy | hospital | ngo | distributor | logistics`
    - `organizations.ts` - `organizations`, `organization_members`, `organization_documents`
    - `medicines.ts` - `medicines` (catalog), `inventory_batches`
    - `listings.ts` - `listings`, `transfer_requests`, `deliveries` (deliveries now has `assignedLogisticsUserId/OrgId/At/ByUserId` + index)
    - `audit.ts` - append-only `audit_logs`
- `src/server/` - Server-only business logic layer
  - `errors.ts` - `AppError` class + `toClientError`
  - `context.ts` - `getRequestContext()` with role coercion (unknown→`buyer` fallback)
  - `audit.ts`, `transitions.ts` - audit writer + state-transition assertions
  - `guards/` - hub re-exports (`index.ts`):
    - `requireAuth`, `requireRole`, `requireOrgMember`, `requireVerifiedOrg` (existing)
    - `requireAdmin` - allows `admin` OR `super_admin`
    - `requireOrganizationAccess` - admin bypass + verified-org default for non-admins
    - `getCurrentUser` - non-throwing accessor
  - `validators/` - Zod input schemas per domain
  - `functions/` - `createServerFn` handlers; new `session.getServerSession`, new `deliveries.adminAssignDeliveryLogistics`, new `deliveries.listMyAssignedDeliveries`; `markDispatched` now also accepts the assigned `logistics_user`.
- `scripts/seed.ts` - Idempotent seed: super_admin + admin + seller + buyer + logistics_user, three verified orgs (pharmacy / hospital / logistics), 10-medicine catalog, 1 demo listing. Re-running upgrades existing role strings.

## Path Aliases (tsconfig)
- `@/*` and `#/*` both map to `./src/*`. Do **not** use `~/*` — it is not configured.

## Auth Roles & Org Types (Step 4 model)
Five roles, stored as plain text on `user.role` via Better Auth `additionalFields`:
- `super_admin` — top-level admin (bootstrapped via seed, never via public signup)
- `admin` — verifier of orgs/listings/transfers (bootstrapped via seed)
- `seller` — sources medicine (formerly `pharmacy`)
- `buyer` — receives medicine (formerly `hospital_ngo`); also the default for unknown role values
- `logistics_user` — assigned per-delivery, can mark dispatched

Five org types (`org_type` enum):
- `pharmacy` (typically owned by sellers)
- `hospital`, `ngo` (typically owned by buyers)
- `distributor`
- `logistics` (new — owned by logistics_users)

Authorization helpers live in `src/lib/permissions.ts` and `src/server/guards/`. Use `requireAdmin(ctx)` for any admin-or-super-admin gate, and `isAdminRole(role)` for boolean checks.

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
- super_admin: `super-admin@medmove.dev` / `SuperAdminPass123!`
- admin: `admin@medmove.dev` / `AdminPass123!`
- seller: `pharmacy-owner@medmove.dev` / `PharmaPass123!`
- buyer: `hospital-owner@medmove.dev` / `HospitalPass123!`
- logistics_user: `logistics-owner@medmove.dev` / `LogisticsPass123!`

## Configuration Notes
- Dev server runs on `0.0.0.0:5000` with `allowedHosts: true` for Replit proxy compatibility
- Deployment target: autoscale (`npm run build` / `node .output/server/index.mjs`)
- Better Auth trusted origins include `localhost:5000` and `*.replit.dev` / `*.replit.app`
- Server functions available via `createServerFn` from `@tanstack/react-start`
- All admin-only server fns use `requireAdmin(ctx)`. All `user.role !== 'admin'` checks use `isAdminRole()`.
