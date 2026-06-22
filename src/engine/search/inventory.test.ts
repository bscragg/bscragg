import { describe, it, expect } from "vitest";
import { findWeapon, getCalcWeapons, listBaseWeapons, resolveUpgradeLevel } from "../calc/weapons.ts";
import type { Attributes } from "../calc/types.ts";
import { rankWeapons } from "./search.ts";
import { optimizeAcrossWeapons } from "../optimize/optimizeStats.ts";

const attrs = (str: number, dex: number, int = 10, fai = 10, arc = 10): Attributes => ({
  str,
  dex,
  int,
  fai,
  arc,
});

describe("listBaseWeapons", () => {
  const bases = listBaseWeapons();

  it("collapses affinity variants into one entry per base weapon", () => {
    const variantNames = new Set(getCalcWeapons().map((w) => w.weaponName));
    expect(bases.length).toBe(variantNames.size);
    expect(bases.length).toBeLessThan(getCalcWeapons().length); // affinities collapsed
  });

  it("is sorted by name and has no duplicates", () => {
    const names = bases.map((b) => b.weaponName);
    expect(new Set(names).size).toBe(names.length);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
  });

  it("counts affinities — an infusable weapon has many, a somber/unique one", () => {
    const longsword = bases.find((b) => b.weaponName === "Longsword");
    expect(longsword!.affinityCount).toBeGreaterThan(1);
    // affinityCount matches the number of variants with that base name.
    const variantCount = getCalcWeapons().filter((w) => w.weaponName === "Longsword").length;
    expect(longsword!.affinityCount).toBe(variantCount);
  });

  it("is memoized (returns the same array instance)", () => {
    expect(listBaseWeapons()).toBe(bases);
  });
});

describe("resolveUpgradeLevel — regular 0–25 scale with somber mapping", () => {
  const regular = findWeapon("Longsword")!; // Smithing Stone, max +25
  const somber = findWeapon("Rivers of Blood")!; // Somber, max +10

  it("regular weapons use the level directly", () => {
    expect(regular.maxUpgradeLevel).toBe(25);
    expect(resolveUpgradeLevel(regular, 18)).toBe(18);
    expect(resolveUpgradeLevel(regular, 25)).toBe(25);
  });

  it("somber weapons are mapped proportionally (not over-levelled)", () => {
    expect(somber.maxUpgradeLevel).toBe(10);
    expect(resolveUpgradeLevel(somber, 18)).toBe(7); // round(18/25 * 10)
    expect(resolveUpgradeLevel(somber, 25)).toBe(10); // a "+25 request" = somber max
  });

  it('"max" uses each weapon\'s own cap', () => {
    expect(resolveUpgradeLevel(regular, "max")).toBe(25);
    expect(resolveUpgradeLevel(somber, "max")).toBe(10);
  });

  it("clamps into range", () => {
    expect(resolveUpgradeLevel(regular, 0)).toBe(0);
    expect(resolveUpgradeLevel(regular, 99)).toBe(25);
  });
});

describe("ownedWeaponBaseNames filter", () => {
  it("restricts ranking to owned base weapons (all affinities included)", () => {
    const owned = ["Longsword", "Greatsword"];
    const ranked = rankWeapons({
      attributes: attrs(60, 60, 40, 40, 40),
      objective: { kind: "totalAr" },
      filter: { ownedWeaponBaseNames: owned },
      limit: 100,
    });
    expect(ranked.length).toBeGreaterThan(0);
    for (const r of ranked) expect(owned).toContain(r.weaponName);
    // Multiple affinities of an owned weapon are present (infusion).
    const longswordAffinities = new Set(
      ranked.filter((r) => r.weaponName === "Longsword").map((r) => r.affinityName),
    );
    expect(longswordAffinities.size).toBeGreaterThan(1);
  });

  it("an empty list means no filtering (consider everything)", () => {
    const base = rankWeapons({
      attributes: attrs(60, 60),
      objective: { kind: "totalAr" },
      limit: 50,
    });
    const withEmpty = rankWeapons({
      attributes: attrs(60, 60),
      objective: { kind: "totalAr" },
      filter: { ownedWeaponBaseNames: [] },
      limit: 50,
    });
    expect(withEmpty.map((r) => r.name)).toEqual(base.map((r) => r.name));
  });

  it("composes with optimizeAcrossWeapons", () => {
    const owned = ["Greatsword"];
    const result = optimizeAcrossWeapons({
      objective: { kind: "totalAr" },
      budget: { total: 120 },
      filter: { ownedWeaponBaseNames: owned },
      limit: 100,
    });
    expect(result.length).toBeGreaterThan(0);
    for (const r of result) expect(r.weaponName).toBe("Greatsword");
  });
});
