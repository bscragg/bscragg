# Session on-ramp — EldenAR

Quick-start context so a new session (or a returning one) can resume immediately.

## What this is

A static web app that maximizes Elden Ring **Attack Rating (AR)** for a build.
TypeScript + React + Vite SPA. The calculation engine is pure and UI-free under
`src/engine/`. **v1 optimizes AR + status buildup, not true DPS** (no motion
values or target defenses in the data).

- **Branch:** `claude/coding-session-werkha` (develop + push here; do NOT push
  elsewhere; do NOT open a PR unless asked).
- **Live demo:** https://bscragg.github.io/bscragg/ (auto-deploys on push via
  `.github/workflows/deploy.yml`; GitHub Pages source must stay "GitHub Actions").
- **Data:** vendored `src/engine/data/regulation-vanilla-v1.14.json`
  (3,216 weapon/affinity variants), MIT, from `ThomasJClark/elden-ring-weapon-calculator`.
  Pinned in `src/engine/data/patch.ts`. Vanilla only (no balance mods). See
  `ATTRIBUTION.md`.

## Commands

```bash
npm install
npm test           # vitest — 115 tests, the correctness bar
npm run typecheck
npm run build      # static build -> dist/
npm run dev        # local dev server
```

## Decisions already locked

TypeScript + React/Vite · static hosting (GitHub Pages) · vanilla patch 1.14
(post-SOTE) · AR-focused v1, true DPS deferred · MIT data reused with attribution.

## Phase status

1. ✅ **Data layer** — load + validate dataset; typed schema; pinned patch.
2. ✅ **AR engine** (`src/engine/calc/`) — ported from the MIT reference;
   verified against 8 golden AR values + full-dataset sweep.
3. ✅ **Weapon search** (`src/engine/search/`) — playstyle presets + ranking by
   objective (total AR / damage type / status / spell scaling) with owned / DLC /
   requirement / affinity / weapon-type filters.
4. ✅ **Stat optimizer** (`src/engine/optimize/`) — exact per-weapon DP
   (objective is additively separable across attributes), proven against brute
   force. `optimizeWeaponStats` (one weapon) and `optimizeAcrossWeapons` (ranked).
   UI has a "Rank" mode and an "Optimize" mode.
5. ✅ **Modifiers** (`src/engine/modifiers/`) — talismans + Wondrous Physick
   tears + buffs + greases + weapon-buff spells + attack-up armor. Combine as
   **`AR(t) = (base(t) + flat(t)) × mult(t)`**: flat attribute bonuses (+5
   heirlooms, +10 stat-knot tears) feed scaling before the calc (clamped to 99);
   greases add **fixed flat damage** + weapon-buff spells add **catalyst-scaling
   flat damage** after the calc; % buffs apply last,
   **strongest-within-group / multiplicative-across-groups**. Weapon-buff spells
   carry `scalingDamage` (descriptive); `resolveModifiers(ids, spellBuff)` folds
   it into concrete `flatDamage` so the **pure engine only reads `flatDamage`**
   (no spellBuff threading through search/optimize). `getModifiedWeaponAttack` is
   a drop-in for `getWeaponAttack`. DP stays exact (flat adds are per-type
   constants). **55-entry sourced dataset**. UI "Gear & buffs" picker feeds both
   modes; a Spell Buff input drives the scaling spells. Slot-conflicting items
   are single-select via `Modifier.exclusiveGroup` (UI-only) — greases +
   weapon-buff spells share "armament"; attack-up armor helms (Rakshasa, White
   Mask, Mushroom Crown, Black Dumpling) share "armor-helm".
   Out of scope: on-hit ramps; charged/skill/move-specific talismans & armor
   (jump/dance/post-roll); spell-only armor; spell-scaling buffs; Black Flame
   Blade's %-HP DoT.
6. ✅ **Inventory + UX** — owned-items inventory (searchable multi-select by
   base weapon via `listBaseWeapons()` + `RankFilter.ownedWeaponBaseNames`;
   owning an infusable base unlocks all its affinities, somber/unique = 1
   variant); **upgrade-level selector** (regular +0–25 scale via
   `resolveUpgradeLevel(weapon, upgrade)`; somber weapons mapped proportionally;
   per-weapon level shown as `+N` in the tables); shareable + persisted build
   state (`src/ui/buildState.ts` → URL hash + localStorage, "Copy share link" +
   "Reset"); responsive/mobile layout; **trade-off insights** — score Δ from #1
   shown inline (`DeltaTag`), AR-per-point column in optimize, and a "best
   affinity per weapon" rollup (`RankOptions.bestPerWeapon` /
   `OptimizeAcrossOptions.bestPerWeapon` → `dedupeByWeapon` before the limit).
   Pickers use internal open-state so they don't collapse on re-render.
7. ⏳ **(Stretch) True DPS** — motion values + target defense. Data not present;
   would need a new source.

## How the engine fits together

```
data/loadData ──> calc/preprocess (decode) ──> calc/getWeaponAttack (AR)
                                   │
              search/objectives ◄──┤ (scoreResult)
              search/styles        │
              search/search (rank) ┘
              optimize/optimizeStats (DP over separable per-attr gains)
              modifiers/applyModifiers (getModifiedWeaponAttack wraps the calc)

ui/App.tsx ──> ui/buildState.ts (encode/decode build <-> URL hash + localStorage)
```

Key idea behind the optimizer: for a fixed weapon at requirements-met stats,
`score = const + Σᵢ gᵢ(attrᵢ)` (separable), so the spread search is an exact
resource-allocation DP, not the ~185-billion brute force the brief warns about.

## Resuming next time — suggested first message

> "Resume EldenAR on branch claude/coding-session-werkha. Read HANDOFF.md, run
> `npm test` to confirm green (112 tests). Phases 1–6 are fully done. Options:
> derive the weapon-buff Spell Buff from a chosen catalyst + stats (instead of a
> manual number); add a saved-builds list (named presets beyond the single URL
> state); or scope Phase 7 (true DPS — needs a new data source for motion values
> & target defense)."

## Phase 5 notes (done — reference for Phase 6 and beyond)

- Engine: `src/engine/modifiers/` — `applyModifiers.ts` (pure stacking math +
  `getModifiedWeaponAttack`), `modifiers-data.ts` (sourced dataset + lookups),
  `index.ts` barrel. Stacking: **strongest-applies within a `group`,
  multiplicative across groups** (`computeTypeMultipliers` takes the max amount
  per group, then multiplies group factors). Mutually-exclusive in-game pairs
  share a group (the two Golden Vows; FGMS / Howl of Shabriri); everything else
  gets its own group. Each modifier's `group` is just data.
- The dataset is **55 entries** (incl. 13 greases + 5 weapon-buff spells + 5
  attack-up armor), cross-checked against Fextralife (every entry has a
  `source`). Values are hand-transcribed (these effects are NOT in the
  regulation JSON).
- Known v1 simplifications to revisit: flat stat bonuses are clamped to 99 (the
  curves are only evaluated to 148 = two-handed 99); spell-scaling (catalyst)
  buffs use a single user-supplied Spell Buff number rather than deriving it from
  a chosen catalyst + stats; the optimizer computes requirement minimums on raw
  requirements (conservative). Still out: on-hit ramps, charged/skill/
  move-specific talismans, Black Flame Blade's %-HP DoT. The calculator doesn't
  enforce that greases/weapon-buff spells need a physical-affinity weapon
  (documented in `modifiers-data.ts`).
