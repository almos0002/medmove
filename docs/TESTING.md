# Testing checklist

This is a manual / acceptance test pass for MedMove. Run it after every meaningful change before tagging a release. There is no automated test suite yet — keep this in sync as features evolve.

> Reset to a known state with `npm run db:push` then `npm run db:seed` before running through this checklist.

## Auth & session

- [ ] Sign-in with `admin@medmove.dev` / `AdminPass123!` lands on `/admin`.
- [ ] Sign-in with `pharmacy-owner@medmove.dev` lands on `/org` (verified).
- [ ] Sign-in with `pending-pharmacy@medmove.dev` lands on `/org` and shows the unverified banner.
- [ ] Sign-out from any topbar dropdown returns to `/sign-in`.
- [ ] Sign-up at `/sign-up` only allows `org_owner / org_staff / logistics_staff` roles.
- [ ] When `signupsEnabled = false` in `/admin/settings`, `/sign-up` shows the closed-beta message.

## Profile & account

- [ ] `/profile` updates the display name and shows the new value after refresh.
- [ ] `/account` rejects a password under 8 characters.
- [ ] `/account` rejects when new ≠ confirm.
- [ ] `/account` accepts a valid change and revokes other sessions (sign in elsewhere first to verify).
- [ ] `/account/notifications` toggles persist after a refresh.

## Onboarding & verification

- [ ] An `org_owner` without an org is redirected to `/onboarding` from `/org`.
- [ ] Submitting a registration creates a `pending` org, surfaces in `/admin/organizations`.
- [ ] Admin verifies the org → capability flags appear → owner sees lifted unverified banner.
- [ ] Admin rejects an org → owner sees rejection reason on `/org/profile` and `/org/settings`.
- [ ] Admin suspends a verified org → owner is bounced to `/suspended` from `/org`.

## Documents

- [ ] Owner uploads a document on `/org/documents` (status `pending`).
- [ ] Admin approves / rejects → status updates on the owner's view + audit log.

## Inventory

- [ ] Owner creates a batch on `/org/inventory/new`.
- [ ] Editing a batch updates quantity / expiry / storage.
- [ ] Expiry badges colour-code correctly: ok > 90 days, warn 31–90, critical 1–30, expired < 0.
- [ ] Expiry scan creates `inventory.expiring_soon` notifications (idempotent on re-run).

## Listings

- [ ] Pharmacy owner creates a listing from a sealed in-date batch.
- [ ] Listing appears with `pending_admin` status; admin can approve / reject.
- [ ] Approved listing appears in `/org/marketplace` for orgs with `can_request_medicine`.
- [ ] Rejected listing carries the rejection reason in the seller view.

## Marketplace & requests

- [ ] Buyer org submits a request from `/org/marketplace/$listingId`.
- [ ] Duplicate active request from the same org on the same listing is rejected at the DB level.
- [ ] Admin approves → status goes to `pending_seller`; seller accepts → `accepted`.
- [ ] Cancellation from any side leaves a `cancellationReason`.

## Deliveries

- [ ] Accepting a request creates a delivery in `pending` status.
- [ ] Admin can assign a logistics user; the user sees the delivery on `/logistics`.
- [ ] Status progresses pending → pickup_scheduled → picked_up → in_transit → delivered.
- [ ] Receiving a delivery sets `receivedQuantity` and the request → `completed`.

## Notifications

- [ ] Bell icon shows unread count and updates when new events fire.
- [ ] Marking a notification read clears the unread count.
- [ ] Disabling email in `/account/notifications` is honoured by the dispatch seam logs.

## Settings (admin)

- [ ] `/admin/settings` saves site name, support email/phone, banner, sign-up toggle, grace period.
- [ ] Banner change is reflected on the dashboard after refresh.
- [ ] Audit log records every change with the admin's user id.

## Settings (org)

- [ ] `/org/settings` shows correct capability flags, doc counts, and rejection reason if any.

## Audit log

- [ ] Every privileged write (verify/reject org, approve/reject listing, accept/decline request, status changes on deliveries) creates an audit row.
- [ ] `/admin/audit-logs` filters by event, actor, entity work as expected.

## Visual / design

- [ ] No shadows anywhere (no `shadow-`, no `box-shadow`).
- [ ] Squircle radii used for every surface (cards, badges, buttons, inputs).
- [ ] Pure white backgrounds; deep teal accent only on primary CTAs and active nav.
- [ ] Mobile (≤ 640px) keeps nav and topbar usable; no horizontal scroll on dashboard pages.
