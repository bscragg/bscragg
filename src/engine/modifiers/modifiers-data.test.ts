import { describe, it, expect } from "vitest";
import { AttackPowerType } from "../data/schema.ts";
import { findWeapon } from "../calc/weapons.ts";
import { getWeaponAttack } from "../calc/getWeaponAttack.ts";
import type { Attributes } from "../calc/types.ts";
import { getModifiedWeaponAttack } from "./applyModifiers.ts";
import {
  MODIFIERS,
  getModifier,
  getModifiers,
  resolveModifiers,
  modifiersByKind,
} from "./modifiers-data.ts";

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

  it("every modifier does something (a bonus, flat/scaling damage, or a multiplier)", () => {
    for (const m of MODIFIERS) {
      const hasBonus = !!m.attributeBonuses && Object.keys(m.attributeBonuses).length > 0;
      const hasFlat = !!m.flatDamage && Object.keys(m.flatDamage).length > 0;
      const hasScaling = !!m.scalingDamage && m.scalingDamage.types.length > 0;
      const hasMult = !!m.multipliers && m.multipliers.length > 0;
      expect(hasBonus || hasFlat || hasScaling || hasMult).toBe(true);
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

  it("covers all five kinds", () => {
    expect(modifiersByKind("talisman").length).toBeGreaterThan(0);
    expect(modifiersByKind("physick").length).toBeGreaterThan(0);
    expect(modifiersByKind("buff").length).toBeGreaterThan(0);
    expect(modifiersByKind("grease").length).toBeGreaterThan(0);
    expect(modifiersByKind("weapon-buff").length).toBeGreaterThan(0);
  });

  it("greases carry flat damage and no scaling effects", () => {
    for (const m of modifiersByKind("grease")) {
      expect(m.flatDamage && Object.keys(m.flatDamage).length).toBeTruthy();
      expect(m.attributeBonuses).toBeUndefined();
      expect(m.multipliers).toBeUndefined();
    }
  });
});

describe("lookup helpers", () => {
  it("getModifier resolves by id and returns undefined for unknown", () => {
    expect(getModifier("golden-vow")?.name).toBe("Golden Vow (incantation)");
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

describe("expanded catalogue — stacking specifics", () => {
  const weapon = findWeapon("Longsword")!;
  const level = weapon.maxUpgradeLevel;
  const a = attrs(60, 60);
  const basePhys = () =>
    getWeaponAttack({ weapon, attributes: a, upgradeLevel: level }).attackPower[
      AttackPowerType.PHYSICAL
    ]!;
  const moddedPhys = (ids: string[]) =>
    getModifiedWeaponAttack({ weapon, attributes: a, upgradeLevel: level, modifiers: getModifiers(ids) })
      .attackPower[AttackPowerType.PHYSICAL]!;

  it("two Body buffs are mutually exclusive — the stronger applies, not sum or product", () => {
    const base = basePhys();
    expect(moddedPhys(["flame-grant-me-strength"])).toBeCloseTo(base * 1.2, 4);
    // Howl (+25%) is the stronger body buff; picking both yields ×1.25 — not
    // ×1.20×1.25 (product) and not ×1.45 (sum).
    expect(moddedPhys(["flame-grant-me-strength", "howl-of-shabriri"])).toBeCloseTo(base * 1.25, 4);
  });

  it("the two Golden Vows share a group — the stronger (incantation) wins", () => {
    expect(moddedPhys(["golden-vow", "golden-vow-ash"])).toBeCloseTo(basePhys() * 1.15, 4);
  });

  it("Outer God Heirloom grants +5 Arcane (the DLC arcane heirloom)", () => {
    const m = getModifier("outer-god-heirloom")!;
    expect(m.attributeBonuses).toEqual({ arc: 5 });
    expect(m.dlc).toBe(true);
  });

  it("all four elemental Shrouding tears exist and are base game", () => {
    for (const id of [
      "magic-shrouding-cracked-tear",
      "flame-shrouding-cracked-tear",
      "lightning-shrouding-cracked-tear",
      "holy-shrouding-cracked-tear",
    ]) {
      const m = getModifier(id);
      expect(m).toBeTruthy();
      expect(m!.dlc).toBeUndefined();
    }
  });

  it("Fire Grease adds +85 flat fire to a purely-physical weapon", () => {
    const fire = getModifiedWeaponAttack({
      weapon,
      attributes: a,
      upgradeLevel: level,
      modifiers: getModifiers(["fire-grease"]),
    }).attackPower[AttackPowerType.FIRE];
    expect(fire).toBeCloseTo(85, 6);
  });

  it("a grease's added type is then amplified by an attack-up multiplier", () => {
    const fire = getModifiedWeaponAttack({
      weapon,
      attributes: a,
      upgradeLevel: level,
      modifiers: getModifiers(["fire-grease", "golden-vow"]),
    }).attackPower[AttackPowerType.FIRE];
    expect(fire).toBeCloseTo(85 * 1.15, 4);
  });

  it("Blood Grease adds flat bleed buildup", () => {
    const bleed = getModifiedWeaponAttack({
      weapon,
      attributes: a,
      upgradeLevel: level,
      modifiers: getModifiers(["blood-grease"]),
    }).attackPower[AttackPowerType.BLEED];
    expect(bleed).toBeCloseTo(30, 6);
  });
});

describe("weapon-buff spells — catalyst-scaling resolution", () => {
  const weapon = findWeapon("Longsword")!;
  const level = weapon.maxUpgradeLevel;
  const a = attrs(60, 60);

  it("resolveModifiers folds scalingDamage into flatDamage at the given spell buff", () => {
    const [scholars] = resolveModifiers(["scholars-armament"], 200);
    expect(scholars!.flatDamage?.[AttackPowerType.MAGIC]).toBeCloseTo(0.75 * 200, 6);
  });

  it("an unresolved weapon-buff spell adds nothing (engine ignores scalingDamage)", () => {
    const fire = getModifiedWeaponAttack({
      weapon,
      attributes: a,
      upgradeLevel: level,
      modifiers: getModifiers(["bloodflame-blade"]), // NOT resolved
    }).attackPower[AttackPowerType.FIRE];
    expect(fire ?? 0).toBe(0);
  });

  it("Scholar's Armament adds magic = 0.75 × spell buff through the engine", () => {
    const magic = getModifiedWeaponAttack({
      weapon,
      attributes: a,
      upgradeLevel: level,
      modifiers: resolveModifiers(["scholars-armament"], 240),
    }).attackPower[AttackPowerType.MAGIC];
    expect(magic).toBeCloseTo(0.75 * 240, 4);
  });

  it("Bloodflame Blade scales fire and keeps its fixed +40 bleed rider", () => {
    const res = getModifiedWeaponAttack({
      weapon,
      attributes: a,
      upgradeLevel: level,
      modifiers: resolveModifiers(["bloodflame-blade"], 200),
    });
    expect(res.attackPower[AttackPowerType.FIRE]).toBeCloseTo(0.4 * 200, 4);
    expect(res.attackPower[AttackPowerType.BLEED]).toBeCloseTo(40, 6);
  });

  it("scaling fire is then amplified by an attack-up multiplier", () => {
    const fire = getModifiedWeaponAttack({
      weapon,
      attributes: a,
      upgradeLevel: level,
      modifiers: [...resolveModifiers(["electrify-armament"], 200), ...getModifiers(["golden-vow"])],
    }).attackPower[AttackPowerType.LIGHTNING];
    expect(fire).toBeCloseTo(0.75 * 200 * 1.15, 3);
  });
});
