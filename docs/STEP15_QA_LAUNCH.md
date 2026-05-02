# Step 15 — Final QA, demo preparation, and launch checklist

This is the closing checklist for the MedMove MVP. It does **not** add new features — it locks in what is already shipped, gives you a repeatable demo script, and tells you what to verify before going live.

> Reset to a known state with `npm run db:push && npm run db:seed` before running through any section here.

Use the linked docs alongside this one:

- Manual test pass — [TESTING.md](TESTING.md)
- Security review — [SECURITY.md](SECURITY.md)
- Compliance scope — [COMPLIANCE.md](COMPLIANCE.md)
- Production deploy — [DEPLOYMENT.md](DEPLOYMENT.md)
- Required env vars — [ENVIRONMENT.md](ENVIRONMENT.md)
- Schema migration runbook — [MIGRATIONS.md](MIGRATIONS.md)

---

## 1. End-to-end demo script (5–7 minutes)

Total runtime: ~6 minutes. Open three browser windows side-by-side (admin, pharmacy, hospital) so role hand-offs are visible.

| # | Time | Window | Action |
|---|------|--------|--------|
| 1 | 0:00 | Anonymous | Open `/` — read the one-line value prop, click **Sign in**. |
| 2 | 0:20 | Pharmacy | Sign in as `pharmacy-owner@medmove.dev`. Land on `/org`. Show the verified banner, capability chips, and dashboard tiles. |
| 3 | 0:50 | Pharmacy | `/org/inventory` → open batch `BATCH-DEMO-001` (Paracetamol 500 mg). Point out expiry badge, sealed status, on-hand quantity. |
| 4 | 1:20 | Pharmacy | `/org/listings/new` → create a listing from a different in-date sealed batch. Submit. Status = `pending_admin`. |
| 5 | 1:50 | Admin | Sign in as `admin@medmove.dev`. `/admin/listings` shows the new listing in the **Pending review** queue. Open it, click **Approve**. |
| 6 | 2:20 | Admin | Show the audit log row that just appeared on `/admin/audit-logs` (`listing.approved`). |
| 7 | 2:40 | Hospital | Sign in as `hospital-owner@medmove.dev`. `/org/marketplace` → open the just-approved listing. Submit a transfer request with quantity + intended use. |
| 8 | 3:10 | Hospital | Show the request appears under `/org/requests` with status `pending_admin`. |
| 9 | 3:30 | Admin | `/admin/requests` → approve the request. Status moves to `pending_seller`. |
| 10 | 3:45 | Pharmacy | Refresh `/org/requests` (incoming) → accept the request. Status → `accepted`, delivery row auto-created in `pending`. |
| 11 | 4:10 | Admin | `/admin/deliveries` → assign `logistics-staff@medmove.dev` and set pickup window. Status → `pickup_scheduled`. |
| 12 | 4:30 | Logistics | Sign in as `logistics-staff@medmove.dev`. `/logistics` shows assigned delivery. Mark **Picked up**, then **In transit**. |
| 13 | 5:00 | Hospital | `/org/deliveries/incoming` → open the delivery, click **Confirm received**, enter received quantity. Status → `delivered`, request → `completed`. |
| 14 | 5:30 | Admin | `/admin/reports` — show the metrics ticked up (units redistributed, completed transfers). `/admin/audit-logs` — scroll the new rows. |
| 15 | 5:50 | Admin | Bell icon — show the chain of in-app notifications produced along the way. |
| 16 | 6:00 | Close | Recap: verified orgs only, two-stage approval, audit trail, deliberately narrow safety scope. |

If you have an extra minute, tail with the **negative** moment — switch to `pending-pharmacy@medmove.dev` and show the `/org/listings/new` route blocked with a friendly "verification required" message.

---

## 2. Demo story

> "Two months from expiry, GoodHealth Pharmacy in Boston has a surplus of paracetamol they bought for a flu season that never happened. Five blocks away, St Mary's Community Hospital is running short for their walk-in clinic. Today they have no way to know about each other. **MedMove** is the verified back-channel that lets them transfer in-date, sealed medicine — with admin oversight and a full audit trail — instead of throwing it out."

