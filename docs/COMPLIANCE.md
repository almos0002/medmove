# Compliance & safety scope

MedMove is an MVP. Its safety posture is **deliberately narrow** — anything not on this list is out of scope and must not be added without a fresh review.

## What MedMove redistributes

- **Sealed** units (factory-sealed packs, strips, bottles, sachets, vials).
- Medicine that is **in date** (expiry > today; UI flags <90 / <30 days).
- **Common over-the-counter and non-controlled prescription** medicines — see catalog.
- Stored at **room temperature** or **cool dry place**. Refrigerated items are allowed in the schema (`storage_type='refrigerated'`) but the MVP does **not** enforce a cold chain — operators must reject these listings until that work ships.

## What MedMove does **not** handle

- **Controlled substances** (DEA Schedule II–V in the US, Class A–C in the UK, equivalents elsewhere). The platform has no UI affordance and no admin override.
- **Opened / part-used** packs.
- **Compounded or extemporaneous preparations.**
- **Cold-chain** (vaccines, biologicals) — the schema accepts the storage type but no temperature monitoring, no transit logging, no broken-chain rejection.
- **Repackaging or relabelling.**
- **Sales to consumers / patients** — strictly business-to-business between verified organisations.
- **Payments** — every transfer is treated as a free redistribution. Any future paid flow is a separate compliance review.
- **Prescription dispensing** — MedMove is upstream of the dispensing decision.

## Verification gates

Every organisation goes through:

1. **License check** — operator confirms the licence number against the regulator's public register before pressing **Verify**.
2. **Document review** — at least one approved document of type `pharmacy_license` (or country equivalent), plus business registration where applicable.
3. **Capability assignment** — only verified orgs get `can_list_medicine` / `can_request_medicine` / `can_deliver_medicine`. Suspended orgs lose every capability immediately.

## Listing gates

Every listing must pass admin review before going live. Reviewers reject if:

- The medicine is not in the catalog (admin must add it via `/admin/medicines/new` first).
- The batch is unsealed.
- The expiry date is < 90 days away (the UI surfaces this; reviewers should still confirm).
- The storage type is `refrigerated` (until cold-chain support ships).
- Photos or notes suggest re-labelling, decanting, or third-party packaging.

## Transfer gates

- Two-stage approval: admin first, then seller.
- Duplicate in-flight requests from the same org for the same listing are blocked by a unique index.
- Quantity requested cannot exceed the listing's `quantityAvailable`; enforced at validate-time and at write-time inside the transaction.

## Delivery gates

- Each delivery records pickup + dropoff addresses and contact names/phones for both sides.
- Status transitions are linear and cannot be skipped (e.g. you cannot mark a `pending` delivery `delivered` without going through `picked_up` and `in_transit`).
- Receiving requires a `receivedQuantity` and closes the originating transfer request.

## Auditability

Every state change writes an audit row (`audit_logs`) with the actor, org context, event name, entity, and a human summary. Audit rows are read-only from the UI.

## Incident process (operator-side)

1. Suspend the involved org from `/admin/organizations/$orgId`.
2. Mark the affected listing(s) `withdrawn` and any in-flight requests `cancelled` with a clear reason.
3. Export the audit log for the affected entities.
4. Notify the regulator if the incident meets the reporting threshold for your jurisdiction.

## Privacy

- Personal data is limited to: name, email, phone (where the user provides it), and the org membership.
- Patient data is **never** captured by MedMove.
- Notification dispatch logs personal contact details only inside the channel-provider stubs; production providers must honour their own data-residency contracts.

## Regulatory disclaimer

MedMove is software infrastructure. It does not certify any individual transfer as compliant with the operator's local law. The operator (the platform's deploying organisation) is the regulated entity and is responsible for jurisdictional compliance.
