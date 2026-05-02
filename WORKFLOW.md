# MedMove — Core Project Workflow

This document describes the end-to-end business workflow for the MedMove platform: redistributing near-expiry medicine from pharmacies to hospitals and NGOs that need them.

## Workflow Diagram

```
Pharmacy lists near-expiry medicine
        ↓
Admin verifies listing
        ↓
Hospital/NGO requests medicine
        ↓
Admin approves transfer
        ↓
Pickup/delivery is scheduled manually
        ↓
Receiver confirms received
        ↓
Transfer completed
```

## Step-by-Step Description

1. **Pharmacy lists near-expiry medicine**
   - A pharmacy account creates a listing for medicine that is approaching its expiry date.
   - Listing should include: medicine name, batch number, quantity, expiry date, storage conditions, and pickup location.
   - Status after this step: `PENDING_VERIFICATION`.

2. **Admin verifies listing**
   - An admin reviews the listing for accuracy, safety, and compliance.
   - Admin can approve, reject, or request changes.
   - Status after approval: `AVAILABLE` (visible to receivers).

3. **Hospital/NGO requests medicine**
   - A verified hospital or NGO browses available listings and submits a request.
   - Request includes: requesting organization, intended use, quantity needed, and contact details.
   - Status: `REQUESTED`.

4. **Admin approves transfer**
   - Admin reviews the request and matches it against the listing.
   - On approval, the listing is reserved for that receiver.
   - Status: `APPROVED`.

5. **Pickup/delivery is scheduled manually**
   - Admin (or pharmacy/receiver coordinated by admin) arranges logistics offline.
   - Scheduled date, time, and method (pickup vs delivery) are recorded against the transfer.
   - Status: `SCHEDULED` → `IN_TRANSIT`.

6. **Receiver confirms received**
   - The hospital/NGO confirms physical receipt of the medicine in good condition.
   - Optionally attaches a delivery photo or signed acknowledgment.
   - Status: `RECEIVED`.

7. **Transfer completed**
   - System marks the transfer as complete, archives it for reporting, and updates analytics
     (medicine saved, expiry waste avoided, beneficiaries served).
   - Status: `COMPLETED`.

## Roles

- **Pharmacy** — lists medicines, fulfills approved transfers.
- **Hospital / NGO (Receiver)** — browses listings, requests medicines, confirms receipt.
- **Admin** — verifies listings, approves transfers, coordinates logistics.

## Status Lifecycle (Reference)

```
PENDING_VERIFICATION → AVAILABLE → REQUESTED → APPROVED → SCHEDULED → IN_TRANSIT → RECEIVED → COMPLETED
                    ↘ REJECTED                ↘ CANCELLED
```

## Step 12 — Notifications & Expiry Alerts

The platform writes in-app notifications next to every audit-worthy state
transition (`createForUser` / `createForOrg` / `createForAdmins` from
`src/server/notifications/`). Rows are inserted inside the same Drizzle
transaction as `writeAudit`, then the post-commit channel dispatcher
(`dispatchNotificationsAfterCommit`) fans out email/SMS/WhatsApp via stubbed
providers under `src/server/notifications/channels/`.

### Expiry scan (cron)

`runExpiryScan()` in `src/server/expiry.ts` sweeps every org's non-empty
batches and inserts one notification per (org, batch) in the critical
(≤30d) or expiring_soon (31–90d) windows. The DB partial unique index
`notifications_org_entity_type_uq` makes it idempotent — re-running the
scan never produces duplicates.

Wire it to a daily scheduler (e.g. Replit Scheduled Job, GitHub Action, or
an in-process timer) hitting an admin-only server fn that calls
`runExpiryScan()`. There is no built-in cron — the function is safe to call
on-demand from the admin tools while waiting on a scheduler.
