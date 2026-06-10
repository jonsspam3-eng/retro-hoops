# SECURITY.md

## Security model summary

Sovereign Leasing Command is designed for internal leasing operations with strict human-review controls.

Core principles:

- Least-privilege role access.
- No automatic outbound email sending.
- Separation of app auth from Gmail inbox OAuth.
- Token encryption at rest.
- Auditable security and Gmail lifecycle actions.

## Authentication model

- NextAuth JWT sessions with secure cookies in production.
- Supported sign-in:
  - Credentials
  - Google app sign-in (optional/configured)
- Google app login is restricted to approved users:
  - Must map to an active internal user.
  - Optional domain/user allowlist checks.
- Account lockout controls:
  - Failed credential attempts increment counters.
  - Lockout duration controlled via env vars.

## MFA / 2FA model

Admin and Super Admin users require provider-level MFA policy in production.

Controls:

- `GOOGLE_AUTH_ASSUME_MFA=true` in production.
- `ALLOW_ADMIN_CREDENTIALS_FALLBACK=false` in production.
- Admin/Super Admin sign-in should occur through Google Workspace policies enforcing MFA.

## Role permissions

Primary roles:

- `SUPER_ADMIN`
- `ADMIN`
- `MANAGER`
- `AGENT`
- `MARKETING_ASSISTANT`
- `ASSISTANT`
- `READ_ONLY`

Examples:

- Gmail connect/disconnect/debug: Admin + Super Admin.
- Gmail import/draft creation: operations roles (non-read-only).
- Team management: Admin + Super Admin.
- Read-only users cannot mutate operational records.

## Gmail token security

- Tokens are encrypted at rest using `ENCRYPTION_KEY` (or `GMAIL_TOKEN_ENCRYPTION_KEY` fallback).
- UI/debug views never display token values.
- Disconnect removes stored Gmail connection token records.
- Scope set is minimal:
  - `gmail.readonly`
  - `gmail.compose`
  - `openid`
  - `userinfo.email`
- `gmail.send` is intentionally not requested.

## AI safety policy

- AI outputs are advisory only.
- Human reviewers must make final leasing decisions.
- No automated approval/denial decisions are performed by AI.
- No auto-send email behavior is allowed.

## Audit logging

The system records key events including:

- Login success/failure and lockout events.
- Gmail connect lifecycle events.
- Gmail token refresh success/failure.
- Gmail import actions and duplicate blocks.
- Gmail draft creation.
- Lead/listing/status modification actions.
- Debug action runs (admin-only).

## Production deployment security checklist

1. Enforce HTTPS + secure cookies.
2. Set strong secrets (`NEXTAUTH_SECRET`, `SESSION_SECRET`, `ENCRYPTION_KEY`).
3. Keep `ENABLE_DEBUG_TOOLS=false` unless actively debugging.
4. Configure Google OAuth clients with exact redirect URIs.
5. Restrict app login to approved users/domains.
6. Enforce provider MFA policy for admin roles.
7. Use production PostgreSQL and apply migrations.
8. Verify role-based access from server-side endpoints.
9. Confirm no `gmail.send` scope and no auto-send paths.
10. Review recent audit logs after each deployment.

## Incident response basics

If compromise is suspected:

1. Disable affected user(s) in app database.
2. Revoke Google OAuth grants for connected Gmail accounts.
3. Rotate `ENCRYPTION_KEY`, `NEXTAUTH_SECRET`, `SESSION_SECRET`.
4. Rotate Google OAuth client secrets if exposed.
5. Review audit logs for suspicious actions.
6. Reconnect Gmail inboxes with fresh consent after rotation.
