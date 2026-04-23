# archive_13 — portfolio CMS

A minimal editorial portfolio built with **Next.js** and **Tailwind CSS**, now upgraded to a database-backed CMS with protected admin routes.

## Stack

- Next.js (App Router)
- Tailwind CSS
- Prisma ORM
- SQLite (dev)
- NextAuth (credentials auth)
- Cloudinary (media uploads)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template and fill required values:

```bash
cp .env.example .env
```

3. Generate Prisma client and run migrations:

```bash
npm run db:generate
npm run db:migrate -- --name init
```

4. Seed sample content and admin user:

```bash
npm run db:seed
```

5. Start dev server:

```bash
npm run dev
```

## Admin CMS

- Login: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- Dashboard: [http://localhost:3000/admin/dashboard](http://localhost:3000/admin/dashboard)

### Admin routes

- `/admin/login`
- `/admin/dashboard`
- `/admin/projects`
- `/admin/homepage`
- `/admin/about`
- `/admin/contact`
- `/admin/settings`
- `/admin/media`

### Default seeded admin credentials

These come from `.env`:

- email: `ADMIN_EMAIL`
- password: `ADMIN_PASSWORD`

## Public site content flow

Public pages read content from the database through `src/lib/cms.js`, including:

- Site settings / branding
- Homepage links and headers
- About and contact copy
- Project entries
- Photography and moodboard media collections

The visual style remains minimal/editorial and aligned with the current portfolio design language.

## Media management

The media library (`/admin/media`) supports:

- Uploading images to Cloudinary
- Saving metadata in database
- Managing collection/category/sort/featured/published fields

If Cloudinary env vars are missing, uploads are blocked until configured.

## Build for production

```bash
npm run build
npm run start
```
