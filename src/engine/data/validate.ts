import {
  allAttributes,
  type Attribute,
  type Regulation,
  type RawWeapon,
} from "./schema.ts";

export class RegulationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegulationValidationError";
  }
}

/** Summary stats produced by validation — handy for the data-layer report. */
export interface RegulationStats {
  weaponCount: number;
  affinityCount: number;
  dlcWeaponCount: number;
  calcCorrectGraphCount: number;
  reinforceTypeCount: number;
  statusSpEffectParamCount: number;
  /** Weapons with at least one non-zero status sp-effect param id. */
  statusWeaponCount: number;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function requireTable(root: Record<string, unknown>, key: string): void {
  if (!(key in root)) {
    throw new RegulationValidationError(`Missing top-level table "${key}"`);
  }
}

const ATTR_SET = new Set<string>(allAttributes);

function validateWeapon(w: unknown, index: number, reg: Regulation): void {
  if (!isObject(w)) {
    throw new RegulationValidationError(`weapons[${index}] is not an object`);
  }
  const name = typeof w.name === "string" ? w.name : `#${index}`;
  const fail = (msg: string): never => {
    throw new RegulationValidationError(`Weapon "${name}" (weapons[${index}]): ${msg}`);
  };

  if (typeof w.name !== "string") fail("missing name");
  if (typeof w.affinityId !== "number") fail("missing affinityId");
  if (!Array.isArray(w.attack)) fail("missing attack array");

  // Referential integrity: every id a weapon points at must resolve.
  const reinforceId = String(w.reinforceTypeId);
  if (!(reinforceId in reg.reinforceTypes)) {
    fail(`reinforceTypeId ${reinforceId} not found in reinforceTypes`);
  }
  const aecId = String(w.attackElementCorrectId);
  if (!(aecId in reg.attackElementCorrects)) {
    fail(`attackElementCorrectId ${aecId} not found in attackElementCorrects`);
  }

  // calcCorrectGraphIds values must reference real graphs.
  if (isObject(w.calcCorrectGraphIds)) {
    for (const graphId of Object.values(w.calcCorrectGraphIds)) {
      if (!(String(graphId) in reg.calcCorrectGraphs)) {
        fail(`calcCorrectGraphId ${graphId} not found in calcCorrectGraphs`);
      }
    }
  }

  // Scaling attribute keys must be valid attributes.
  if (Array.isArray(w.attributeScaling)) {
    for (const pair of w.attributeScaling as [string, number][]) {
      if (!ATTR_SET.has(pair[0])) fail(`unknown scaling attribute "${pair[0]}"`);
    }
  }

  // Requirement keys must be valid attributes.
  if (isObject(w.requirements)) {
    for (const attr of Object.keys(w.requirements)) {
      if (!ATTR_SET.has(attr)) fail(`unknown requirement attribute "${attr}"`);
    }
  }
}

/**
 * Validate raw parsed JSON and return it as a typed Regulation plus summary
 * stats. Throws RegulationValidationError on any structural or referential
 * problem so a bad data drop fails loudly instead of corrupting calculations.
 */
export function validateRegulation(raw: unknown): {
  regulation: Regulation;
  stats: RegulationStats;
} {
  if (!isObject(raw)) {
    throw new RegulationValidationError("Regulation root is not an object");
  }

  for (const key of [
    "calcCorrectGraphs",
    "attackElementCorrects",
    "reinforceTypes",
    "statusSpEffectParams",
    "scalingTiers",
    "weapons",
  ]) {
    requireTable(raw, key);
  }

  if (!Array.isArray(raw.weapons) || raw.weapons.length === 0) {
    throw new RegulationValidationError("weapons table is empty");
  }
  if (!Array.isArray(raw.scalingTiers) || raw.scalingTiers.length === 0) {
    throw new RegulationValidationError("scalingTiers table is empty");
  }

  // Trust the structural shape after the table checks above; weapon-level
  // referential checks below catch the integrity problems that actually matter.
  const reg = raw as unknown as Regulation;

  const affinities = new Set<number>();
  let dlcWeaponCount = 0;
  let statusWeaponCount = 0;

  reg.weapons.forEach((w, i) => {
    validateWeapon(w, i, reg);
    const weapon = w as RawWeapon;
    affinities.add(weapon.affinityId);
    if (weapon.dlc) dlcWeaponCount++;
    if (weapon.statusSpEffectParamIds?.some((id) => id !== 0)) statusWeaponCount++;
  });

  const stats: RegulationStats = {
    weaponCount: reg.weapons.length,
    affinityCount: affinities.size,
    dlcWeaponCount,
    calcCorrectGraphCount: Object.keys(reg.calcCorrectGraphs).length,
    reinforceTypeCount: Object.keys(reg.reinforceTypes).length,
    statusSpEffectParamCount: Object.keys(reg.statusSpEffectParams).length,
    statusWeaponCount,
  };

  return { regulation: reg, stats };
}

export type { Attribute };