Stick to that arc: **surplus → match → safe transfer → audit**. Avoid the temptation to talk about consumer apps, payments, or cold-chain in the live demo — they are explicitly out of scope.

Realistic supporting characters (already in seed):

- **GoodHealth Pharmacy** (Boston) — verified seller, has surplus paracetamol & ibuprofen.
- **CityCare Pharmacy** (New York) — verified seller, surplus amoxicillin & omeprazole.
- **St Mary's Community Hospital** (Cambridge) — verified buyer, requests surplus.
- **Riverside Family Clinic** (Cambridge) — verified small buyer, requests ORS sachets.
- **OpenHands Relief** (Brooklyn NGO) — verified buyer, requests basics for a clinic drive.
- **NorthStar Distribution** & **SwiftMove Logistics** — deliver capability.
- **BrightSide Pharmacy** — *pending* verification, used to demo the gating.

---

## 3. Demo accounts and what each one shows

All passwords are in the seed and in the README. Sign in to each in separate windows so you can switch quickly.

| Account | Lands on | What to show |
|---|---|---|
| `super-admin@medmove.dev` | `/admin` | Same as admin + `/admin/settings` shows site-wide controls. Use to close sign-ups live. |
| `admin@medmove.dev` | `/admin` | KPI tiles, pending org / listing / request queues, audit logs, reports, deliveries board. |
| `pharmacy-owner@medmove.dev` | `/org` | Verified seller view: inventory, listings (active + pending), incoming requests, outgoing deliveries. |
| `pharmacy2-owner@medmove.dev` | `/org` | Second seller — shows there is a real marketplace (>1 supplier). |
| `pending-pharmacy@medmove.dev` | `/org` | Unverified banner, capability chips greyed out, listing/request CTAs disabled. |
| `clinic-owner@medmove.dev` | `/org` | Small-buyer view, marketplace + requests. |
| `hospital-owner@medmove.dev` | `/org` | Buyer view used in the golden path. Has `can_request_medicine` only by default. |
| `ngo-owner@medmove.dev` | `/org` | NGO buyer — useful to mention "this isn't only for hospitals." |
| `distributor-owner@medmove.dev` | `/org` | Has `can_deliver_medicine` — useful for the post-MVP distributor mention. |
| `logistics-owner@medmove.dev` | `/logistics` | Logistics partner owner — sees all deliveries assigned to the org. |
| `pharmacy-staff@medmove.dev` | `/org` | Staff role — same org data, no ownership-only actions. |
| `logistics-staff@medmove.dev` | `/logistics` | Worker view — sees only the deliveries assigned to them. |

If a window goes stale during the demo, sign out → sign in again. Sessions are 7 days but route loaders cache aggressively.

---

## 4. Golden path test

Run this exactly as written. Tick each box; if anything breaks, **stop the demo prep** and fix before continuing.

- [ ] **Pharmacy creates inventory** — `pharmacy-owner@medmove.dev` → `/org/inventory/new` → create a sealed, in-date batch (expiry > 90 days). Row appears in `/org/inventory` with the right expiry badge.
- [ ] **Pharmacy creates listing** — `/org/listings/new` → pick that batch, list the full quantity. Status = `pending_admin`. Row appears in `/org/listings` and on `/admin/listings`.
- [ ] **Admin approves listing** — `admin@medmove.dev` → `/admin/listings/$listingId` → **Approve**. Status = `active`. Audit row `listing.approved` appears on `/admin/audit-logs`. Notification reaches the seller's bell.
- [ ] **Hospital requests listing** — `hospital-owner@medmove.dev` → `/org/marketplace` → open the listing → submit a request with a smaller quantity and an intended-use note. Status = `pending_admin`.
- [ ] **Admin approves request** — `/admin/requests/$requestId` → **Approve**. Status = `pending_seller`. Pharmacy gets a notification.
- [ ] **Seller accepts request** — pharmacy refreshes `/org/requests` → **Accept**. Status = `accepted`. A delivery row is created in `pending`.
- [ ] **Admin schedules delivery** — `/admin/deliveries/$deliveryId` → assign logistics user → set pickup window. Status = `pickup_scheduled`.
- [ ] **Logistics updates delivery** — `logistics-staff@medmove.dev` → `/logistics/$deliveryId` → **Picked up** → **In transit**.
- [ ] **Hospital confirms received** — `hospital-owner@medmove.dev` → `/org/deliveries/incoming` → **Confirm received** with quantity. Delivery → `delivered`, transfer request → `completed`, listing `quantityAvailable` decreases by the received amount.
- [ ] **Audit logs and metrics update** — `/admin/audit-logs` shows the full chain: `listing.approved`, `transfer_request.created`, `transfer_request.admin_approved`, `transfer_request.seller_accepted`, `delivery.created`, `delivery.assigned`, `delivery.picked_up`, `delivery.in_transit`, `delivery.received`. `/admin/reports` totals (units redistributed, completed transfers) increment. Both seller and buyer notification bells reflect the chain.

