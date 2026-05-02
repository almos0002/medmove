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
