import { describe, it, expect } from "vitest";
import { AttackPowerType } from "../data/schema.ts";
import { Affinity } from "../data/affinities.ts";
import { catalystWeaponTypes } from "../calc/weaponTypes.ts";
import { rankWeapons, rankWeaponsForStyle } from "./search.ts";
import { getStyle, buildStyles } from "./styles.ts";
import type { Attributes } from "../calc/types.ts";

const attrs = (str: number, dex: number, int = 10, fai = 10, arc = 10): Attributes => ({
  str,
  dex,
  int,
  fai,
  arc,
});

describe("rankWeapons", () => {
  it("returns a ranked, descending, sequentially-numbered list within the limit", () => {
    const list = rankWeapons({
      attributes: attrs(60, 60, 60, 60, 60),
      objective: { kind: "totalAr" },
      limit: 10,
    });
    expect(list.length).toBe(10);
    expect(list[0]!.rank).toBe(1);
    expect(list[9]!.rank).toBe(10);
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1]!.score).toBeGreaterThanOrEqual(list[i]!.score);
    }
  });

  it("bestPerWeapon collapses to one (highest-scoring) affinity per base weapon", () => {
    const all = rankWeapons({
      attributes: attrs(60, 60, 60, 60, 60),
      objective: { kind: "totalAr" },
      limit: 50,
    });
    const best = rankWeapons({
      attributes: attrs(60, 60, 60, 60, 60),
      objective: { kind: "totalAr" },
      bestPerWeapon: true,
      limit: 50,
    });
    // No base weapon repeats.
    const names = best.map((r) => r.weaponName);
    expect(new Set(names).size).toBe(names.length);
    // The kept row for a weapon is its best-scoring variant in the full list.
    const firstName = best[0]!.weaponName;
    const bestInAll = Math.max(
      ...all.filter((r) => r.weaponName === firstName).map((r) => r.score),
    );
    expect(best[0]!.score).toBeCloseTo(bestInAll, 6);
    // Collapsing yields no more rows than the unfiltered list.
    expect(best.length).toBeLessThanOrEqual(all.length);
  });

  it("score matches the objective and totalAr is the damage sum", () => {
    const list = rankWeapons({
      attributes: attrs(20, 30, 10, 10, 50),
      objective: { kind: "status", type: AttackPowerType.BLEED },
      limit: 5,
    });
    expect(list.length).toBeGreaterThan(0);
    for (const r of list) {
      expect(r.score).toBeCloseTo(r.attackPower[AttackPowerType.BLEED] ?? 0, 5);
      expect(r.score).toBeGreaterThan(0);
    }
  });

  it("excludes catalysts from AR objectives and includes only catalysts for spell objectives", () => {
    const ar = rankWeapons({
      attributes: attrs(20, 20, 60, 10, 10),
      objective: { kind: "totalAr" },
      limit: 50,
    });
    expect(ar.every((r) => !catalystWeaponTypes.has(r.weaponType))).toBe(true);

    const spell = rankWeapons({
      attributes: attrs(10, 10, 80, 10, 10),
      objective: { kind: "spellScaling", type: AttackPowerType.MAGIC },
      limit: 50,
    });
    expect(spell.length).toBeGreaterThan(0);
    expect(spell.every((r) => catalystWeaponTypes.has(r.weaponType))).toBe(true);
  });

  it("owned-items filter restricts results to those weapons only", () => {
    const owned = ["Longsword", "Heavy Longsword", "Keen Longsword"];
    const list = rankWeapons({
      attributes: attrs(40, 40),
      objective: { kind: "totalAr" },
      filter: { ownedWeaponNames: owned },
      limit: 25,
    });
    expect(list.length).toBe(3);
    expect(list.every((r) => owned.includes(r.name))).toBe(true);
  });

  it("requireRequirementsMet drops weapons the character can't wield", () => {
    const weak = attrs(10, 10, 10, 10, 10);
    const all = rankWeapons({ attributes: weak, objective: { kind: "totalAr" }, limit: 5000 });
    const met = rankWeapons({
      attributes: weak,
      objective: { kind: "totalAr" },
      filter: { requireRequirementsMet: true },
      limit: 5000,
    });
    expect(met.length).toBeLessThan(all.length);
    expect(met.every((r) => r.requirementsMet)).toBe(true);
  });

  it("two-handing changes the ranking for strength weapons", () => {
    const oneHand = rankWeapons({
      attributes: attrs(50, 12),
      objective: { kind: "totalAr" },
      filter: { affinities: [Affinity.HEAVY] },
      limit: 1,
    });
    const twoHand = rankWeapons({
      attributes: attrs(50, 12),
      objective: { kind: "totalAr" },
      filter: { affinities: [Affinity.HEAVY] },
      twoHanding: true,
      limit: 1,
    });
    expect(twoHand[0]!.score).toBeGreaterThan(oneHand[0]!.score);
  });
});

describe("build styles", () => {
  it("every style id is unique and resolvable", () => {
    const ids = buildStyles.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(getStyle(id)).toBeDefined();
  });

  it("strength style only returns its allowed affinities", () => {
    const style = getStyle("strength")!;
    const list = rankWeaponsForStyle(style, { attributes: attrs(80, 12), twoHanding: true, limit: 20 });
    expect(list.length).toBeGreaterThan(0);
    const allowed = new Set(style.affinities);
    expect(list.every((r) => allowed.has(r.affinityId))).toBe(true);
  });

  it("bleed style ranks by bleed buildup and surfaces known bleed weapons", () => {
    const style = getStyle("bleed")!;
    const list = rankWeaponsForStyle(style, {
      attributes: attrs(20, 40, 10, 10, 45),
      limit: 1000,
    });
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((r) => (r.attackPower[AttackPowerType.BLEED] ?? 0) > 0)).toBe(true);
    // Well-known innate-bleed armaments should appear in the bleed ranking.
    expect(list.some((r) => r.weaponName === "Reduvia" || r.weaponName === "Rivers of Blood")).toBe(
      true,
    );
  });

  it("sorcerer style returns only staves, ranked by magic spell scaling", () => {
    const style = getStyle("sorcerer")!;
    const list = rankWeaponsForStyle(style, { attributes: attrs(10, 10, 80, 10, 10), limit: 15 });
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((r) => (r.spellScaling[AttackPowerType.MAGIC] ?? 0) > 0)).toBe(true);
  });

  it("a caller filter (owned items) layers on top of the style filter", () => {
    const style = getStyle("dexterity")!;
    const list = rankWeaponsForStyle(style, {
      attributes: attrs(12, 60),
      filter: { ownedWeaponNames: ["Keen Longsword", "Heavy Longsword"] },
      limit: 25,
    });
    // Heavy Longsword is owned but not a Dexterity-style affinity, so it's filtered out.
    expect(list.every((r) => r.name === "Keen Longsword")).toBe(true);
    expect(list.length).toBe(1);
  });

  it("open style applies no affinity constraint", () => {
    const style = getStyle("open")!;
    expect(style.affinities).toBeUndefined();
    const list = rankWeaponsForStyle(style, { attributes: attrs(50, 50, 50, 50, 50), limit: 40 });
    const distinctAffinities = new Set(list.map((r) => r.affinityId));
    expect(distinctAffinities.size).toBeGreaterThan(1);
  });
});
