# Retro Hoops Prototype

Mobile-first college basketball prototype inspired by the loop and accessibility of Retro Bowl, with simplified arcade gameplay depth.

## What this prototype includes

- Main menu
- Team select + custom team creation
- Playable game vertical slice:
  - movement / dribbling
  - passing
  - shooting with timing meter + green window
  - layup / dunk / mid / three shot logic
  - stamina and fatigue impact
  - basic defense AI with steals and contests
  - rebounds, turnovers, fast-break stat tracking
- Postgame results screen
- Dynasty hub starter framework:
  - season record / poll / prestige / chemistry
  - lightweight schedule and weekly progression
  - recruit board and recruiting points spend loop
  - tournament progression stub notifications

## Run locally

This project is static HTML/CSS/JS (no package manager/build step).

```bash
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000`

Do not use `file://` because browser security can block asset/data loading patterns.

## Controls

- Left side drag: movement joystick
- `PASS`: pass to best nearby teammate
- Hold + release `SHOOT`: timing-based shot
- Hold `SPRINT`: burst movement, drains stamina
- Hold `DEF`: attempt defensive pressure/steal actions
- `P&R`: pick-and-roll trigger placeholder (stubbed behavior)
- `SW`: switch controlled defender while on defense

## Architecture overview

- `src/core`: app/game constants, shared state, math helpers
- `src/data`: teams, rosters, recruit generation data
- `src/game`: controls, ratings, simulation runtime, game session wiring
- `src/franchise`: schedule + season progression utilities
- `src/ui`: screen renderers and app controller

See `ROADMAP.md` for next implementation phases.
