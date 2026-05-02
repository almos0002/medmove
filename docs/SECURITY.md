# Security checklist

Run this before every production deploy and on a quarterly cadence in steady state.

## Authentication

- [ ] Better Auth secret (`BETTER_AUTH_SECRET`) is set and ≥ 32 random bytes.
- [ ] Cookies use `Secure`, `HttpOnly`, `SameSite=Lax` in production.
- [ ] Session lifetime is reasonable (default 7 days) and `revokeOtherSessions: true` is used on password change.
- [ ] Public sign-up role allowlist (`PUBLIC_SIGNUP_ROLES`) is enforced server-side.
- [ ] `MEDMOVE_TRUSTED_SIGNUP=1` is **never** set in production — it bypasses the allowlist for the dev seed.

## Authorisation

- [ ] Every server function calls `requireAuth(ctx)` or is explicitly public.
- [ ] Every privileged server function calls `requireRole` and/or `requireCapability`.
- [ ] No code branches on a raw role/type string — only the constants in `src/lib/permissions.ts`.
- [ ] Suspended orgs cannot exercise capabilities even via direct API calls.

## Input validation

- [ ] Every server function uses a Zod validator on `inputValidator(...)`.
- [ ] Validators reject unknown keys (`.strict()` where applicable).
- [ ] String lengths are capped (license number, names, notes, banner text, etc.).
- [ ] Numeric fields use `.int().nonnegative()` / `.positive()`.

## Data integrity

- [ ] All multi-row writes are wrapped in `db.transaction(...)`.
- [ ] Side effects (email/SMS/notifications dispatch) are scheduled **after commit** with `dispatchNotificationsAfterCommit`.
- [ ] DB constraints enforce business invariants (capability flags, qty ≥ 0, qty_available ≤ qty_listed, unique active request per listing/org).

## Audit logging

- [ ] `writeAudit` is called from inside the same transaction as every privileged mutation.
- [ ] Audit rows include: actor user id, actor org id (if any), event, entity type/id, summary.
- [ ] Audit log is read-only from the UI (no edit/delete endpoints).

## Secrets

- [ ] `DATABASE_URL` and `BETTER_AUTH_SECRET` come from `.env` / Replit Secrets — never checked in.
- [ ] No secret is logged in stdout/stderr.
- [ ] Source tree contains no `.env` files (`.gitignore` covers them).

## Transport

- [ ] HTTPS is enforced at the edge in production.
- [ ] Sensitive cookies are restricted to the production domain.

## Headers

- [ ] `Content-Security-Policy` allows only required origins (Google Fonts, app self).
- [ ] `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin` set on the framework response.

## Dependencies

- [ ] `npm audit` shows no high/critical advisories. Re-run after `npm update`.
- [ ] Lockfile committed; CI installs with `--frozen-lockfile` / `npm ci`.

## Error handling

- [ ] Errors thrown server-side are converted via `toClientError` — no stack traces leak to the browser.
- [ ] Unexpected errors land in `PageError` and produce a server log line with a request id.

## Rate limiting & abuse

- [ ] Auth endpoints (`/api/auth/sign-in`, `/api/auth/sign-up`) are behind a basic rate-limit / Better Auth's built-in throttle.
- [ ] Admin verify/reject actions are not exposed to non-admin sessions.

## Notification channels

- [ ] Email / SMS / WhatsApp providers run on production credentials only.
- [ ] Provider failures never roll back the originating DB transaction (already enforced by `dispatchNotificationsAfterCommit`).

## What we do **not** ship in MVP

- No payments — see [COMPLIANCE.md](COMPLIANCE.md).
- No public marketplace browsing.
- No file storage / EXIF stripping yet — `photo_urls` is reserved for the post-MVP object-storage upload.
