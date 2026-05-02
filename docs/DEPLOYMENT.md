# Deployment checklist

MedMove is a TanStack Start app. The Replit-hosted deployment uses an **Autoscale** target — the configured workflow runs `npm run dev` in development; production runs `npm run build` followed by `npm run start`.

## Pre-deploy

- [ ] Latest `main` is green (typecheck, lint, manual checklist in [TESTING.md](TESTING.md)).
- [ ] `npm run build` succeeds locally.
- [ ] All migrations applied per [MIGRATIONS.md](MIGRATIONS.md).
- [ ] All required secrets are set in the production environment — see [ENVIRONMENT.md](ENVIRONMENT.md).
- [ ] `MEDMOVE_TRUSTED_SIGNUP` is **not** set in production.

## Build

- [ ] `npm ci` installs from `package-lock.json` (do not use `npm install` in CI).
- [ ] `npm run build` produces the production bundle.
- [ ] Build logs show no warnings about missing env vars.

## Database

- [ ] Production Postgres is the same major version as development (currently 16.x).
- [ ] `DATABASE_URL` includes `sslmode=require` for managed providers.
- [ ] Daily logical backups are configured and a test restore has been performed in the last 90 days.

## Secrets

- [ ] `BETTER_AUTH_SECRET` is set to a 32+ byte random value distinct from any other environment.
- [ ] `BETTER_AUTH_URL` matches the public origin (e.g. `https://app.example.com`).
- [ ] No secret appears in `vite.config.*`, route loaders, or client-side code.

## Hosting

- [ ] Replit Deployment uses the **Autoscale** target.
- [ ] Build command: `npm ci && npm run build`.
- [ ] Run command: `npm run start`.
- [ ] Listening on the platform-provided `PORT` (TanStack Start respects `process.env.PORT`).
- [ ] HTTPS / TLS is terminated at the edge.

## Health checks

- [ ] After deploy, a logged-out request to `/` renders the public landing page.
- [ ] `/api/auth/get-session` responds 200 with an empty session for an anonymous client.
- [ ] Sign-in with the production admin account succeeds.
- [ ] `/admin/settings` loads and shows the production site name + support email.

## Observability

- [ ] Server logs are streamed to a retained sink (Replit deployment logs by default).
- [ ] Error responses include a request id (preferred) or are otherwise correlatable.
- [ ] Notification channel stubs are swapped for real providers (or remain stubs intentionally — call this out in the release notes).

## Post-deploy

- [ ] Run the smoke section of [TESTING.md](TESTING.md) against production with a real but disposable seed admin.
- [ ] Verify `/admin/audit-logs` shows the deploy-time admin actions.
- [ ] Roll back plan: redeploy the previous commit; the schema is forward-compatible per [MIGRATIONS.md](MIGRATIONS.md).
- [ ] Tag the release in git (`vYYYY.MM.DD-mvpN`) and update CHANGELOG.

## Cold-start considerations

The Autoscale target may scale to zero between requests. The first request after a scale-to-zero will pay a cold-start cost (~1–2s). This is acceptable for MVP — revisit if usage justifies a Reserved VM target.

## Domain & DNS

- [ ] Custom domain (if any) is verified in the Replit deployment dashboard.
- [ ] DNS `A` / `AAAA` / `CNAME` records point at the deployment.
- [ ] HSTS is on once the domain has been live without issue for at least 24 hours.
