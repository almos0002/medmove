# Environment variables

MedMove reads its secrets from environment variables. In Replit, set them through the **Secrets** pane (never commit them to source). Locally, an `.env` file at the repo root works — it's gitignored.

## Required

| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | Postgres connection string used by Drizzle and Better Auth | `postgresql://user:pass@host:5432/medmove?sslmode=require` |
| `BETTER_AUTH_SECRET` | Symmetric secret used to sign session cookies | 32+ random bytes (`openssl rand -hex 32`) |
| `BETTER_AUTH_URL` | Public origin where the app is reachable | `https://medmove.example.com` |

## Optional

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | Port the dev/prod server listens on | `5000` |
| `NODE_ENV` | Standard Node environment toggle | `development` |
| `LOG_LEVEL` | Verbosity for application logs | `info` |

## Seed-only

| Variable | Purpose |
|---|---|
| `MEDMOVE_TRUSTED_SIGNUP` | When `1`, allows the seed script to create `super_admin` / `admin` users despite the public-signup role allowlist. **Never set in production.** Already set inside the `npm run db:seed` script command — you do not need to set it manually. |

## Channel providers (post-MVP)

When you wire up real providers in `src/server/notifications/channels/*.ts`, add the matching env vars here:

| Variable | Channel |
|---|---|
| `RESEND_API_KEY` | Email |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM` | SMS |
| `META_WHATSAPP_TOKEN` / `META_WHATSAPP_PHONE_ID` | WhatsApp |

The channel stubs return `{ skipped: true }` and log a warning when these are missing — that is intentional for the MVP build.

## Setting secrets in Replit

1. Open your Repl, then **Tools → Secrets**.
2. Add each `KEY` / `VALUE` pair.
3. Restart the **Start application** workflow so the new values are picked up.

## Local `.env` template

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/medmove
BETTER_AUTH_SECRET=replace-me-with-openssl-rand-hex-32
BETTER_AUTH_URL=http://localhost:5000
PORT=5000
```
