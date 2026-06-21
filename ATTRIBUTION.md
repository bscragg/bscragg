# Attribution & Data Provenance

This project reuses community-extracted Elden Ring game data and damage-formula
logic. Sources, licenses, and how they are used are recorded here.

## Game data

- **File:** `src/engine/data/regulation-vanilla-v1.14.json`
- **Source:** [`ThomasJClark/elden-ring-weapon-calculator`](https://github.com/ThomasJClark/elden-ring-weapon-calculator)
  (`public/regulation-vanilla-v1.14.js`)
- **License:** MIT — Copyright (c) Tom Clark (`tom@tclark.io`), as declared in
  that project's `package.json`.
- **Provenance:** Extracted from the game's `regulation.bin`. Represents the
  **vanilla** game at **patch 1.14** (post Shadow of the Erdtree). Balance mods
  bundled by the upstream project (Convergence, Reforged, Clever's) are **not**
  used — v1 is vanilla only.
- **Usage:** Vendored verbatim as JSON. Pinned in `src/engine/data/patch.ts`.

## Damage-calculation logic

- The Phase 2 AR engine is **ported/adapted** from the same project's
  `src/calculator/*.ts` (MIT, same copyright as above): the calc-correct
  saturation curves, two-handing Strength bonus (`floor(str × 1.5)`), unmet-
  requirement penalty, and per-damage-type scaling.

## Cross-reference only (not data sources)

The following were consulted to cross-check formula correctness. No code or data
is copied from them, and the Fextralife wiki is **not** scraped:

- `hanslhansl/elden-ring-damage-optimizer` — optimizer behaviour & search-space
  performance discussion.
- `TomPoulton/elden-ring-damage-calculator`, `clicksilver/elden-ring-attack-rating-calculator`
  — TarnishedSpreadsheet-based formula cross-checks.
- `sovietspaceship/awesome-elden-ring` — index of status/talisman/physick data.
- Fextralife wiki — human-readable reference only.

## Trademark

Elden Ring is a trademark of FromSoftware / Bandai Namco. This is an unofficial,
non-commercial fan tool with no affiliation or endorsement.
