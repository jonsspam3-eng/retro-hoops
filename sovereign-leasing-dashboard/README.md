# Sovereign Leasing Command

Internal leasing inquiry dashboard for **Sovereign Realty NYC**.

## Phase 2 (stabilized)

Phase 2 focuses on safe, testable Gmail workflows:

- Connect Gmail with OAuth (admin-only)
- List recent inquiry-like messages
- Read message details (including raw payload in debug view)
- Import selected messages into leads
- Prevent duplicate imports
- Create Gmail drafts only (never auto-send)
- Run full mock mode without Google setup
- Use admin debug tools at `/admin/gmail-debug`

## Phase 3 (follow-up + showing workflow)

Phase 3 adds post-reply execution workflows for Sovereign Realty NYC:

- Dedicated pipeline board at `/pipeline` with grouped queues:
  - Due Today
  - Overdue
  - Waiting on Client
  - Waiting on Agent
  - Qualified, No Showing Scheduled
  - Draft Created, Not Sent
  - Stale Leads Recommended for Archive
- Pipeline filters for agent, listing, source, qualification status, follow-up stage, due date, and showing status.
- Follow-up tracking fields on each lead:
  - `lastContactedAt`
  - `lastClientReplyAt`
  - `nextFollowUpAt`
  - `followUpStage`
  - `followUpPaused`
  - `followUpPauseReason`
  - `followUpSequenceId`
  - `followUpAttemptCount`
- Admin-editable follow-up sequences with timing, template mapping, active/paused/completed state, listing targeting, and source targeting.
- Draft-only follow-up actions:
  - Generate Follow-Up Draft
  - Create Gmail Draft Follow-Up
  - Copy Follow-Up Text
  - Mark Follow-Up Completed
  - Pause / Resume Follow-Ups
  - Mark Lead Stale
  - Archive Lead
- Showing workflow statuses:
  - `NOT_REQUESTED`
  - `SHOWING_REQUESTED`
  - `TIMES_OFFERED`
  - `SHOWING_CONFIRMED`
  - `SHOWING_COMPLETED`
  - `NO_SHOW`
  - `RESCHEDULE_NEEDED`
  - `APPLICATION_REQUESTED`
  - `ARCHIVED`
- Showing actions from lead detail:
  - Mark Showing Requested
  - Offer Showing Times
  - Confirm Showing
  - Mark Showing Completed
  - Mark No-Show
  - Request Reschedule
  - Draft Application Instructions
  - Archive Lead
- Calendar integration placeholder only (`calendarProvider`, `mockCalendarProvider`, `createShowingEventPlaceholder`).
- AI advisory upgrades:
  - AI Recommendation
  - Human Review Required
  - Suggested Next Action
  - Showing confirmation draft language
  - Missing-info prompts

## Follow-up sequence defaults

Default sequence is:

1. Follow-up 1 after 24 hours
2. Follow-up 2 after 48 hours
3. Final follow-up after 5-7 days
4. Stale/archive recommendation after final touch if no reply

## Pause conditions

Follow-ups are paused when:

- Client replies
- Lead is archived
- Lead is marked not interested
- Showing is scheduled/confirmed
- Application instructions are drafted
- Listing is inactive/rented
- Agent manually pauses
- Gmail thread shows newer inbound client response

## Safety guardrails

- No automatic sends in Phase 2.
- No automatic sends in Phase 3.
- AI output is advisory only and requires human review.
- OAuth tokens are encrypted at rest and never shown in UI.

## Environment variables

Copy `.env.example` to `.env` and set:

- `DATABASE_URL`
- `NEXTAUTH_URL` (or `APP_URL`)
- `APP_URL` (optional but recommended)
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GMAIL_TOKEN_ENCRYPTION_KEY`
- Optional AI vars: `AI_PROVIDER`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`

## Local setup

1. `npm install`
2. `cp .env.example .env`
3. `npm run db:generate`
4. `npm run dev`

## Google Cloud Console setup (exact steps)

1. Create/select a Google Cloud project.
2. Enable **Gmail API**.
3. Configure OAuth consent screen for internal app usage.
4. Create OAuth client credentials (**Web application**).
5. Add this exact authorized redirect URI:
   - `http://localhost:3000/api/gmail/callback`
6. Set these env vars in `.env`:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback`
7. Set `GMAIL_TOKEN_ENCRYPTION_KEY` to a strong secret.
8. Start app, login as admin, open `/gmail-import`, click **Connect Gmail (Admin)**.

### Required OAuth scopes

- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.compose`
- `openid`
- `email`

Phase 2 intentionally does **not** request `gmail.send`.

## Mock mode (no Google required)

If Google OAuth env vars are missing, app auto-falls back to mock mode.

Mock mode includes sample inquiries from:

- StreetEasy
- Zillow
- RealtyMX
- Company website
- Direct client email

Test mock mode end-to-end:

1. Unset Google env vars.
2. Open `/gmail-import` and confirm **Mock Gmail** label.
3. Import one mock inquiry.
4. Re-import same message and confirm duplicate is blocked.
5. Open lead and create draft (stored as mock draft).
6. Open `/admin/gmail-debug` and run **Run Mock Import Test**.

## Real Gmail test flow

1. Configure all required env vars.
2. Connect Gmail from `/gmail-import` (admin account).
3. Confirm status on `/admin/gmail-debug`:
   - Connected email
   - Access/refresh token existence
   - Token refresh status
   - Granted scopes
   - Redirect URI
4. Run **List Recent Messages** and **Read First Message**.
5. Import one message from `/gmail-import`.
6. Re-import same message and confirm duplicate prevention.
7. Create draft from lead details page and confirm lead status changes to `DRAFT_CREATED`.

## Debugging common Gmail failures

Use `/admin/gmail-debug` for diagnostics and recent error context.

- `redirect_uri_mismatch`: Google Console redirect URI does not match `GOOGLE_REDIRECT_URI`
- `invalid_client`: wrong `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `access_denied`: user denied OAuth consent
- expired/revoked token: reconnect Gmail
- insufficient scopes: reconnect and grant required scopes
- Gmail API disabled: enable Gmail API in project
- no refresh token: reconnect with consent flow
- failed message fetch/draft creation: check debug panel + scopes
- duplicate import: message already linked to existing lead

## Developer checks

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

## Phase 3 testing focus

Run targeted checks for:

- Follow-up due-date calculation and stage progression
- Pause condition logic
- Template variable replacement for follow-up/showing drafts
- Showing status transition validation
- Activity-log emitting actions
- Mock Gmail follow-up draft behavior
- AI next-action advisory output format

## Current limitations

- No automatic email sending (draft-only by design)
- No final applicant approval/rejection automation
- Calendar integration is placeholder only (mock provider)
- No full application packet orchestration yet

## Recommended Phase 4 roadmap

- Real calendar provider integration (Google/Microsoft)
- Reminder and SLA notifications for overdue leads
- Inbox-to-pipeline sync enhancements across all thread updates
- Agent workload balancing and smart assignment
- Expanded reporting for follow-up and showing conversion funnels
