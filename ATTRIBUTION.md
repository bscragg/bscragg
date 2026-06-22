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

## Modifier data (talismans / physick / buffs)

- **File:** `src/engine/modifiers/modifiers-data.ts`
- **Provenance:** A hand-entered set of AR-relevant modifiers (flat attribute
  bonuses, fixed and catalyst-scaling flat damage adds, and percentage
  attack-power boosts on normal attacks) for vanilla patch 1.14, with values
  cross-checked against the community knowledge base (Fextralife wiki). Each
  entry carries a `source` field. The wiki is **not** scraped — values are
  transcribed by hand. It aims to cover every modifier the engine can represent
  faithfully.
- **Stacking / order of operations:** `src/engine/modifiers/applyModifiers.ts`
  computes `AR(t) = (base(t) + flat(t)) × mult(t)` per type. Flat attribute
  bonuses feed scaling first; greases add fixed flat damage; then % buffs apply
  as **strongest-applies within a stacking group, multiplicative across groups**
  — matching Elden Ring's buff rules, where same-category buffs (e.g. two body
  buffs, or Golden Vow incantation vs. its Ash of War) are mutually exclusive and
  overwrite rather than stack, while different categories multiply. Greases are
  the single "Armament" category (one active at a time).
- **Weapon-buff spells** (Scholar's Armament, Bloodflame Blade, Black Flame
  Blade, Electrify Armament, Order's Blade) are included via `scalingDamage`:
  their elemental add scales with the catalyst's spell/incant scaling, so the
  dataset stores the `factor` and the app multiplies it by a user-supplied
  Spell Buff. Fixed status riders (e.g. Bloodflame's +40 bleed) are stored as
  flat damage.
- **Armor** that raises general attack power on normal attacks (Rakshasa Set,
  White Mask, Mushroom Crown, Black Dumpling, Twinbird Kite Shield) is included
  as % multipliers. Slot-conflicting pieces share an `exclusiveGroup` so the UI
  keeps them single-select. Rakshasa's "+damage taken" and Mushroom Crown's
  alleged downside are community-confirmed non-effects and are not modelled.
- **Out of scope** (the model can't represent these faithfully): on-hit ramping
  effects (Winged Sword Insignia, Thorny/Spiked tears) and charged-/skill-/
  move-specific talismans (Shard of Alexander, Godfrey Icon, Claw/Axe/etc.);
  move-specific armor (Raptor's Black Feathers / Gravebird's = jump attacks,
  Leda's = post-roll, Dancer's = dance skills) and spell-only armor (Snow Witch
  Hat, Lusat's/Azur's/Crucible/Spellblade sets); Black Flame Blade's %-HP DoT.

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
