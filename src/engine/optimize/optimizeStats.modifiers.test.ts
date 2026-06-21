import { describe, it, expect } from "vitest";
import { allAttributes, AttackPowerType, type Attribute } from "../data/schema.ts";
import { findWeapon } from "../calc/weapons.ts";
import type { Attributes, CalcWeapon } from "../calc/types.ts";
import { scoreResult, type SearchObjective } from "../search/objectives.ts";
import { getModifiedWeaponAttack, type Modifier } from "../modifiers/applyModifiers.ts";
import { optimizeWeaponStats, type StatBudget } from "./optimizeStats.ts";

/**
 * The stat optimizer's exactness rests on the objective being additively
 * separable across attributes. Flat attribute bonuses (a constant shift) and
 * per-type % multipliers (a constant positive scalar) both preserve that, so the
 * DP must still find the true optimum *with modifiers active*. This brute force
 * applies the same modifiers and proves it.
 */
function bruteForceWithModifiers(
  weapon: CalcWeapon,
  objective: SearchObjective,
  budget: StatBudget,
  modifiers: readonly Modifier[],
): number {
  const level = weapon.maxUpgradeLevel;
  const mins: Attributes = { str: 1, dex: 1, int: 1, fai: 1, arc: 1 };
  for (const a of allAttributes) {
    mins[a] = Math.max(1, budget.minimums?.[a] ?? 1);
    const req = weapon.requirements[a];
    if (req) mins[a] = Math.max(mins[a], req);
  }
  const minSum = allAttributes.reduce((s, a) => s + mins[a], 0);
  const score = (attrs: Attributes) =>
    scoreResult(
      getModifiedWeaponAttack({ weapon, attributes: attrs, upgradeLevel: level, modifiers }),
      objective,
    );

  const relevant: Attribute[] = [];
  for (const a of allAttributes) {
    if (mins[a] >= 99) continue;
    if (score({ ...mins, [a]: 99 }) - score(mins) > 1e-9) relevant.push(a);
  }

  const extra = Math.max(0, budget.total - minSum);
  let best = score(mins);
  const rec = (idx: number, remaining: number, current: Attributes) => {
    if (idx === relevant.length) {
      best = Math.max(best, score(current));
      return;
    }
    const a = relevant[idx]!;
    const cap = Math.min(remaining, 99 - mins[a]);
    for (let add = 0; add <= cap; add++) {
      current[a] = mins[a] + add;
      rec(idx + 1, remaining - add, current);
    }
    current[a] = mins[a];
  };
  rec(0, extra, { ...mins });
  return best;
}

describe("optimizeWeaponStats with modifiers — still exact vs brute force", () => {
  const buff: Modifier = {
    id: "t-buff",
    name: "t-buff",
    kind: "buff",
    multipliers: [{ group: "g", amount: 0.15 }],
    source: "test",
  };
  const heirloom: Modifier = {
    id: "t-str",
    name: "t-str",
    kind: "talisman",
    attributeBonuses: { str: 5 },
    source: "test",
  };

  const cases: { name: string; objective: SearchObjective; budget: StatBudget; modifiers: Modifier[] }[] = [
    { name: "Heavy Longsword", objective: { kind: "totalAr" }, budget: { total: 90 }, modifiers: [buff] },
    { name: "Heavy Longsword", objective: { kind: "totalAr" }, budget: { total: 90 }, modifiers: [heirloom] },
    { name: "Quality Longsword", objective: { kind: "totalAr" }, budget: { total: 100 }, modifiers: [buff, heirloom] },
    {
      name: "Longsword",
      objective: { kind: "damageType", type: AttackPowerType.PHYSICAL },
      budget: { total: 80 },
      modifiers: [buff, heirloom],
    },
  ];

  for (const c of cases) {
    it(`${c.name} / ${c.objective.kind} / budget ${c.budget.total}`, () => {
      const weapon = findWeapon(c.name)!;
      const dp = optimizeWeaponStats({
        weapon,
        objective: c.objective,
        budget: c.budget,
        modifiers: c.modifiers,
      });
      const brute = bruteForceWithModifiers(weapon, c.objective, c.budget, c.modifiers);
      expect(dp.score).toBeCloseTo(brute, 4);
    });
  }

  it("a flat-STR heirloom lets the optimizer reach a higher score for the same budget", () => {
    const weapon = findWeapon("Heavy Longsword")!;
    const objective: SearchObjective = { kind: "totalAr" };
    const budget: StatBudget = { total: 90 };
    const without = optimizeWeaponStats({ weapon, objective, budget });
    const withHeirloom = optimizeWeaponStats({ weapon, objective, budget, modifiers: [heirloom] });
    expect(withHeirloom.score).toBeGreaterThan(without.score);
  });
});
