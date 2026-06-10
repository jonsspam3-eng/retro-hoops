# Sovereign Leasing Command

Internal leasing workflow platform for **Sovereign Realty NYC**.

## What this build includes

- Secure app login for Sovereign users.
- Separate Gmail inbox connection flow (not coupled to app login).
- Gmail inquiry import + duplicate prevention + draft-only replies.
- Follow-up and showing workflow pipeline.
- Audit logging for security and Gmail lifecycle events.
- Mock Gmail mode for local/staging testing.

## Security + infrastructure baseline

- No auto-send workflow (`gmail.send` is not requested).
- Human-review-only communication model:
  - `No emails are sent automatically.`
  - `Draft Created — Human Review Required.`
  - `AI output is advisory only.`
- Role-aware permissions enforced in server actions and API routes.
- Gmail OAuth tokens encrypted at rest (`ENCRYPTION_KEY`).
- Account lockout protection for repeated failed credential attempts.
- Production debug controls (`ENABLE_DEBUG_TOOLS=false` by default).

## Auth and Gmail are intentionally separate

### Flow 1: App login (Sovereign Leasing Ops access)

- Credentials login and Google app sign-in are supported.
- Google app login uses:
  - `GOOGLE_AUTH_CLIENT_ID`
  - `GOOGLE_AUTH_CLIENT_SECRET`
- Only approved users can access:
  - Must already exist as an active internal app user.
  - Optional domain and user allowlists:
    - `ALLOWED_GOOGLE_DOMAINS`
    - `APPROVED_GOOGLE_USERS`
- Admin/Super Admin MFA policy is configured through provider enforcement:
  - `GOOGLE_AUTH_ASSUME_MFA=true` in production.
  - `ALLOW_ADMIN_CREDENTIALS_FALLBACK=false` in production.

### Flow 2: Gmail inbox connection (import + draft access)

- Admin/Super Admin users connect inboxes via separate Gmail OAuth.
- Uses:
  - `GOOGLE_GMAIL_CLIENT_ID`
  - `GOOGLE_GMAIL_CLIENT_SECRET`
  - `GOOGLE_GMAIL_REDIRECT_URI`
- Required scopes:
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `https://www.googleapis.com/auth/gmail.compose`
  - `openid`
  - `https://www.googleapis.com/auth/userinfo.email`
- `gmail.send` is intentionally not requested.

## Environment variables

Use `.env.example` for local/dev and `.env.production.example` for Vercel production.

Required production variables:

- Core app:
  - `NODE_ENV`
  - `APP_URL`
  - `NEXTAUTH_URL`
  - `NEXTAUTH_SECRET`
  - `SESSION_SECRET`
  - `ENCRYPTION_KEY`
- Database:
  - `DATABASE_URL`
  - `DIRECT_URL` (if your host requires direct connection for migrations)
- Auth:
  - `GOOGLE_AUTH_CLIENT_ID`
  - `GOOGLE_AUTH_CLIENT_SECRET`
  - `GOOGLE_AUTH_ASSUME_MFA`
  - `ALLOWED_GOOGLE_DOMAINS`
  - `APPROVED_GOOGLE_USERS`
  - `ALLOW_ADMIN_CREDENTIALS_FALLBACK`
- Gmail inbox OAuth:
  - `GOOGLE_GMAIL_CLIENT_ID`
  - `GOOGLE_GMAIL_CLIENT_SECRET`
  - `GOOGLE_GMAIL_REDIRECT_URI`
- Login hardening:
  - `MAX_FAILED_LOGIN_ATTEMPTS`
  - `LOGIN_LOCKOUT_MINUTES`
- AI:
  - `AI_PROVIDER`
  - `OPENAI_API_KEY`
  - `ANTHROPIC_API_KEY`
- Debug:
  - `ENABLE_DEBUG_TOOLS`

## Local setup

1. `npm install`
2. `cp .env.example .env`
3. `npm run db:generate`
4. `npm run db:migrate` (or `prisma db push` for a disposable local DB)
5. `npm run dev`

## Production database (PostgreSQL)

This app is PostgreSQL-first through Prisma.

Recommended hosts:

- Neon
- Supabase Postgres
- Vercel Postgres

