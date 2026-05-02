# MedMove

**Verified B2B medicine redistribution platform** — connecting pharmacies, hospitals, clinics and NGOs to safely redistribute surplus, in-date, sealed medicine that would otherwise be wasted.

Built with TanStack Start, React, TypeScript, Drizzle ORM (PostgreSQL), Better Auth and Tailwind v4.

> **MVP scope** — no payments, no public browsing, no cold-chain enforcement, no controlled substances. See [docs/COMPLIANCE.md](docs/COMPLIANCE.md) for the full safety scope.

---

## Quick start

```bash
npm install
npm run db:push          # sync schema to your dev Postgres
npm run db:seed          # seed users, orgs, catalog, listings, deliveries
npm run dev              # workflow already configured: "Start application"
```

The dev server runs on **port 5000**. Open the preview pane and sign in with one of the seeded accounts (see [Seed accounts](#seed-accounts)).

---

## What MedMove does

1. **Organisations register** with their licence number and supporting documents.
2. **Admins verify** the organisation, granting capability flags:
   - `can_list_medicine` — pharmacies, hospitals, distributors
   - `can_request_medicine` — pharmacies, hospitals, clinics, NGOs
   - `can_deliver_medicine` — logistics partners
3. **Sellers list** surplus inventory (sealed, in-date) drawn from their own batch records.
4. **Admins approve listings** before they go live in the marketplace.
5. **Buyers request transfers**; admin reviews → seller accepts → delivery is created.
6. **Deliveries** progress through `pending → pickup_scheduled → picked_up → in_transit → delivered`, with logistics partners optionally assigned.
7. **Audit logs and in-app notifications** capture every state change.

---

## Architecture

| Layer | Tech |
|---|---|
| App framework | TanStack Start (file-based router, SSR) |
| Frontend | React 19, Tailwind v4, shadcn-style components, Poppins, Lucide icons |
| Server functions | TanStack `createServerFn` with Zod validators |
| Auth | Better Auth (email/password, role on user, primary-org snapshot) |
| ORM | Drizzle (PostgreSQL) |
| State | TanStack Query, route loaders |
| Notifications | In-app + email/SMS/WhatsApp dispatcher seam |

### Source layout

```
src/
  components/         # UI primitives + feature components
    data/             # status badges, capability chips, table toolbar
    dialogs/          # confirm dialogs
    feedback/         # PageError, NotFoundPage, UnauthorizedPage, …
    layout/           # AppShell, PageHeader
    notifications/    # NotificationBell, dropdown
    ui/               # Button, Input, Select, Switch, Card, …
  lib/
    schema/           # Drizzle table definitions
    validators/       # Zod input validators (one file per feature)
    permissions.ts    # RBAC + capability constants and helpers
    auth.ts           # Better Auth server config
    db.ts             # Drizzle client
  server/
    context.ts        # getRequestContext (session + primaryOrg snapshot)
    notifications/    # in-app + channel dispatchers (email/sms/whatsapp seams)
    functions/        # createServerFn handlers (one file per feature)
  routes/             # TanStack Start file routes
scripts/
  seed.ts             # idempotent dev seed
docs/                 # checklists for testing, security, compliance, etc.
```

### Server-function pattern

Every server function follows the same shape:

```ts
export const doThing = createServerFn({
  method: 'POST',
  strict: { output: false },
})
  .inputValidator(doThingValidator.parse)
  .handler(async ({ data }) => {
    return wrap(async () => {
      const ctx = await getRequestContext()
      requireAuth(ctx)                   // returns 401 if no user
      requireCapability(ctx, 'can_list_medicine') // 403 if missing
      return db.transaction(async (tx) => {
        // … domain logic
        await writeAudit(tx, { … })
        return value
      }).then((res) => {
        dispatchNotificationsAfterCommit(res.notifications)
        return res
      })
    })
  })
```

`wrap` converts thrown `AppError`s into client-safe `{ message, code }` shapes; never trust raw error messages from the network on the client.

---

## Permissions model

- **User roles** describe *what kind of actor* the user is: `super_admin`, `admin`, `org_owner`, `org_staff`, `logistics_staff`.
- **Org capabilities** are booleans on the organisation row: `can_list_medicine`, `can_request_medicine`, `can_deliver_medicine`. Capabilities are only granted to **verified** orgs by admins.
- **Server functions always re-check both**, even when the route already guarded — `getServerSession()` is request-cached and never the source of truth for authorisation.
- **Suspended orgs** are bounced to `/suspended` by the `/org` guard. Admins are exempt.

See `src/lib/permissions.ts` for the canonical constants.

---

## Settings & profile (Step 14)

| Route | Purpose |
|---|---|
| `/profile` | Edit display name; read-only email/role/verified status |
| `/account` | Change password (revokes other sessions on success) |
| `/account/notifications` | Toggle in-app, email, SMS, WhatsApp channels |
| `/admin/settings` | Site name, support contacts, banner, sign-up gate, grace period |
| `/org/settings` | Verification + capabilities snapshot, document counts |
| `/suspended` | Friendly read-only landing for suspended orgs |
| `/unauthorized` | Generic 403 surface |

Notification preferences are stored in `user_notification_preferences` (one row per user, lazily created on first read). Platform settings live in a singleton `platform_settings` row.

---

## Seed accounts

Run `npm run db:seed` then sign in with any of:

| Role / org | Email | Password |
|---|---|---|
| Super admin | `super-admin@medmove.dev` | `SuperAdminPass123!` |
| Admin | `admin@medmove.dev` | `AdminPass123!` |
| Pharmacy 1 (verified) | `pharmacy-owner@medmove.dev` | `PharmaPass123!` |
| Pharmacy 2 (verified) | `pharmacy2-owner@medmove.dev` | `Pharma2Pass123!` |
| Pharmacy (pending) | `pending-pharmacy@medmove.dev` | `PendingPass123!` |
| Clinic | `clinic-owner@medmove.dev` | `ClinicPass123!` |
| Hospital | `hospital-owner@medmove.dev` | `HospitalPass123!` |
| NGO | `ngo-owner@medmove.dev` | `NgoPass123!` |
| Distributor | `distributor-owner@medmove.dev` | `DistribPass123!` |
| Logistics owner | `logistics-owner@medmove.dev` | `LogisticsPass123!` |
| Pharmacy staff | `pharmacy-staff@medmove.dev` | `StaffPass123!` |
| Logistics staff | `logistics-staff@medmove.dev` | `LogStaffPass123!` |

The seed is idempotent — re-running it heals roles, capabilities and verification statuses to the canonical defaults.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on port 5000 (configured workflow: **Start application**) |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run db:push` | Apply Drizzle schema to the configured Postgres |
| `npm run db:seed` | Seed users, orgs, catalog, listings, requests, deliveries |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

---

## Documentation

| Doc | Purpose |
|---|---|
| [docs/TESTING.md](docs/TESTING.md) | Manual test checklist organised by role |
| [docs/SECURITY.md](docs/SECURITY.md) | Security review checklist |
| [docs/COMPLIANCE.md](docs/COMPLIANCE.md) | Safety / regulatory scope and what we explicitly don't ship |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deploy checklist |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | Required env vars and how to set them |
| [docs/MIGRATIONS.md](docs/MIGRATIONS.md) | Production schema migration runbook |

---

## Design language

- **Type:** Poppins for everything — display, body, monospace fallbacks.
- **Colour:** deep teal `#0d4f40` accent over pure white surfaces.
- **Surfaces:** no shadows, soft borders, **squircle** corners (`squircle-xs/sm/md`).
- **Tone:** Airbnb-style friendly density — generous whitespace, sentence-case copy, never barked at.

See `src/styles.css` for tokens and `src/components/ui/` for the primitive set.

---

## License

Proprietary — internal MVP. No part of this repository may be redistributed without written permission.
