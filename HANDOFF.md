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
npm test           # vitest — 102 tests, the correctness bar
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
   tears + buffs + greases. Three effect kinds combine as
   **`AR(t) = (base(t) + flat(t)) × mult(t)`**: flat attribute bonuses (e.g. +5
   STR heirlooms, +10 stat-knot tears) feed scaling before the calc (clamped to
   99); greases add **fixed flat damage** after the calc (`applyFlatDamage`); %
   buffs apply last, **strongest-within-group / multiplicative-across-groups**
   (ER mutual-exclusivity). `getModifiedWeaponAttack` is a drop-in for
   `getWeaponAttack` (no modifiers ⇒ identical). Wired through `search` and
   `optimize` (DP stays exact — flat adds are per-type constants). **45-entry
   sourced dataset** (`modifiers-data.ts`). UI "Gear & buffs" picker feeds both
   modes; greases are single-select (one Armament buff at a time).
   Out of scope: **weapon-buff spells** (Scholar's Armament, Bloodflame Blade, …)
   — elemental add scales with the catalyst, not a fixed constant; on-hit ramps;
   charged/skill/move-specific talismans; spell-scaling buffs.
6. ✅ **Inventory + UX** — owned-items inventory (searchable multi-select by
   base weapon via `listBaseWeapons()` + `RankFilter.ownedWeaponBaseNames`;
   owning an infusable base unlocks all its affinities, somber/unique = 1
   variant); shareable + persisted build state (`src/ui/buildState.ts` →
   URL hash + localStorage, "Copy share link" + "Reset"); responsive/mobile
   layout (`@media (max-width: 640px)`). Pickers use internal open-state so
   they don't collapse on re-render. **Still ⏳ within the phase:** ranked
   trade-off insights (score delta from #1, AR-per-point, best-affinity rollup).
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
> `npm test` to confirm green (89 tests). Phases 1–6 are done. Either finish the
> remaining Phase 6 trade-off insights (score delta from #1, AR-per-point,
> best-affinity-per-weapon rollup in the results tables), expand the modifier
> catalogue, or scope Phase 7 (true DPS — needs a new data source)."

## Phase 5 notes (done — reference for Phase 6 and beyond)

- Engine: `src/engine/modifiers/` — `applyModifiers.ts` (pure stacking math +
  `getModifiedWeaponAttack`), `modifiers-data.ts` (sourced dataset + lookups),
  `index.ts` barrel. Stacking: **strongest-applies within a `group`,
  multiplicative across groups** (`computeTypeMultipliers` takes the max amount
  per group, then multiplies group factors). Mutually-exclusive in-game pairs
  share a group (the two Golden Vows; FGMS / Howl of Shabriri); everything else
  gets its own group. Each modifier's `group` is just data.
- The dataset is **45 entries** (incl. 13 greases), cross-checked against
  Fextralife (every entry has a `source`), covering everything the model can
  represent. Values are hand-transcribed (talisman/physick/grease effects are
  NOT in the regulation JSON).
- Known v1 simplifications to revisit: flat stat bonuses are clamped to 99 (the
  curves are only evaluated to 148 = two-handed 99); spell-scaling buffs are not
  applied (only `attackPower`); the optimizer computes requirement minimums on
  raw requirements (conservative). **To go further** the remaining gap is
  weapon-buff *spells* (Scholar's Armament, Bloodflame Blade, Electrify Armament,
  Order's Blade): their elemental add scales with the catalyst's spell/incant
  scaling, so it'd need a scaling-aware effect (not a constant). The grease
  flat-add path (`applyFlatDamage`) is the natural place to extend. Also still
  out: on-hit ramps and charged/skill/move-specific talismans. The calculator
  doesn't enforce that greases need a physical-affinity weapon (documented in
  `modifiers-data.ts`).