Production migration commands:

1. `npm run db:generate`
2. `npm run db:migrate:deploy`
3. (optional) `npm run db:seed` only in demo/staging contexts

Notes:

- `Lead.gmailMessageId` is unique.
- `Lead.gmailThreadId + Lead.email` is unique for thread-level dedupe.
- `User.email` is unique.

## Admin bootstrap (first Super Admin)

Use the bootstrap script only once in production setup:

1. Set env vars for one command:
   - `BOOTSTRAP_ADMIN_EMAIL`
   - `BOOTSTRAP_ADMIN_PASSWORD`
   - `BOOTSTRAP_ADMIN_NAME` (optional)
2. Run:
   - `npm run admin:bootstrap`

Safeguard behavior:

- Script fails if an active `SUPER_ADMIN` already exists.
- Creates or promotes only one first admin identity safely.
- Writes `SUPER_ADMIN_BOOTSTRAPPED` audit log.

## Google Cloud Console setup

Create **two OAuth clients** (do not reuse one client for both flows).

### A) App login OAuth client

Authorized redirect URI:

- `https://YOUR-VERCEL-DOMAIN.vercel.app/api/auth/callback/google`

### B) Gmail inbox OAuth client

Authorized redirect URI (exact):

- `https://YOUR-VERCEL-DOMAIN.vercel.app/api/gmail/callback`

Local Gmail redirect URI:

- `http://localhost:3000/api/gmail/callback`

## Gmail debug console

Route: `/admin/gmail-debug`

Access:

- Admin / Super Admin only.
- In production, requires `ENABLE_DEBUG_TOOLS=true`.

Shows:

- Gmail mode (`MOCK` / `LIVE`)
- Environment and app URL
- Current redirect URI + required redirect URI
- Connected Gmail account
- Access/refresh token existence (never token values)
- Token refresh test result
- Granted scopes
- Last API/import/draft error

## Gmail import + draft test flow

1. Sign in to Sovereign Leasing Ops with an approved user.
2. Open `/gmail-import`.
3. Click **Connect Gmail Inbox** (Admin/Super Admin).
4. Verify connection in `/admin/gmail-debug`.
5. List recent messages.
6. Read one message.
7. Import one inquiry as lead.
8. Re-import same message and confirm duplicate is blocked.
9. Open lead and click **Create Gmail Draft**.
10. Confirm:
    - lead status becomes `DRAFT_CREATED`
    - activity/audit logs are written
    - no email is auto-sent

## Mock Gmail mode

Mock mode is active when Gmail OAuth vars are missing or when live connection is unavailable.

Mock mode supports:

- Listing mock messages
- Reading mock messages
- Importing mock inquiries
- Duplicate prevention checks
- Mock draft creation

It is explicitly labeled as mock in Gmail UI/debug pages.

## Vercel deployment steps (existing project)

1. Confirm branch is updated and pushed.
2. Ensure the existing Vercel project points to this repository.
3. Sync production env vars from `.env.production.example`.
4. Trigger new deployment from the existing project (do not create a separate unrelated project).
5. Run post-deploy Prisma migration (`npm run db:migrate:deploy`) against production DB.
6. Verify `/login`, `/gmail-import`, `/admin/gmail-debug`.

## Deployment verification checklist

- Vercel build succeeds.
- Correct production URL serves latest commit.
- Production PostgreSQL is connected.
- Prisma migrations are applied.
- Approved-user login works.
- Admin/Super Admin policy for MFA provider enforcement is enabled.
- Role permissions work server-side.
- Gmail debug page is restricted correctly.
- Gmail redirect URI shown in debug page matches Google Console exactly.
- Gmail connection test passes.
- Recent Gmail messages list and open.
- Import creates lead.
- Duplicate import is blocked.
- Draft is created.
- No email is auto-sent.
- Audit log records auth/Gmail actions.
- Mock mode still works when Gmail OAuth is absent.

## Known limitations

- Provider-enforced MFA is policy-based (`GOOGLE_AUTH_ASSUME_MFA`) and relies on Google Workspace security settings.
- No automated applicant approval/rejection workflow.
- Calendar provider remains placeholder/mock for now.