---

## 5. Negative test cases

Each one should fail loudly with a friendly message *and* be blocked server-side (turn off the route guard with devtools and re-fire the request to confirm the server function rejects it).

| # | Setup | Expected result |
|---|-------|-----------------|
| N1 | Sign in as `pending-pharmacy@medmove.dev`, navigate to `/org/listings/new`. | Page shows "Verification required" CTA. Direct POST to `createListing` returns `403 capability_required`. |
| N2 | Sign in as the seller of an active listing, open it in `/org/marketplace/$listingId`. | "Request" button is hidden. Direct POST to `createTransferRequest` for own listing returns `400 cannot_request_own_listing`. |
| N3 | Try to list a batch whose `expiryDate < today`. | Listing form blocks with "Cannot list expired medicine." Server returns `400 batch_expired`. |
| N4 | Try to list a batch whose `sealedStatus = 'opened'`. | Form blocks with "Only sealed packs can be listed." Server returns `400 batch_not_sealed`. |
| N5 | Sign in as Pharmacy 1, hit `/org/inventory/$batchId` for one of Pharmacy 2's batches (manipulate the URL). | Route loader returns `NotFoundPage` (404, not 403 — we don't leak existence). Server fetch returns `404 not_found`. |
| N6 | Sign in as `pharmacy-staff@medmove.dev` (org_staff, not admin), POST `adminApproveListing`. | `403 forbidden` with `requireRole` message. UI never renders the **Approve** button for this role. |
| N7 | Sign in as `logistics-staff@medmove.dev`, POST `updateDeliveryStatus` for a delivery not assigned to them. | `403 forbidden` — delivery functions check `assignedUserId === ctx.userId` (or `assignedOrgId === userOrgId` for owners). |
| N8 | Sign in as `pharmacy-owner@medmove.dev`, GET `/admin/audit-logs` directly. | Redirect to `/unauthorized`. Direct call to `listAuditLogs` returns `403 forbidden`. |

Run each N-case once on the seed, and once after the golden path, to make sure no privileged state was accidentally elevated.

---

## 6. Role / capability test matrix

`✓` = allowed, `✗` = blocked at the server function layer (and hidden in UI).

| Action | super_admin | admin | org_owner (verified seller) | org_owner (verified buyer) | org_staff | logistics_staff | unverified org_owner |
|---|---|---|---|---|---|---|---|
| View `/admin/*` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Verify / reject org | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Toggle `signupsEnabled` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Create / edit own batch | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Create listing | ✗ | ✗ | ✓ (cap) | ✗ (no cap) | ✓ if cap | ✗ | ✗ |
| Approve / reject listing | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Submit transfer request | ✗ | ✗ | ✓ if cap | ✓ | ✓ if cap | ✗ | ✗ |
| Approve / reject transfer request | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Seller-accept transfer request | ✗ | ✗ | ✓ (own listing) | ✗ | ✓ (own listing) | ✗ | ✗ |
| Assign delivery to logistics | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Update delivery status (picked_up / in_transit) | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ (assigned only) | ✗ |
| Confirm receipt | ✗ | ✗ | ✗ | ✓ (buyer org) | ✓ (buyer org) | ✗ | ✗ |
| View `/admin/audit-logs` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View `/admin/reports` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Edit own profile / change password | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Toggle own notification channels | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Every row that says `✓ if cap` must additionally check `verificationStatus === 'verified'` — this is what `requireCapability` does centrally.

