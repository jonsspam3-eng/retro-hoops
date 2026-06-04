# Sovereign Leasing Command

Internal leasing operations platform for **Sovereign Associates / Sovereign Realty NYC**.

## Phase 2 overview (implemented)

Phase 2 adds Gmail-powered leasing inquiry workflows while keeping human control:

- Gmail OAuth connection flow for admin users
- Live Gmail import dashboard (with mock fallback mode)
- Inquiry detection and source classification (StreetEasy, Zillow, RealtyMX, website, direct email, unknown)
- Parsing of qualification fields from inbound email content
- Listing matching with confidence scoring and manual reassignment support
- Duplicate prevention using Gmail message/thread IDs + fallback heuristics
- AI-assisted draft generation and **Gmail draft creation only** (no auto-send)
- Lead detail upgrades with Gmail metadata, source confidence, listing match confidence, and activity timeline

## Current product capabilities

### Phase 1 foundation

- Manual lead and listing dashboard
- Lead records and listing CRUD
- Email templates with merge variables
- AI assistant abstraction
- Qualification scoring
- Agent/admin handoff views
- Notes and audit-log schema

### Phase 2 additions

- Gmail OAuth + token refresh support
- Gmail import page at `/gmail-import`
- Bulk import selected inquiry messages into leads
- Human review-first draft workflow labels:
  - `Draft Created — Human Review Required`
  - `AI-generated draft`
  - `Review before sending`
  - `Do not rely on AI for final applicant approval`

## Required environment variables

Copy `.env.example` to `.env` and set values:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `AI_PROVIDER`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (recommended local value: `http://localhost:3000/api/gmail/callback`)
- `GMAIL_TOKEN_ENCRYPTION_KEY`

## Local development

1. Install dependencies

```bash
npm install
```

2. Configure environment

```bash
cp .env.example .env
```

3. Generate Prisma client

```bash
npm run db:generate
```

4. Optional: migrate + seed a local Postgres database

```bash
npm run db:migrate
npm run db:seed
```

5. Run app

```bash
npm run dev
```

6. Run quality checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Gmail OAuth setup steps

1. Create or select a Google Cloud project.
2. Enable the **Gmail API**.
3. Configure OAuth consent screen for internal tooling.
4. Create OAuth client credentials (Web application).
5. Add authorized redirect URI:
   - `http://localhost:3000/api/gmail/callback`
6. Add credentials into `.env`:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`
7. Add `GMAIL_TOKEN_ENCRYPTION_KEY` (strong secret).
8. Sign in as an admin user and open `/gmail-import`.
9. Click **Connect Gmail (Admin)** and complete OAuth.

## Mock mode instructions

If Google OAuth variables are missing, the app automatically runs in **mock Gmail mode**:

- `/gmail-import` shows sample inquiry messages
- Bulk import still creates leads
- Draft creation still works using mock draft storage
- UI clearly indicates mock mode

This keeps local development/test workflows usable without external credentials.

## Human review and compliance guardrails

- No automatic email send in Phase 2.
- No automatic applicant approval/denial from AI outputs.
- Qualification logic should remain tied to legitimate rental criteria.
- OAuth tokens are encrypted at rest and never displayed in UI.

## Known limitations (Phase 2)

- Gmail import currently focuses on recent messages and inquiry keyword/rule matching.
- Source detection and parsing are heuristic-based; manual correction remains expected.
- Threading is supported for draft creation, but send/dispatch remains intentionally manual.
- OAuth token revocation handling is graceful but does not yet include proactive reconnect notifications.

## Demo credentials

- `admin@sovereignnyc.com` / `Sovereign123!`
- `Quick demo sign-in` button is available on the login page.

## Phase 3 roadmap (recommended)

- Auto-assist follow-up sequencing (still human-approved send)
- Advanced conversion analytics and cohort trend reporting
- External source connectors (StreetEasy/RealtyMX ingestion pipelines)
- SLA monitoring for response latency and agent performance
- Richer fair-housing compliance policy checks for generated drafts
