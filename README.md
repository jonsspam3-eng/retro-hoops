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

### Admin password protection (optional but recommended)

Set a password for `/admin` by running dev with:

```bash
ADMIN_PASSWORD=your-password npm run dev
```

When `ADMIN_PASSWORD` is set:
- `/admin` requires login
- `/api/admin/content` save/read actions require an authenticated admin session

Without `ADMIN_PASSWORD`, admin remains open for local use.

### What the admin editor updates

The `/admin` page edits a single source-of-truth file:

- `src/data/content-store.json`

It covers:
- site title and branding values
- logo path
- text alignment controls (site-wide + home page)
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

### New editor features

- **Reset section** buttons in each panel
- **Drag-and-drop photo sorting** in the photography section
  - drag a photo row and drop it where you want
  - order is saved in `photographyItems`
- **Live editor preview** in a right-side panel
- **Right/center/left text alignment** controls in site settings

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