---

## 7. Status transition test matrix

For each entity, only the listed transitions are reachable. Anything else must throw `400 invalid_transition`.

### Organisation verification (`org_verification_status`)

| From → To | Who | UI surface |
|---|---|---|
| pending → verified | admin | `/admin/organizations/$orgId` Verify |
| pending → rejected | admin | Reject (with reason) |
| verified → suspended | admin | Suspend |
| suspended → verified | admin | Reinstate |
| rejected → pending | admin | Reopen review |

### Listing (`listing_status`)

| From → To | Who | Note |
|---|---|---|
| draft → pending_admin | seller owner/staff | On submit |
| pending_admin → active | admin | Approve |
| pending_admin → rejected | admin | Reject (with reason) |
| active → sold_out | system | When `quantityAvailable = 0` |
| active → withdrawn | seller owner | Manual withdraw |
| active → expired | system / admin | Batch expiry crossed |

### Transfer request (`transfer_request_status`)

| From → To | Who |
|---|---|
| pending_admin → rejected | admin |
| pending_admin → pending_seller | admin |
| pending_seller → accepted | seller |
| pending_seller → declined | seller |
| accepted → awaiting_handoff | system on delivery created |
| awaiting_handoff → dispatched | system on delivery in_transit |
| dispatched → completed | system on delivery delivered |
| any open → cancelled | requester or admin (with reason) |
| any open → expired | system on `expiresAt` reached |

### Delivery (`delivery_status`)

Linear, **no skipping**:

```
pending → pickup_scheduled → picked_up → in_transit → delivered
                                                    ↘ disputed
              ↘ cancelled (only before pickup)
              ↘ failed (terminal at any open stage)
```

Verify each illegal jump (e.g. `pending → delivered`, `delivered → in_transit`) returns `400 invalid_transition` with no audit row written.

---

## 8. Data isolation test checklist

Cross-org leakage is the single biggest risk. Run all of these signed in as `pharmacy-owner@medmove.dev` (Pharmacy 1) and check Pharmacy 2 / hospital data is invisible.

