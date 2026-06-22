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
npm test           # vitest — 89 tests, the correctness bar
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
   tears + buffs with **additive-within-group, multiplicative-across-groups**
   stacking. Flat attribute bonuses (e.g. +5 STR heirlooms) feed into scaling
   before the calc (clamped to 99); % effects apply per damage type after.
   `getModifiedWeaponAttack` is a drop-in for `getWeaponAttack` (no modifiers ⇒
   identical). Wired through `search` and `optimize` (DP stays exact — proven by
   a modifier-aware brute-force test). Curated 16-modifier dataset in
   `modifiers-data.ts` (attributed; deliberately small/extensible). UI has a
   "Gear & buffs" picker feeding both modes. Spell-scaling buffs deferred.
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
  `getModifiedWeaponAttack`), `modifiers-data.ts` (curated dataset + lookups),
  `index.ts` barrel. Stacking model is **additive within a `group`,
  multiplicative across groups**; each modifier's `group` is just data, so
  refining stacking accuracy later = editing data, not logic.
- The dataset is a confident **starter set (16 entries)**, not the full
  catalogue. Skill-only / conditional multipliers (e.g. Shard of Alexander) are
  intentionally excluded so AR stays honest; conditional ones that ARE included
  carry a `condition`/`drawback` note shown in the UI. Talisman/physick effect
  values are still NOT in the vendored regulation JSON — they're hand-transcribed
  here. Expanding the catalogue is the obvious next data task.
- Known v1 simplifications to revisit: flat stat bonuses are clamped to 99 (the
  curves are only evaluated to 148 = two-handed 99); spell-scaling buffs are not
  applied (only `attackPower`); the optimizer computes requirement minimums on
  raw requirements (a flat-stat bonus is never assumed to cover a requirement —
  conservative). Same-category buffs that *overwrite* in game (FGMS vs Howl of
  Shabriri) aren't both in the set, since "additive within group" can't express
  "take the higher".
