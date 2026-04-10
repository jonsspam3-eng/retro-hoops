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

Most edits happen in data files (no layout code needed).

1. **Branding (site name, logo, colors, default theme)**
   - Edit: `src/data/brand-config.js`
   - Change:
     - `siteName`
     - `logoPath`
     - `primaryColor`
     - `backgroundColor`
     - `textColor`
     - `defaultTheme` (`"dark"` or `"light"`)

2. **Main text + links (navigation, homepage links, about, contact, socials)**
   - Edit: `src/data/site-content.js`
   - Change:
     - navigation labels/URLs
     - homepage directory links
     - about page text
     - contact email/info
     - social links

3. **Portfolio content**
   - Photography items: `src/data/photography.js`
   - Project items: `src/data/projects.js`
   - Moodboard items: `src/data/moodboard.js`

4. **Replace images**
   - Put your image files in:
     - `public/images/logo/`
     - `public/images/photography/`
     - `public/images/projects/`
     - `public/images/moodboard/`
   - Update file paths in the data files above.

5. **Preview changes**
   ```bash
   npm run dev
   ```
   Then open [http://localhost:3000](http://localhost:3000).

## Replace placeholder images

All placeholders live in:

- `public/images/photography/`
- `public/images/projects/`
- `public/images/moodboard/`

Swap the image files and/or update paths in data files to use your own photography and project assets.