- [ ] `/org/inventory` only returns batches where `organizationId = ctx.org.id`.
- [ ] Direct URL `/org/inventory/$otherOrgsBatchId` returns 404, not the row.
- [ ] `/org/listings` only returns listings where `sellerOrgId = ctx.org.id`.
- [ ] `/org/marketplace` lists `active` listings from other orgs but **never** the seller's own.
- [ ] `/org/marketplace/$listingId` for a `pending_admin` or `rejected` listing of another org returns 404.
- [ ] `/org/requests` (incoming) only shows requests against the org's own listings.
- [ ] `/org/requests` (outgoing) only shows requests where `requesterOrgId = ctx.org.id`.
- [ ] `/org/deliveries/incoming` only shows deliveries where the buyer side = ctx.org.id.
- [ ] `/org/deliveries/outgoing` only shows deliveries where the seller side = ctx.org.id.
- [ ] `/org/activity` audit feed only shows rows where `actorOrgId = ctx.org.id` *or* `entity` belongs to ctx.org.id.
- [ ] Notifications dropdown only contains rows where `recipientUserId = ctx.userId` or `recipientOrgId = ctx.org.id`.
- [ ] Bell unread count matches the dropdown count exactly (no off-by-one from another org's row).
- [ ] Suspending Pharmacy 2 mid-session does not affect Pharmacy 1's data or session.

Repeat the spot checks as `logistics-staff@medmove.dev`: they should only see deliveries assigned to them or to their org, never inventory / listings / requests.

---

## 9. Audit log verification checklist

Run the golden path with a fresh DB, then open `/admin/audit-logs` and confirm the chain. Every privileged write must produce exactly one audit row, written **inside the same transaction** as the mutation.

- [ ] `organization.verified` — actor admin, entity org id.
- [ ] `organization.rejected` — actor admin, includes `rejectionReason` in metadata.
- [ ] `organization.suspended` / `organization.reinstated`.
- [ ] `document.approved` / `document.rejected` — entity = document id.
- [ ] `inventory.batch_created` / `inventory.batch_updated`.
- [ ] `listing.created` (seller) — status `pending_admin`.
- [ ] `listing.approved` / `listing.rejected` (admin).
- [ ] `listing.withdrawn` (seller).
- [ ] `transfer_request.created` (buyer).
- [ ] `transfer_request.admin_approved` / `transfer_request.admin_rejected`.
- [ ] `transfer_request.seller_accepted` / `transfer_request.seller_declined`.
- [ ] `transfer_request.cancelled` (any side, includes reason).
- [ ] `delivery.created` (system on accept).
- [ ] `delivery.assigned` (admin assigns logistics user/org).
- [ ] `delivery.picked_up` / `delivery.in_transit` (logistics).
- [ ] `delivery.received` (buyer) — request also flips to `completed`.
- [ ] `platform_settings.updated` (admin).

Spot checks:

- [ ] No audit row is written when a transaction rolls back (force a constraint violation; the audit row must roll back too).
- [ ] No `update`/`delete` endpoint exists for `audit_logs` — verify there is no server function and no UI affordance.
- [ ] Every row carries `actorUserId`, `actorOrgId` (where applicable), `action`, `entityType`, `entityId`, and a human `summary` in `metadata`.

---

## 10. Notification verification checklist

In-app first; channel dispatch is a logged seam.

- [ ] Bell icon appears in the topbar for every signed-in role.
- [ ] Unread count badge updates within one route navigation of a new event.
- [ ] Clicking a notification marks it read and navigates to the linked entity.
- [ ] **Mark all read** clears the badge.
- [ ] `/account/notifications` toggles for in-app / email / SMS / WhatsApp persist after refresh.
- [ ] Disabling email is honoured — the dispatch seam logs `skipped: pref_off` for that user.
- [ ] Notifications are scoped: a verified pharmacy doesn't see another pharmacy's notifications.
- [ ] These events produce notifications:
  - `organization.verified` → org owner
  - `organization.rejected` → org owner (with reason)
  - `document.approved` / `document.rejected` → uploader
  - `listing.approved` / `listing.rejected` → seller
  - `transfer_request.created` → admin queue + seller heads-up
  - `transfer_request.admin_approved` → seller (action required)
  - `transfer_request.seller_accepted` / `_declined` → buyer
  - `delivery.assigned` → logistics user + buyer + seller
  - `delivery.picked_up` / `_in_transit` / `_delivered` → buyer + seller
  - `inventory.expiring_soon` → org owner (idempotent, one per batch per scan)

---

## 11. UI polish checklist

- [ ] No `shadow-` classes anywhere; no inline `box-shadow`.
- [ ] Every surface uses a squircle radius (`squircle-xs / sm / md`) — cards, buttons, inputs, badges.
- [ ] Pure white background, deep teal `#0d4f40` only on primary CTAs and active nav.
- [ ] Sentence case throughout; no shouty headings, no exclamation marks.
- [ ] Empty states everywhere: inventory, listings, marketplace, requests, deliveries, audit logs, notifications.
- [ ] Loading skeletons (or spinners) on every route that has a loader.
- [ ] Error states use `PageError`, never bare React error boundaries.
- [ ] Status badges are colour-consistent across pages (one component, `StatusBadge`).
- [ ] Tables have a sticky header on long lists and a visible row hover.
- [ ] Date / time formatting is consistent (single `formatDate` / `formatRelative` helper).
- [ ] All destructive actions use `ConfirmDialog` and require typed confirmation for irreversible ones (suspend org, withdraw listing).

---

## 12. Accessibility checklist

- [ ] Every input has a `<label>` (or `aria-label`).
- [ ] Buttons are real `<button>` elements; links are real `<a>` elements; no clickable `<div>`s.
- [ ] Focus ring is visible on every interactive element (Tab through one full page).
- [ ] Tab order matches visual order; modals trap focus and return it on close.
- [ ] Colour contrast ≥ WCAG AA for text on both white and teal surfaces (use a contrast checker on `#0d4f40` text/buttons).
- [ ] Status / verification info conveyed by colour also has a text label.
- [ ] All images and icons used for meaning have `alt` text or `aria-label`; decorative icons are `aria-hidden`.
- [ ] Forms surface errors near the field and announce them to assistive tech (`aria-describedby`).
- [ ] Modal `Esc` closes; modal title is announced; underlying page is `aria-hidden` while open.
- [ ] App is fully keyboard navigable — golden path reachable without a mouse.
- [ ] Page `<title>` updates on each route.

---

## 13. Mobile responsiveness checklist

Test at 360 × 640 (small phone), 768 × 1024 (tablet), 1280 × 800 (laptop).

- [ ] Topbar collapses to a hamburger on ≤ 768 px; bell + avatar still reachable.
- [ ] Side nav becomes a sheet/drawer on ≤ 768 px.
- [ ] No horizontal scroll on `/org`, `/admin`, `/logistics` dashboards at 360 px.
- [ ] Tables become stacked cards or scroll horizontally with a visible affordance — never overflow silently.
- [ ] Modals are full-width on mobile with safe-area padding.
- [ ] Forms keep their labels and errors visible without zooming.
- [ ] Touch targets ≥ 44 × 44 px (buttons, badges that are clickable, table row actions).
- [ ] Marketplace cards reflow to a single column on phone.
- [ ] Notification dropdown is a sheet on phone, not a tiny popover.

---

## 14. Performance checklist

- [ ] `npm run build` finishes with no warnings; bundle size has not regressed (note the previous size in CHANGELOG).
- [ ] Cold load of `/org` < 3 s on a throttled "Fast 3G" simulation.
- [ ] Hot navigation between routes < 500 ms (TanStack Query + route loader cache hits).
- [ ] No N+1 queries — admin pages that show org names use joins, not per-row fetches.
- [ ] Lists are paginated or capped (admin organisations, listings, requests, deliveries, audit logs).
- [ ] Notifications dropdown loads at most the latest 20 rows; full list lives at `/notifications`.
- [ ] Heavy server functions (`reports`, `audit-logs`) use indexed columns in their `where` clauses.
- [ ] No client-side polling intervals shorter than 30 s.
- [ ] Images (logos, doc thumbnails) use intrinsic width/height to avoid layout shift.

---

## 15. Security checklist

The full version lives in [SECURITY.md](SECURITY.md). The launch-day fast pass:

- [ ] `BETTER_AUTH_SECRET` is fresh for production, ≥ 32 random bytes.
- [ ] `MEDMOVE_TRUSTED_SIGNUP` is **unset** in production.
- [ ] Every server function calls `requireAuth` (or is explicitly public) and the privileged ones call `requireRole` / `requireCapability`.
- [ ] Every server function uses a Zod input validator.
- [ ] Suspended orgs cannot exercise capabilities even via direct API call.
- [ ] All multi-row writes are wrapped in `db.transaction(...)`.
- [ ] Notification dispatch happens **after commit** — provider failures never roll back the DB write.
- [ ] No secret is logged. No stack trace leaks to the browser (`toClientError` on the boundary).
- [ ] Auth endpoints sit behind Better Auth's built-in throttle.
- [ ] HTTPS terminated at the edge; cookies `Secure / HttpOnly / SameSite=Lax`.
- [ ] `npm audit` shows no high/critical advisories.
- [ ] Audit log is read-only from the UI and the server (no edit/delete endpoints exist).

---

## 16. Deployment verification checklist

The full version lives in [DEPLOYMENT.md](DEPLOYMENT.md). The launch-day fast pass:

- [ ] Latest `main` is green: `npm run typecheck && npm run lint && npm run build`.
- [ ] All migrations applied per [MIGRATIONS.md](MIGRATIONS.md).
- [ ] Production secrets set in Replit Deployments: `DATABASE_URL` (with `sslmode=require`), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.
- [ ] Replit Deployment target is **Autoscale**; build = `npm ci && npm run build`; run = `npm run start`.
- [ ] Listening on `process.env.PORT`.
- [ ] Anonymous GET `/` renders the landing page in production.
- [ ] `/api/auth/get-session` returns 200 with empty session when logged out.
- [ ] Sign-in with the production admin succeeds and lands on `/admin`.
- [ ] `/admin/settings` shows production site name and support email.
- [ ] Custom domain (if any) is verified, DNS is correct, HSTS planned for 24 h after live.
- [ ] Rollback plan written down: redeploy previous commit; schema is forward-compatible.
- [ ] Release tagged `vYYYY.MM.DD-mvp1` and a one-paragraph CHANGELOG entry written.

---

## 17. Production environment checklist

- [ ] Production Postgres is the same major version as dev (16.x).
- [ ] Daily logical backups are configured; a test restore has been performed in the last 90 days.
- [ ] A separate **staging** database exists if you intend to dry-run migrations.
- [ ] No dev seed data is present in production. Only the bootstrap admin account exists.
- [ ] Bootstrap admin has rotated the seed password.
- [ ] Notification channel adapters (email / SMS / WhatsApp) are wired to **real** provider credentials, or the in-app channel is the only one enabled and that fact is in the release notes.
- [ ] Server logs are streamed to a retained sink (Replit deployment logs by default).
- [ ] Error responses include a request id (or are otherwise correlatable).
- [ ] Time zone handling: server stores UTC; UI formats in the user's locale.
- [ ] `signupsEnabled` is set to **false** by default in production — turn it on once the operator is ready to onboard.

---

## 18. Legal / compliance disclaimer checklist

These checks make sure we never accidentally market ourselves as something we're not. The full scope lives in [COMPLIANCE.md](COMPLIANCE.md).

- [ ] The footer (and `/sign-up`) carries the line: *"MedMove is a B2B redistribution tool for verified organisations. It is not a consumer pharmacy and does not handle controlled substances, opened packs, or cold-chain medicine."*
- [ ] `/sign-up` lists the verification requirement before the form is filled.
- [ ] `/onboarding` makes it explicit that no capabilities are granted until admin verification.
- [ ] `/org/listings/new` shows the "no expired, no opened, no controlled, no cold-chain" rules above the submit button.
- [ ] Privacy line in the footer: *"MedMove never captures patient data."*
- [ ] Operator/regulator note in the footer or `/about` page: *"The deploying organisation is the regulated entity and is responsible for jurisdictional compliance."*
- [ ] Terms of service / acceptable-use copy is approved by the operator's counsel before go-live (this checklist alone does not constitute approval).
- [ ] Cookie banner (if required by jurisdiction) ships before the first paid customer.
- [ ] Data deletion request runbook exists in the operator's internal docs.

---

## 19. README final section

Add the following to the end of the project README once Step 15 is signed off (drop in just before the "License" section):

```markdown
## Status

This is the MVP build (Step 15 complete). The platform is feature-frozen for the launch.
Anything not listed in [docs/COMPLIANCE.md](docs/COMPLIANCE.md) is explicitly out of scope.

For the launch QA pass, demo script, and deploy checklist, see
[docs/STEP15_QA_LAUNCH.md](docs/STEP15_QA_LAUNCH.md).
```

---

## 20. Pitch / demo talking points

Use these as the spine of the spoken pitch. Keep each to one sentence.

1. **The problem.** Hospitals run short while pharmacies down the road throw in-date, sealed medicine away because there is no safe channel between them.
2. **The narrow scope.** MedMove is the back-channel — not a consumer app, not a marketplace, not a payments rail.
3. **The trust model.** Only verified organisations can list, request, or deliver; an admin approves every organisation, every listing, and every transfer request.
4. **The safety rails.** No expired stock, no opened packs, no controlled substances, no cold-chain in MVP — enforced server-side, not just in the UI.
5. **The audit trail.** Every privileged action writes an audit row inside the same transaction as the mutation; the log is read-only.
6. **The lifecycle.** Inventory → listing → admin approval → request → admin approval → seller acceptance → delivery → confirmed receipt — with notifications at every step.
7. **The defaults.** Capabilities are derived from organisation type and only granted to verified orgs; suspension immediately strips them.
8. **What's next.** Distributor routes, verified medical couriers, QR scanning, automated expiry jobs, real channel providers, optional payments, government / NGO partnership mode.

---

## 21. Known MVP limitations

State these proactively — they protect the credibility of the product.

- No file storage yet — `photo_urls` is reserved for the post-MVP object-storage upload; document uploads keep the file name and a placeholder URL only.
- Notifications dispatch is an in-app channel plus a logged seam for email / SMS / WhatsApp; real providers must be wired before going live with those channels.
- Expiry alerts run via an on-demand server function (`/admin/run-expiry-scan`); there is no scheduled job yet.
- No payments, donations, or credit balances.
- No public marketplace or consumer browsing.
- No cold-chain monitoring; refrigerated storage type exists in the schema but is not enforced — operators must reject those listings until cold-chain support ships.
- No controlled substances / opened packs / repackaged or compounded medicine.
- No QR / barcode scanning at handoff or receipt; quantities are entered manually.
- No location-based matching beyond `pickupCity` / `pickupCountry` text.
- No multi-tenant white-labelling — each deploy is one operator.
- No automated test suite yet; QA is the manual checklist in [TESTING.md](TESTING.md) plus the golden path here.
- No SLA monitoring beyond Replit deployment logs.

---

## 22. Post-MVP roadmap

Sequenced loosely from "smallest user-visible win" to "biggest platform shift." Each item is a self-contained engineering bet — pick by operator priority, not in order.

1. **Distributor route integration.** Let distributors publish standing routes (origin city, destination city, weekday cadence, capacity); transfer requests can attach to a matching route at acceptance time so admins schedule against real lanes instead of one-off couriers.
2. **Verified medical courier integration.** Onboard one or two GDP-certified couriers as a first-class `logistics_partner` org type with a capabilities chip (`gdp_certified`), so admins can prefer them over generic third-party couriers.
3. **QR code scanning.** Generate a QR per delivery handoff (pickup and receipt). The logistics + buyer apps scan to advance status, eliminating the manual quantity field at receipt.
4. **Document upload verification improvements.** Object storage (S3-compatible), file type / size enforcement, virus scan, EXIF strip for images, expiry dates on licences, and an admin "reverify" workflow when a licence is about to lapse.
5. **Automated expiry alert jobs.** Replace the on-demand scan with a scheduled job (Replit Scheduled Deployments or cron). Daily run produces `inventory.expiring_soon` notifications for batches at <90 / <30 days, and a weekly admin digest of soon-to-expire inventory across the platform.
6. **Email / SMS / WhatsApp notifications.** Replace the dispatcher seam with real adapters (e.g. Resend / Postmark for email, Twilio for SMS / WhatsApp). Honour `user_notification_preferences` per channel; provide unsubscribe links and STOP keyword handling.
7. **Payment / credit system.** Optional paid mode: invoiced cost recovery between organisations with Stripe Connect or a credit-ledger model; fully gated by a per-deploy feature flag and a separate compliance review.
8. **Donation-only mode.** Inverse of the paid mode — a per-deploy flag that hides any cost field, surfaces a donation badge on listings, and lets NGOs filter by donation-only listings.
9. **Advanced medicine catalog.** Replace the flat catalog with linked external identifiers (RxNorm / SNOMED / ATC), multi-language names, pack-size taxonomy, alternative / equivalent suggestions, and a bulk-import for the operator's local formulary.
10. **Location-based matching.** Geocode pickup and dropoff addresses, surface listings sorted by distance, and add a radius filter on the marketplace and a heatmap on `/admin/reports`.
11. **Analytics dashboard.** A richer `/admin/reports` with units redistributed over time, waste avoided ($ + kg), top sellers / buyers, time-to-approval, time-to-delivery, and CSV export.
12. **Government / NGO partnership mode.** Multi-tenant white-labelling: a regulator or NGO operator can run their own MedMove instance with a custom logo, custom verification doc types, and a per-tenant data residency choice. Includes a partner API for read-only reporting.

---

*End of Step 15. The MVP is feature-frozen. Any new work goes into the roadmap above and gets its own spec — not bolted on.*
