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

## Content editing

- Navigation + footer links: `src/data/navigation.js`
- Photography entries: `src/data/photography.js`
- Project entries: `src/data/projects.js`
- Moodboard entries: `src/data/moodboard.js`
- Homepage wordmark text: `src/app/page.js`
- Contact links + email: `src/app/contact/page.js`

## Replace placeholder images

All placeholders live in:

- `public/images/photography/`
- `public/images/projects/`
- `public/images/moodboard/`

Swap the image files and/or update paths in data files to use your own photography and project assets.
