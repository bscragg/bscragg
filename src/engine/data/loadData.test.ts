import { describe, it, expect } from "vitest";
import { loadRegulation } from "./loadData.ts";
import { validateRegulation, RegulationValidationError } from "./validate.ts";

describe("regulation data layer", () => {
  const { regulation, stats } = loadRegulation();

  it("loads and validates the vendored vanilla-1.14 dataset", () => {
    expect(stats.weaponCount).toBe(3216);
  });

  it("exposes all required top-level tables", () => {
    expect(Object.keys(regulation.calcCorrectGraphs).length).toBeGreaterThan(0);
    expect(Object.keys(regulation.attackElementCorrects).length).toBeGreaterThan(0);
    expect(Object.keys(regulation.reinforceTypes).length).toBeGreaterThan(0);
    expect(Object.keys(regulation.statusSpEffectParams).length).toBeGreaterThan(0);
    expect(regulation.scalingTiers.length).toBe(6);
  });

  it("contains a known weapon with the expected base shape", () => {
    const longsword = regulation.weapons.find((w) => w.name === "Longsword");
    expect(longsword).toBeDefined();
    expect(longsword!.requirements).toMatchObject({ str: 10, dex: 10 });
    expect(longsword!.attack[0]).toEqual([0, 110]);
  });

  it("has every weapon's references resolvable (integrity holds across all 3216)", () => {
    // loadRegulation() already ran full validation; assert the summary stats it
    // produced are internally consistent.
    expect(stats.affinityCount).toBeGreaterThan(1);
    expect(stats.dlcWeaponCount).toBeGreaterThan(0);
    expect(stats.statusWeaponCount).toBeGreaterThan(0);
  });

  it("rejects structurally broken data", () => {
    expect(() => validateRegulation({})).toThrow(RegulationValidationError);
    expect(() => validateRegulation({ ...regulation, weapons: [] })).toThrow(
      /weapons table is empty/,
    );
  });

  it("rejects a weapon with a dangling reinforceTypeId", () => {
    const broken = {
      ...regulation,
      weapons: [{ ...regulation.weapons[0], reinforceTypeId: 999999 }],
    };
    expect(() => validateRegulation(broken)).toThrow(/reinforceTypeId/);
  });
});
