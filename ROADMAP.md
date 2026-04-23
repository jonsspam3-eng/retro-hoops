## Retro Hoops Prototype Roadmap

### Current vertical slice (implemented)
- Main menu with program flow entry.
- Team select with preset teams and custom team creation.
- Dynasty hub with season stats, schedule stub, recruiting board, and notifications.
- One full playable game loop with:
  - movement + dribbling
  - passing
  - skill-based shooting meter with green window
  - layup / dunk / mid-range / three shot classification
  - stamina/fatigue impact on speed and shot quality
  - defensive actions (steal/contest/block context via proximity and ratings)
  - basic CPU offense/defense positioning and decisions
  - rebounds, turnovers, shot clock, game clock, quarter transitions
- Postgame summary feeding season progression.

### Next milestone: deeper dynasty systems
- Expanded schedule generation (conference + non-conference + rivalry games).
- Conference standings from all simulated teams.
- Conference tournament bracket generation and simulation.
- National tournament seeding and bracket progression.
- Program upgrades (coach skills, facilities, scouting).

### Recruiting system expansion
- Weekly recruiting actions with school competition pressure.
- Recruit commitment probabilities based on prestige, fit, and needs.
- Position needs model with roster graduation logic.
- Early/late bloomer progression arcs and transfer portal support.

### Gameplay polish pass
- Improved player and ball animation states.
- Better contextual AI (help defense, closeouts, transition matchups).
- Additional move set (hesitation, spin, step-back, post touch).
- Sound effects + crowd mix and momentum reactions.
- Device-specific tuning profiles for low/mid/high mobile performance tiers.

### Architecture notes for scaling
- Keep `src/game/` focused on deterministic simulation and input translation.
- Keep `src/franchise/` data-driven and serializable for save/load support.
- Keep `src/ui/` render-only with minimal business logic.
- Introduce persistence layer next (`src/storage/`) for save slots and settings.
