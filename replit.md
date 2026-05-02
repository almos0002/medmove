# MedMove - TanStack Start App

## Overview
MedMove is a platform for redistributing near-expiry medicine from pharmacies to hospitals and NGOs, with admin verification of every donation.
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
- `src/routes/` - File-based routes (TanStack Router)
  - `__root.tsx` - Root layout (HTML shell, Poppins font, devtools)
  - `index.tsx` - Home / landing page
  - `sign-in.tsx`, `sign-up.tsx` - Auth pages
  - `dashboard.tsx` - Authenticated dashboard
  - `api/auth/$.ts` - Splat route forwarding all `/api/auth/*` to Better Auth handler
- `src/lib/`
  - `db.ts` - Drizzle client (postgres-js, reads `DATABASE_URL`)
  - `auth.ts` - Better Auth server config (drizzleAdapter with schema, role + organizationName additional fields, trustedOrigins for Replit)
  - `auth-client.ts` - Better Auth React client with `inferAdditionalFields<typeof auth>()`
  - `auth-schema.ts` - Better Auth tables: `user`, `session`, `account`, `verification`
  - `schema/` - Business domain Drizzle schema
    - `enums.ts` - All `pgEnum` definitions (org type/status, listing/request/delivery status, etc.)
    - `organizations.ts` - `organizations`, `organization_members`, `organization_documents`
    - `medicines.ts` - `medicines` (catalog), `inventory_batches`
    - `listings.ts` - `listings`, `transfer_requests`, `deliveries` (+ CHECK constraints on quantities)
    - `audit.ts` - append-only `audit_logs`
    - `index.ts` - re-exports all tables and relations
- `scripts/seed.ts` - Idempotent dev seed (admin + pharmacy + hospital users, 10 medicines, demo listing)
- `src/router.tsx` - Router configuration
- `src/styles.css` - Global styles
- `drizzle.config.ts` - Drizzle Kit config
- `vite.config.ts` - Vite + TanStack Start config

## Path Aliases (tsconfig)
- `@/*` and `#/*` both map to `./src/*`. Do **not** use `~/*` — it is not configured.

## Auth Roles
Three roles supported via Better Auth `additionalFields`:
- `pharmacy` (default) — donates medicine
- `hospital_ngo` — receives medicine
- `admin` — verifies and approves donations

Sign-up form (`/sign-up`) lets users pick a role and provide an organization name; both are persisted on the `user` row.

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
npm run db:seed      # Seed dev data (admin + pharmacy + hospital + demo listing)
```

## Seeded dev credentials
- admin: `admin@medmove.dev` / `AdminPass123!`
- pharmacy owner: `pharmacy-owner@medmove.dev` / `PharmaPass123!`
- hospital owner: `hospital-owner@medmove.dev` / `HospitalPass123!`

## Configuration Notes
- Dev server runs on `0.0.0.0:5000` with `allowedHosts: true` for Replit proxy compatibility
- Deployment target: autoscale (`npm run build` / `node .output/server/index.mjs`)
- Better Auth trusted origins include `localhost:5000` and `*.replit.dev` / `*.replit.app`
- Server functions available via `createServerFn` from `@tanstack/react-start`
