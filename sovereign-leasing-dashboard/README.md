# Sovereign Leasing Command

Internal leasing operations dashboard for Sovereign Associates / Sovereign Realty NYC.

## Product scope (Phase 1 delivered)

- Manual inquiry capture and lead records
- Listing database management
- Editable email templates with merge variables
- Qualification scoring engine with explanation notes
- AI assistant for summary, missing info detection, and reply drafts
- Team management with role-aware authentication
- Lead detail workflow (notes, status, assignment, thread history)
- Reporting snapshot for inquiry and conversion metrics
- Audit logging hooks for key actions

## Tech stack

- Next.js 16 + TypeScript + Tailwind CSS
- Prisma + PostgreSQL schema (with in-memory fallback demo mode)
- NextAuth credentials authentication
- AI provider abstraction (mock default + optional OpenAI)

## Local setup

1. Install dependencies

```bash
npm install
```

2. Copy environment values

```bash
cp .env.example .env
```

3. Generate Prisma client

```bash
npm run db:generate
```

4. (Optional) Run migrations + seed against Postgres

```bash
npm run db:migrate
npm run db:seed
```

5. Start app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Demo credentials

- `admin@sovereignnyc.com` / `Sovereign123!`
- Quick demo sign-in button is available on the login page.

## Compliance notes

- AI output is recommendation-only and must not auto-approve/deny housing outcomes.
- Qualification criteria should remain limited to legitimate rental factors (income, occupancy, timeline, pets, documentation readiness).
- All sensitive actions should be captured in audit logs.

## Planned roadmap

- **Phase 2**: Gmail OAuth + thread sync/reply + follow-up scheduler + showing calendar integration
- **Phase 3**: advanced analytics, source performance trends, third-party inquiry imports
