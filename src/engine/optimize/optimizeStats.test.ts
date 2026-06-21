import { describe, it, expect } from "vitest";
import { allAttributes, AttackPowerType, type Attribute } from "../data/schema.ts";
import { getWeaponAttack } from "../calc/getWeaponAttack.ts";
import { findWeapon } from "../calc/weapons.ts";
import type { Attributes, CalcWeapon } from "../calc/types.ts";
import { scoreResult, type SearchObjective } from "../search/objectives.ts";
import { getStyle } from "../search/styles.ts";
import {
  optimizeWeaponStats,
  optimizeAcrossWeapons,
  type StatBudget,
} from "./optimizeStats.ts";

/**
 * Independent brute force: enumerate every allocation of the budget across the
 * weapon's score-affecting attributes and take the max. Used to prove the DP
 * finds the true optimum. Kept small (few relevant attrs, modest budgets).
 */
function bruteForceOptimize(
  weapon: CalcWeapon,
  objective: SearchObjective,
  budget: StatBudget,
  twoHanding: boolean,
): { score: number; attributes: Attributes } {
  const level = weapon.maxUpgradeLevel;
  const mins: Attributes = { str: 1, dex: 1, int: 1, fai: 1, arc: 1 };
  for (const a of allAttributes) mins[a] = Math.max(1, budget.minimums?.[a] ?? 1);
  for (const a of allAttributes) {
    const req = weapon.requirements[a];
    if (req) {
      const needed = a === "str" && twoHanding ? Math.ceil(req / 1.5) : req;
      mins[a] = Math.max(mins[a], needed);
    }
  }
  const minSum = allAttributes.reduce((s, a) => s + mins[a], 0);
  const score = (attrs: Attributes) =>
    scoreResult(getWeaponAttack({ weapon, attributes: attrs, twoHanding, upgradeLevel: level }), objective);

  // Relevant attributes: those that change the score.
  const relevant: Attribute[] = [];
  for (const a of allAttributes) {
    if (mins[a] >= 99) continue;
    const probe = { ...mins, [a]: Math.min(99, mins[a] + (99 - mins[a])) };
    if (score(probe) - score(mins) > 1e-9) relevant.push(a);
  }

  const extra = Math.max(0, budget.total - minSum);
  let best = { score: score(mins), attributes: { ...mins } };

  const rec = (idx: number, remaining: number, current: Attributes) => {
    if (idx === relevant.length) {
      const s = score(current);
      if (s > best.score + 1e-9) best = { score: s, attributes: { ...current } };
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

const totalOf = (a: Attributes) => allAttributes.reduce((s, k) => s + a[k], 0);

describe("optimizeWeaponStats — matches brute force (DP is exact)", () => {
  const cases: {
    name: string;
    objective: SearchObjective;
    budget: StatBudget;
    twoHanding?: boolean;
  }[] = [
    { name: "Heavy Longsword", objective: { kind: "totalAr" }, budget: { total: 80 } },
    { name: "Heavy Longsword", objective: { kind: "totalAr" }, budget: { total: 120 }, twoHanding: true },
    { name: "Quality Longsword", objective: { kind: "totalAr" }, budget: { total: 100 } },
    { name: "Longsword", objective: { kind: "totalAr" }, budget: { total: 90 } },
    {
      name: "Rivers of Blood",
      objective: { kind: "totalAr" },
      budget: { total: 140 },
    },
    {
      name: "Rivers of Blood",
      objective: { kind: "status", type: AttackPowerType.BLEED },
      budget: { total: 120 },
    },
    {
      name: "Lusat's Glintstone Staff",
      objective: { kind: "spellScaling", type: AttackPowerType.MAGIC },
      budget: { total: 110 },
    },
  ];

  for (const c of cases) {
    it(`${c.name} / ${c.objective.kind} / budget ${c.budget.total}${c.twoHanding ? " (2H)" : ""}`, () => {
      const weapon = findWeapon(c.name);
      expect(weapon, c.name).toBeDefined();
      const dp = optimizeWeaponStats({
        weapon: weapon!,
        objective: c.objective,
        budget: c.budget,
        twoHanding: c.twoHanding,
      });
      const brute = bruteForceOptimize(weapon!, c.objective, c.budget, c.twoHanding ?? false);
      expect(dp.score).toBeCloseTo(brute.score, 4);
    });
  }
});

describe("optimizeWeaponStats — constraints", () => {
  it("never exceeds the point budget", () => {
    const w = findWeapon("Heavy Longsword")!;
    const r = optimizeWeaponStats({ weapon: w, objective: { kind: "totalAr" }, budget: { total: 75 } });
    expect(totalOf(r.attributes)).toBeLessThanOrEqual(75);
    expect(r.pointsUsed + r.pointsLeftover).toBeLessThanOrEqual(75);
  });

  it("respects per-attribute minimums (kept Faith for a buff)", () => {
    const w = findWeapon("Heavy Longsword")!;
    const r = optimizeWeaponStats({
      weapon: w,
      objective: { kind: "totalAr" },
      budget: { total: 120, minimums: { fai: 25 } },
    });
    expect(r.attributes.fai).toBeGreaterThanOrEqual(25);
    expect(totalOf(r.attributes)).toBeLessThanOrEqual(120);
  });

  it("meets weapon requirements by default and flags infeasible budgets", () => {
    const w = findWeapon("Longsword")!; // requires 10 str / 10 dex
    const ok = optimizeWeaponStats({ weapon: w, objective: { kind: "totalAr" }, budget: { total: 60 } });
    expect(ok.feasible).toBe(true);
    expect(ok.requirementsMet).toBe(true);
    expect(ok.attributes.str).toBeGreaterThanOrEqual(10);
    expect(ok.attributes.dex).toBeGreaterThanOrEqual(10);

    // 5 attributes must each be >= 1, so total < 5 can't even cover minimums.
    const bad = optimizeWeaponStats({ weapon: w, objective: { kind: "totalAr" }, budget: { total: 4 } });
    expect(bad.feasible).toBe(false);
  });

  it("two-handing lowers the effective Strength requirement", () => {
    // A weapon with a high STR requirement becomes usable with less raw STR when 2H.
    const w = findWeapon("Heavy Longsword")!;
    const oneHand = optimizeWeaponStats({
      weapon: w,
      objective: { kind: "totalAr" },
      budget: { total: 200 },
    });
    const twoHand = optimizeWeaponStats({
      weapon: w,
      objective: { kind: "totalAr" },
      budget: { total: 200 },
      twoHanding: true,
    });
    // With a generous budget both meet requirements; two-handing should score higher
    // on a STR weapon thanks to the effective-STR bonus.
    expect(twoHand.score).toBeGreaterThan(oneHand.score);
  });

  it("more points never reduce the optimum (monotonic in budget)", () => {
    const w = findWeapon("Keen Longsword")!;
    const small = optimizeWeaponStats({ weapon: w, objective: { kind: "totalAr" }, budget: { total: 60 } });
    const big = optimizeWeaponStats({ weapon: w, objective: { kind: "totalAr" }, budget: { total: 140 } });
    expect(big.score).toBeGreaterThanOrEqual(small.score - 1e-9);
  });
});

describe("optimizeAcrossWeapons", () => {
  it("ranks owned weapons and reports an optimal spread per weapon", () => {
    const owned = ["Longsword", "Heavy Longsword", "Keen Longsword", "Quality Longsword"];
    const list = optimizeAcrossWeapons({
      objective: { kind: "totalAr" },
      budget: { total: 100 },
      filter: { ownedWeaponNames: owned },
      limit: 25,
    });
    expect(list.length).toBe(4);
    expect(list[0]!.rank).toBe(1);
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1]!.score).toBeGreaterThanOrEqual(list[i]!.score);
    }
    for (const r of list) {
      expect(totalOf(r.attributes)).toBeLessThanOrEqual(100);
      expect(r.requirementsMet).toBe(true);
    }
  });

  it("works with a build style and produces a sensible winner", () => {
    const style = getStyle("strength")!;
    const list = optimizeAcrossWeapons({
      objective: style.objective,
      budget: { total: 150 },
      twoHanding: true,
      filter: { affinities: style.affinities },
      limit: 5,
    });
    expect(list.length).toBeGreaterThan(0);
    // Strength optimum at a high budget should invest heavily in STR.
    expect(list[0]!.attributes.str).toBeGreaterThan(40);
  });
});
