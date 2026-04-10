# archive_13 — personal portfolio

A minimal, editorial portfolio built with **Next.js** and **Tailwind CSS**, inspired by old-school web restraint and directory-style navigation.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build for production

```bash
npm run build
npm run start
```

## How to Edit This Site

The easiest editing path is now the local admin page.

1. Start the site:
   ```bash
   npm run dev
   ```
2. Open:
   - Portfolio: [http://localhost:3000](http://localhost:3000)
   - Admin editor: [http://localhost:3000/admin](http://localhost:3000/admin)
3. Edit fields in `/admin` and click **Save Changes**.
4. Refresh any portfolio page to see updates.

### What the admin editor updates

The `/admin` page edits a single source-of-truth file:

- `src/data/content-store.json`

It covers:
- site title and branding values
- logo path
- homepage/navigation links
- about text
- contact info
- social links
- photography items
- projects
- moodboard items

### Local save flow

- The admin form sends updates to `POST /api/admin/content` (also supports `PUT`).
- The API writes normalized JSON to `src/data/content-store.json`.
- This editor is intended for localhost development use.

### Optional manual editing

You can still edit content manually by opening:

- `src/data/content-store.json`

The JSON keys map 1:1 to admin form sections.

## Replace placeholder images

All placeholders live in:

- `public/images/photography/`
- `public/images/projects/`
- `public/images/moodboard/`

Swap the image files and/or update paths in data files to use your own photography and project assets.
