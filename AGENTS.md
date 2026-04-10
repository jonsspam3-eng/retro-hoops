# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Retro Hoops is a static HTML5 browser game (basketball reskin of Retro Bowl). It has **no build system, no package manager, no backend, and no automated tests or linter**. All game logic runs client-side via a GameMaker:HTML5 export.

### Running the dev server

Serve the repository root with any static HTTP server. The README recommends:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

**Do not use `file://` protocol** — the game loads `.txt` data files via `fetch`/XHR, which is blocked by CORS on `file://`.

### Critical asset directory: `html5game/`

The GameMaker engine sets its base path to `html5game/` and dynamically loads scripts and assets from that directory (e.g., `html5game/uph_poki.js`, `html5game/RetroBowl_texture_0.png`). The `index.html` also references `html5game/splash.png` and `html5game/RetroBowl.js`.

These files live at the repository root but must also be accessible under `html5game/`. A setup script creates symlinks from the root files into `html5game/` to satisfy these references. If the game shows a black screen or console errors about missing files, verify the `html5game/` symlinks exist.

### Canvas interaction in remote environments

The game is a canvas-based application with internal resolution 853×480. In remote browser environments (e.g., computerUse subagent), canvas coordinate scaling can cause click events to miss their targets. The game renders and initializes correctly — interaction difficulties in headless/remote setups are expected and not indicative of a code problem.
