import { describe, it, expect } from "vitest";
import { AttackPowerType } from "../data/schema.ts";
import { findWeapon, getCalcWeapons } from "../calc/weapons.ts";
import { getWeaponAttack } from "../calc/getWeaponAttack.ts";
import type { Attributes } from "../calc/types.ts";
import {
  applyAttributeBonuses,
  applyFlatDamage,
  applyResultMultipliers,
  computeTypeMultipliers,
  getModifiedWeaponAttack,
  type Modifier,
} from "./applyModifiers.ts";

const attrs = (str: number, dex: number, int = 10, fai = 10, arc = 10): Attributes => ({
  str,
  dex,
  int,
  fai,
  arc,
});

const PHYS = AttackPowerType.PHYSICAL;
const MAG = AttackPowerType.MAGIC;
const FIRE = AttackPowerType.FIRE;

// Synthetic modifiers — keep the stacking-math tests independent of the dataset.
const flatStr = (n: number): Modifier => ({
  id: `str+${n}`,
  name: `str+${n}`,
  kind: "talisman",
  attributeBonuses: { str: n },
  source: "test",
});

const pct = (group: string, amount: number, types?: AttackPowerType[]): Modifier => ({
  id: `${group}:${amount}`,
  name: group,
  kind: "buff",
  multipliers: [{ group, amount, types }],
  source: "test",
});

const grease = (type: AttackPowerType, amount: number): Modifier => ({
  id: `grease:${type}:${amount}`,
  name: "grease",
  kind: "grease",
  flatDamage: { [type]: amount },
  source: "test",
});

describe("applyAttributeBonuses", () => {
  it("sums flat bonuses across modifiers", () => {
    const out = applyAttributeBonuses(attrs(40, 40), [flatStr(5), flatStr(3)]);
    expect(out.str).toBe(48);
    expect(out.dex).toBe(40); // untouched
  });

  it("does not mutate the input spread", () => {
    const base = attrs(40, 40);
    applyAttributeBonuses(base, [flatStr(5)]);
    expect(base.str).toBe(40);
  });

  it("clamps to the 99 cap (curves are only evaluated to 148 = two-handed 99)", () => {
    const out = applyAttributeBonuses(attrs(97, 10), [flatStr(5)]);
    expect(out.str).toBe(99);
  });

  it("clamps to a floor of 1", () => {
    const out = applyAttributeBonuses(attrs(3, 10), [
      { id: "x", name: "x", kind: "talisman", attributeBonuses: { str: -10 }, source: "test" },
    ]);
    expect(out.str).toBe(1);
  });
});

describe("computeTypeMultipliers — strongest within group, multiplicative across", () => {
  it("takes the strongest of effects that share a group (they don't add)", () => {
    const m = computeTypeMultipliers([pct("g", 0.1, [PHYS]), pct("g", 0.2, [PHYS])]);
    // same group -> mutually exclusive -> 1 + max(0.1, 0.2) = 1.20
    expect(m.get(PHYS)).toBeCloseTo(1.2, 10);
  });

  it("multiplies amounts in different groups", () => {
    const m = computeTypeMultipliers([pct("a", 0.1, [PHYS]), pct("b", 0.2, [PHYS])]);
    // (1 + 0.1) * (1 + 0.2) = 1.32
    expect(m.get(PHYS)).toBeCloseTo(1.32, 10);
  });

  it("combines both rules correctly", () => {
    const m = computeTypeMultipliers([
      pct("a", 0.1, [PHYS]),
      pct("a", 0.2, [PHYS]), // same group -> strongest wins => 1.2
      pct("b", 0.5, [PHYS]), // other group -> multiplicative
    ]);
    // (1 + max(0.1, 0.2)) * (1 + 0.5) = 1.2 * 1.5 = 1.8
    expect(m.get(PHYS)).toBeCloseTo(1.8, 10);
  });

  it("keeps types independent", () => {
    const m = computeTypeMultipliers([pct("a", 0.1, [PHYS]), pct("b", 0.2, [MAG])]);
    expect(m.get(PHYS)).toBeCloseTo(1.1, 10);
    expect(m.get(MAG)).toBeCloseTo(1.2, 10);
  });

  it("defaults to all five damage types when types is omitted", () => {
    const m = computeTypeMultipliers([pct("a", 0.15)]);
    for (const t of [PHYS, MAG, FIRE, AttackPowerType.LIGHTNING, AttackPowerType.HOLY]) {
      expect(m.get(t)).toBeCloseTo(1.15, 10);
    }
  });

  it("returns an empty map when there are no multipliers", () => {
    expect(computeTypeMultipliers([flatStr(5)]).size).toBe(0);
  });
});

describe("applyResultMultipliers", () => {
  const base = {
    upgradeLevel: 25,
    attackPower: { [PHYS]: 100, [MAG]: 50 },
    spellScaling: {},
    ineffectiveAttributes: [],
    ineffectiveAttackPowerTypes: [],
  };

  it("scales only the types the weapon actually deals", () => {
    const out = applyResultMultipliers(base, [pct("a", 0.2, [PHYS]), pct("b", 1, [FIRE])]);
    expect(out.attackPower[PHYS]).toBeCloseTo(120, 10);
    expect(out.attackPower[MAG]).toBe(50); // unaffected
    expect(out.attackPower[FIRE]).toBeUndefined(); // never fabricated
  });

  it("returns the same object when nothing applies", () => {
    expect(applyResultMultipliers(base, [flatStr(5)])).toBe(base);
  });

  it("does not mutate the input result", () => {
    applyResultMultipliers(base, [pct("a", 0.5, [PHYS])]);
    expect(base.attackPower[PHYS]).toBe(100);
  });
});

