import { describe, it, expect } from "vitest";
import { AttackPowerType } from "../data/schema.ts";
import { findWeapon } from "../calc/weapons.ts";
import { getWeaponAttack } from "../calc/getWeaponAttack.ts";
import type { Attributes } from "../calc/types.ts";
import { getModifiedWeaponAttack } from "./applyModifiers.ts";
import { MODIFIERS, getModifier, getModifiers, modifiersByKind } from "./modifiers-data.ts";

const attrs = (str: number, dex: number, int = 10, fai = 10, arc = 10): Attributes => ({
  str,
  dex,
  int,
  fai,
  arc,
});

describe("modifier dataset integrity", () => {
  it("has unique ids", () => {
    const ids = MODIFIERS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every modifier carries a source attribution", () => {
    for (const m of MODIFIERS) expect(m.source.length).toBeGreaterThan(0);
  });

  it("every modifier does something (a bonus or a multiplier)", () => {
    for (const m of MODIFIERS) {
      const hasBonus = m.attributeBonuses && Object.keys(m.attributeBonuses).length > 0;
      const hasMult = m.multipliers && m.multipliers.length > 0;
      expect(hasBonus || hasMult).toBe(true);
    }
  });

  it("multiplier amounts are sane fractional boosts (0–1)", () => {
    for (const m of MODIFIERS) {
      for (const mult of m.multipliers ?? []) {
        expect(mult.amount).toBeGreaterThan(0);
        expect(mult.amount).toBeLessThanOrEqual(1);
      }
    }
  });

  it("covers all three kinds", () => {
    expect(modifiersByKind("talisman").length).toBeGreaterThan(0);
    expect(modifiersByKind("physick").length).toBeGreaterThan(0);
    expect(modifiersByKind("buff").length).toBeGreaterThan(0);
  });
});

describe("lookup helpers", () => {
  it("getModifier resolves by id and returns undefined for unknown", () => {
    expect(getModifier("golden-vow")?.name).toBe("Golden Vow");
    expect(getModifier("does-not-exist")).toBeUndefined();
  });

  it("getModifiers resolves a list and drops unknown ids", () => {
    const resolved = getModifiers(["golden-vow", "nope", "ritual-sword-talisman"]);
    expect(resolved.map((m) => m.id)).toEqual(["golden-vow", "ritual-sword-talisman"]);
  });
});

describe("dataset applied through the real engine", () => {
  const weapon = findWeapon("Longsword")!;
  const level = weapon.maxUpgradeLevel;
  const a = attrs(60, 60);

  it("Golden Vow (+15%) and Flame, Grant Me Strength (+20% phys) stack multiplicatively", () => {
    const plain = getWeaponAttack({ weapon, attributes: a, upgradeLevel: level }).attackPower[
      AttackPowerType.PHYSICAL
    ]!;
    const both = getModifiedWeaponAttack({
      weapon,
      attributes: a,
      upgradeLevel: level,
      modifiers: getModifiers(["golden-vow", "flame-grant-me-strength"]),
    }).attackPower[AttackPowerType.PHYSICAL]!;
    // distinct groups -> 1.15 * 1.20 = 1.38 (not additive 1.35)
    expect(both).toBeCloseTo(plain * 1.15 * 1.2, 4);
  });

  it("Starscourge Heirloom (+5 STR) feeds into scaling like a raw stat", () => {
    const heavy = findWeapon("Heavy Longsword")!;
    const lvl = heavy.maxUpgradeLevel;
    const withTalisman = getModifiedWeaponAttack({
      weapon: heavy,
      attributes: attrs(50, 12),
      upgradeLevel: lvl,
      modifiers: getModifiers(["starscourge-heirloom"]),
    }).attackPower[AttackPowerType.PHYSICAL]!;
    const raw = getWeaponAttack({ weapon: heavy, attributes: attrs(55, 12), upgradeLevel: lvl })
      .attackPower[AttackPowerType.PHYSICAL]!;
    expect(withTalisman).toBeCloseTo(raw, 4);
  });

  it("a magic-only charm leaves a pure-physical weapon's AR unchanged", () => {
    const plain = getWeaponAttack({ weapon, attributes: a, upgradeLevel: level });
    const charmed = getModifiedWeaponAttack({
      weapon,
      attributes: a,
      upgradeLevel: level,
      modifiers: getModifiers(["magic-scorpion-charm"]),
    });
    expect(charmed.attackPower[AttackPowerType.PHYSICAL]).toBeCloseTo(
      plain.attackPower[AttackPowerType.PHYSICAL]!,
      6,
    );
  });
});
