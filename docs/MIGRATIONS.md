# Migrations runbook

MedMove uses **Drizzle Kit** with `db:push` for development. Production schema changes use the same Drizzle definitions but require an extra review and verification step — never run `db:push --force` against production without doing the dry-run below first.

## Dev workflow

1. Edit the relevant table file under `src/lib/schema/`.
2. Re-export from `src/lib/schema/index.ts` if you added a new table.
3. Run `npm run db:push` and inspect the generated SQL in the prompt.
4. If the change is destructive, the prompt warns you and asks for confirmation.
5. After accepting, re-run the dev seed (`npm run db:seed`) so generated columns get representative data.

## Production workflow

> **Pre-flight:** take a fresh logical backup. Verify it restores into a scratch database before continuing.

1. **Dry-run on staging.**
   - Sync staging Postgres to a recent prod snapshot.
   - Run `npx drizzle-kit push --config=drizzle.config.ts` against staging with the prod-shaped data.
   - Capture the printed SQL diff in the deploy ticket.
2. **Review the diff.**
   - Are any columns dropped? Renamed? (Drizzle treats rename as drop+add — write a manual SQL migration if you need data preserved.)
   - Are any indexes added on large tables? Plan a maintenance window or use `CREATE INDEX CONCURRENTLY` via a manual SQL migration instead.
   - Will the change break the currently-deployed app code? If yes, ship the schema change first as a backwards-compatible additive change, deploy the new code, then ship the cleanup migration in a follow-up.
3. **Apply to production.**
   - Use `psql` with the captured SQL, OR run `drizzle-kit push` with explicit confirmation.
   - Watch the deploy logs for app errors during the rollout.
4. **Verify.**
   - Hit the health checks listed in [DEPLOYMENT.md](DEPLOYMENT.md).
   - Spot-check that recent rows still read/write through the new schema.
5. **Roll-forward only.** If something is wrong, write a remediation migration. Avoid manual edits to the live database — they break the schema-as-code contract.

## Backwards-compatible patterns we use

- **Add column with default + NOT NULL.** Add the column nullable + with a default in step 1, backfill in step 2, then `ALTER COLUMN … SET NOT NULL` in step 3.
- **Renames as add + dual-write + drop.** Add the new column, dual-write at the application layer, backfill, switch reads, then drop the old column in a later release.
- **Enum value adds** are safe. Enum value renames are not — write a manual `ALTER TYPE` migration.

## Singleton tables

`platform_settings` is a single-row table guarded by a unique partial index on `singleton`. The first read auto-creates the row via `ensureRow()`. If you change the singleton table:

- Always include defaults in the new column DDL so the existing row stays valid.
- Update `ensureRow()` if the new column needs a non-DDL default.

## Audit-log retention

`audit_logs` grows linearly. Plan a quarterly archive job once table size approaches 1M rows. Audit rows are never deleted from the UI.

## Backup & restore drills

Run a restore-test to scratch hardware **at least quarterly**:

1. Provision a scratch Postgres.
2. Restore the latest production backup.
3. Boot a copy of the app pointed at the scratch DB with `npm run start`.
4. Sign in as a known admin, confirm dashboards render, then tear it all down.

Document the date/time and any issues in the runbook log.