describe("applyFlatDamage", () => {
  const base = {
    upgradeLevel: 25,
    attackPower: { [PHYS]: 100 },
    spellScaling: {},
    ineffectiveAttributes: [],
    ineffectiveAttackPowerTypes: [],
  };

  it("adds to an existing type", () => {
    const out = applyFlatDamage(base, [grease(PHYS, 50)]);
    expect(out.attackPower[PHYS]).toBe(150);
  });

  it("introduces a type the weapon didn't have", () => {
    const out = applyFlatDamage(base, [grease(FIRE, 85)]);
    expect(out.attackPower[FIRE]).toBe(85);
    expect(out.attackPower[PHYS]).toBe(100); // unchanged
  });

  it("sums multiple flat adds to the same type", () => {
    const out = applyFlatDamage(base, [grease(FIRE, 85), grease(FIRE, 110)]);
    expect(out.attackPower[FIRE]).toBe(195);
  });

  it("returns the same object when nothing applies, and never mutates input", () => {
    expect(applyFlatDamage(base, [flatStr(5)])).toBe(base);
    applyFlatDamage(base, [grease(PHYS, 50)]);
    expect(base.attackPower[PHYS]).toBe(100);
  });
});

describe("getModifiedWeaponAttack — flat then multiplier order", () => {
  it("applies multipliers to the flat-augmented total: (base + flat) × mult", () => {
    const weapon = findWeapon("Longsword")!; // pure physical, no innate fire
    const level = weapon.maxUpgradeLevel;
    const opts = { weapon, attributes: attrs(50, 50), upgradeLevel: level };
    const basePhys = getWeaponAttack(opts).attackPower[PHYS]!;

    const out = getModifiedWeaponAttack({
      ...opts,
      modifiers: [grease(FIRE, 85), pct("buff", 0.15)], // +85 fire, then +15% all
    });
    // Fire: (0 + 85) × 1.15;  Physical: base × 1.15
    expect(out.attackPower[FIRE]).toBeCloseTo(85 * 1.15, 6);
    expect(out.attackPower[PHYS]).toBeCloseTo(basePhys * 1.15, 6);
  });
});

describe("getModifiedWeaponAttack", () => {
  it("equals the base calc when no modifiers are supplied", () => {
    const weapon = findWeapon("Longsword")!;
    const opts = { weapon, attributes: attrs(50, 50), upgradeLevel: weapon.maxUpgradeLevel };
    const base = getWeaponAttack(opts);
    const modded = getModifiedWeaponAttack(opts);
    expect(modded).toEqual(base);
  });

  it("a flat-STR talisman matches simply raising STR by the same amount", () => {
    const weapon = findWeapon("Heavy Longsword")!; // strength-scaling
    const level = weapon.maxUpgradeLevel;
    const withTalisman = getModifiedWeaponAttack({
      weapon,
      attributes: attrs(50, 12),
      upgradeLevel: level,
      modifiers: [flatStr(5)],
    });
    const withRaisedStat = getWeaponAttack({ weapon, attributes: attrs(55, 12), upgradeLevel: level });
    expect(withTalisman.attackPower[PHYS]).toBeCloseTo(withRaisedStat.attackPower[PHYS]!, 6);
  });

  it("a +20% physical buff multiplies physical attack power by exactly 1.2", () => {
    const weapon = findWeapon("Longsword")!;
    const level = weapon.maxUpgradeLevel;
    const plain = getWeaponAttack({ weapon, attributes: attrs(50, 50), upgradeLevel: level });
    const buffed = getModifiedWeaponAttack({
      weapon,
      attributes: attrs(50, 50),
      upgradeLevel: level,
      modifiers: [pct("buff", 0.2, [PHYS])],
    });
    expect(buffed.attackPower[PHYS]).toBeCloseTo(plain.attackPower[PHYS]! * 1.2, 6);
  });

  it("composes attribute bonus and multiplier together", () => {
    const weapon = findWeapon("Heavy Longsword")!;
    const level = weapon.maxUpgradeLevel;
    const both = getModifiedWeaponAttack({
      weapon,
      attributes: attrs(50, 12),
      upgradeLevel: level,
      modifiers: [flatStr(5), pct("buff", 0.1, [PHYS])],
    });
    const expected =
      getWeaponAttack({ weapon, attributes: attrs(55, 12), upgradeLevel: level }).attackPower[PHYS]! *
      1.1;
    expect(both.attackPower[PHYS]).toBeCloseTo(expected, 6);
  });

  it("never throws across the whole dataset at max upgrade with a stacked set", () => {
    const stack: Modifier[] = [flatStr(5), pct("a", 0.15), pct("b", 0.2, [MAG])];
    for (const weapon of getCalcWeapons()) {
      expect(() =>
        getModifiedWeaponAttack({
          weapon,
          attributes: attrs(99, 99, 99, 99, 99),
          upgradeLevel: weapon.maxUpgradeLevel,
          twoHanding: true,
          modifiers: stack,
        }),
      ).not.toThrow();
    }
  });
});
