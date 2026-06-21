import { describe, it, expect } from "vitest";
import { AttackPowerType } from "../data/schema.ts";
import { getWeaponAttack, totalAttackRating } from "./getWeaponAttack.ts";
import { findWeapon, getCalcWeapons } from "./weapons.ts";
import type { Attributes } from "./types.ts";

const attrs = (str: number, dex: number, int = 10, fai = 10, arc = 10): Attributes => ({
  str,
  dex,
  int,
  fai,
  arc,
});

/**
 * Golden AR values generated from the reference calculator
 * (ThomasJClark/elden-ring-weapon-calculator) running the same vanilla-1.14
 * dataset. Agreement with these values is the Phase 2 acceptance bar.
 */
interface GoldenCase {
  label: string;
  name: string;
  upgradeLevel: number;
  attributes: Attributes;
  twoHanding: boolean;
  attackPower: Record<number, number>;
  ineffectiveAttributes: string[];
  ineffectiveAttackPowerTypes: number[];
}

const GOLDEN: GoldenCase[] = [
  {
    label: "Longsword Standard +0 @10/10",
    name: "Longsword",
    upgradeLevel: 0,
    attributes: attrs(10, 10),
    twoHanding: false,
    attackPower: { 0: 120.641 },
    ineffectiveAttributes: [],
    ineffectiveAttackPowerTypes: [],
  },
  {
    label: "Longsword Standard +25 @40/40",
    name: "Longsword",
    upgradeLevel: 25,
    attributes: attrs(40, 40),
    twoHanding: false,
    attackPower: { 0: 452.275 },
    ineffectiveAttributes: [],
    ineffectiveAttackPowerTypes: [],
  },
  {
    label: "Heavy Longsword +25 @60str",
    name: "Heavy Longsword",
    upgradeLevel: 25,
    attributes: attrs(60, 12),
    twoHanding: false,
    attackPower: { 0: 495.474 },
    ineffectiveAttributes: [],
    ineffectiveAttackPowerTypes: [],
  },
  {
    label: "Heavy Longsword +25 @60str two-handed",
    name: "Heavy Longsword",
    upgradeLevel: 25,
    attributes: attrs(60, 12),
    twoHanding: true,
    attackPower: { 0: 554.694 },
    ineffectiveAttributes: [],
    ineffectiveAttackPowerTypes: [],
  },
  {
    label: "Keen Longsword +25 @60dex",
    name: "Keen Longsword",
    upgradeLevel: 25,
    attributes: attrs(12, 60),
    twoHanding: false,
    attackPower: { 0: 489.772 },
    ineffectiveAttributes: [],
    ineffectiveAttackPowerTypes: [],
  },
  {
    label: "Longsword Standard +25 @8/8 (unmet requirement)",
    name: "Longsword",
    upgradeLevel: 25,
    attributes: attrs(8, 8),
    twoHanding: false,
    attackPower: { 0: 161.7 },
    ineffectiveAttributes: ["str", "dex"],
    ineffectiveAttackPowerTypes: [AttackPowerType.PHYSICAL],
  },
  {
    label: "Reduvia +10 @45arc (arcane bleed buildup)",
    name: "Reduvia",
    upgradeLevel: 10,
    attributes: attrs(18, 18, 10, 10, 45),
    twoHanding: false,
    attackPower: { 0: 366.989, 7: 87.125 },
    ineffectiveAttributes: [],
    ineffectiveAttackPowerTypes: [],
  },
  {
    label: "Rivers of Blood +10 (physical + fire + bleed)",
    name: "Rivers of Blood",
    upgradeLevel: 10,
    attributes: attrs(20, 30, 10, 10, 50),
    twoHanding: false,
    attackPower: { 0: 350.723, 2: 274.682, 7: 73.76 },
    ineffectiveAttributes: [],
    ineffectiveAttackPowerTypes: [],
  },
];

describe("AR engine — agreement with reference calculator", () => {
  for (const c of GOLDEN) {
    it(c.label, () => {
      const weapon = findWeapon(c.name);
      expect(weapon, `weapon "${c.name}" should exist`).toBeDefined();

      const result = getWeaponAttack({
        weapon: weapon!,
        attributes: c.attributes,
        twoHanding: c.twoHanding,
        upgradeLevel: c.upgradeLevel,
      });

      for (const [type, expected] of Object.entries(c.attackPower)) {
        expect(result.attackPower[Number(type) as AttackPowerType]).toBeCloseTo(expected, 2);
      }
      // No unexpected extra damage/status types beyond those asserted.
      const got = Object.keys(result.attackPower).sort();
      const want = Object.keys(c.attackPower).sort();
      expect(got).toEqual(want);

      expect(result.ineffectiveAttributes.sort()).toEqual([...c.ineffectiveAttributes].sort());
      expect(result.ineffectiveAttackPowerTypes.sort()).toEqual(
        [...c.ineffectiveAttackPowerTypes].sort(),
      );
    });
  }
});

describe("AR engine — behaviour", () => {
  it("two-handing increases STR-scaling AR (floor(str*1.5))", () => {
    const w = findWeapon("Heavy Longsword")!;
    const oneHand = getWeaponAttack({ weapon: w, attributes: attrs(40, 12), upgradeLevel: 25 });
    const twoHand = getWeaponAttack({
      weapon: w,
      attributes: attrs(40, 12),
      upgradeLevel: 25,
      twoHanding: true,
    });
    expect(totalAttackRating(twoHand)).toBeGreaterThan(totalAttackRating(oneHand));
  });

  it("meeting requirements removes the penalty (higher AR than just-below)", () => {
    const w = findWeapon("Longsword")!;
    const below = totalAttackRating(
      getWeaponAttack({ weapon: w, attributes: attrs(9, 9), upgradeLevel: 0 }),
    );
    const meets = totalAttackRating(
      getWeaponAttack({ weapon: w, attributes: attrs(10, 10), upgradeLevel: 0 }),
    );
    expect(meets).toBeGreaterThan(below);
  });

  it("decodes the full dataset and every weapon computes at max upgrade without throwing", () => {
    const weapons = getCalcWeapons();
    expect(weapons.length).toBe(3216);
    const stats = attrs(50, 50, 50, 50, 50);
    for (const w of weapons) {
      const r = getWeaponAttack({ weapon: w, attributes: stats, upgradeLevel: w.maxUpgradeLevel });
      const ar = totalAttackRating(r);
      expect(Number.isFinite(ar)).toBe(true);
      expect(ar).toBeGreaterThanOrEqual(0);
    }
  });

  it("somber/unique weapons cap at +10, normal weapons at +25", () => {
    expect(findWeapon("Longsword")!.maxUpgradeLevel).toBe(25);
    expect(findWeapon("Reduvia")!.maxUpgradeLevel).toBe(10);
  });
});
