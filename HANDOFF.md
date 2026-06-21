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
npm test           # vitest — 44 tests, the correctness bar
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
5. ⏳ **Modifiers** — talismans + Wondrous Physick tears + buffs/greases with
   correct additive-vs-multiplicative stacking. **NEXT PHASE.**
6. ⏳ **Inventory + UX polish** — owned-items multi-select/search, presets,
   ranked trade-offs, mobile polish. (UI exists but is basic.)
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
```

Key idea behind the optimizer: for a fixed weapon at requirements-met stats,
`score = const + Σᵢ gᵢ(attrᵢ)` (separable), so the spread search is an exact
resource-allocation DP, not the ~185-billion brute force the brief warns about.

## Resuming next time — suggested first message

> "Resume EldenAR on branch claude/coding-session-werkha. Read HANDOFF.md, run
> `npm test` to confirm green, then start Phase 5 (talisman/physick/buff
> modifiers with correct stacking) as pure engine modules under
> `src/engine/modifiers/` with tests, following the existing patterns."

## Phase 5 design notes (for the next session)

- Model modifiers as ordered operations on an AR result. Most ER offensive
  buffs are **additive multipliers within a group, multiplicative across
  groups** (e.g. multiple flat attack-up talismans/physick/incantation buffs add
  their percentages together, then that group multiplies the base). Verify the
  exact stacking groups against community sources before locking — this is where
  calculators get it wrong, so write tests per stacking rule.
- Sources to pull effect values from (don't hardcode from memory): the
  regulation `SpEffectParam` / the awesome-elden-ring index. The vendored JSON
  has `statusSpEffectParams` but talisman/physick effect values are NOT in it yet
  — a small additional data file will likely be needed; flag and source it.
- Keep modifiers pure and toggleable; apply on top of `getWeaponAttack` output
  and re-rank. Expose which buffs stack and which conflict.
