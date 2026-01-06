# Retro Hoops (GitHub Pages demo)

## Quick start (GitHub Pages)
1. Create a new GitHub repository.
2. Upload **all files in this folder** (make sure `index.html` is in the repo root).
3. Repo → Settings → Pages:
   - Source: Deploy from a branch
   - Branch: `main`
   - Folder: `/ (root)`
4. Open the published URL shown on the Pages screen.

## Local test
Run a local server (don't use file://):
```bash
python3 -m http.server 8000
```
Open:
- http://localhost:8000

## Basketball UI patches
`index.html` is updated to load:
- `hoops_patch.js` (text reskin)
- `hoops_hud_patch_v2.js` (replaces down/distance with shot clock text near the game clock)
