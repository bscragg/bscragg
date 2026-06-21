# EldenAR — Elden Ring AR Build Optimizer

A web app that helps Elden Ring players maximize their **Attack Rating (AR)** for
a given build: which weapon + affinity + upgrade level to use, how to distribute
attribute points, and which talismans / physick tears / buffs to equip.

> **AR, not DPS.** v1 optimizes **Attack Rating** (the displayed weapon damage
> number) and **status buildup**, which are fully computable from extracted game
> data. *True DPS* — which additionally needs motion values, attack-speed
> weighting, and a specific target's defenses — is an explicitly deferred later
> phase. AR numbers are never labeled "DPS".

## Stack

- **TypeScript + React + Vite**, static SPA (deployable to any static host).
- The **calculation engine** (`src/engine/`) is pure, UI-free, and unit-tested
  so correctness can be verified independently of the UI.

## Layout

```
src/
  engine/        # pure, testable — no React imports
    data/        # vendored regulation JSON + loader/validator + pinned patch
    calc/        # AR engine (Phase 2)
    search/      # weapon/affinity ranking (Phase 3)
    optimize/    # stat-spread optimizer (Phase 4)
    modifiers/   # talisman/physick/buff stacking (Phase 5)
  ui/            # React SPA (Phases 1, 6)
```

## Develop

```bash
npm install
npm run dev        # local dev server
npm test           # run the engine test suite (vitest)
npm run typecheck  # tsc project check
npm run build      # production static build -> dist/
```

## Game data & licensing

Game data and damage-formula logic are reused from the MIT-licensed
[`ThomasJClark/elden-ring-weapon-calculator`](https://github.com/ThomasJClark/elden-ring-weapon-calculator),
pinned to **vanilla patch 1.14** (post Shadow of the Erdtree). See
[ATTRIBUTION.md](./ATTRIBUTION.md).

## Build phases

1. ✅ **Data layer** — load + validate the extracted dataset; document schema; pin patch.
2. ✅ **AR engine + tests** — verified against reference calculators.
3. ✅ **Weapon search** — playstyle presets + rank weapons/affinities by objective (total AR, damage type, status buildup, spell scaling), with owned-items / DLC / requirement filters. Includes a basic interactive UI.
4. ✅ **Stat optimizer** — exact per-weapon DP that finds the optimal attribute spread within a point budget (separable objective ⇒ resource-allocation DP, proven against brute force). UI "Optimize" mode included.
5. ✅ **Modifiers** — talismans + physick + buffs with correct stacking (flat attribute bonuses feed into scaling; % effects stack additively within a group, multiplicatively across groups). Wired into rank & optimize; selectable in the UI. Spell-scaling buffs deferred.
6. ⏳ **Inventory + UX** — owned-items filtering, ranked trade-offs, mobile UI.
7. ⏳ **(Stretch) True DPS** — motion values + target defense.
