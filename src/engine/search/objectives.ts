import {
  AttackPowerType,
  allDamageTypes,
  allStatusTypes,
} from "../data/schema.ts";
import type { WeaponAttackResult } from "../calc/types.ts";

/**
 * What a search is trying to maximize. Drives both ranking and the build-style
 * presets. All objectives score Attack Rating or status buildup — never "DPS".
 */
export type SearchObjective =
  /** Sum of all five damage types (the displayed Attack Power total). */
  | { kind: "totalAr" }
  /** A single damage type — for a boss weak to e.g. fire. */
  | { kind: "damageType"; type: (typeof allDamageTypes)[number] }
  /** A single status buildup — e.g. bleed, frost. */
  | { kind: "status"; type: (typeof allStatusTypes)[number] }
  /** Catalyst spell scaling. `type` narrows to e.g. magic (staffs) or holy (seals); omit for best. */
  | { kind: "spellScaling"; type?: (typeof allDamageTypes)[number] };

const damageTypeSet = new Set<AttackPowerType>(allDamageTypes);
const statusTypeSet = new Set<AttackPowerType>(allStatusTypes);

/** Sum of the five damage types. */
export function sumDamage(result: WeaponAttackResult): number {
  let total = 0;
  for (const type of allDamageTypes) total += result.attackPower[type] ?? 0;
  return total;
}

/** Score a single attack result against an objective. Higher is better. */
export function scoreResult(result: WeaponAttackResult, objective: SearchObjective): number {
  switch (objective.kind) {
    case "totalAr":
      return sumDamage(result);
    case "damageType":
      return result.attackPower[objective.type] ?? 0;
    case "status":
      return result.attackPower[objective.type] ?? 0;
    case "spellScaling": {
      if (objective.type !== undefined) return result.spellScaling[objective.type] ?? 0;
      let best = 0;
      for (const type of allDamageTypes) best = Math.max(best, result.spellScaling[type] ?? 0);
      return best;
    }
  }
}

/** True if this objective is about catalyst spell scaling (ranks staffs/seals). */
export function isSpellObjective(objective: SearchObjective): boolean {
  return objective.kind === "spellScaling";
}

/** Human-readable label for an objective. */
export function objectiveLabel(objective: SearchObjective): string {
  const names: Record<AttackPowerType, string> = {
    [AttackPowerType.PHYSICAL]: "Physical",
    [AttackPowerType.MAGIC]: "Magic",
    [AttackPowerType.FIRE]: "Fire",
    [AttackPowerType.LIGHTNING]: "Lightning",
    [AttackPowerType.HOLY]: "Holy",
    [AttackPowerType.POISON]: "Poison",
    [AttackPowerType.SCARLET_ROT]: "Scarlet Rot",
    [AttackPowerType.BLEED]: "Bleed",
    [AttackPowerType.FROST]: "Frost",
    [AttackPowerType.SLEEP]: "Sleep",
    [AttackPowerType.MADNESS]: "Madness",
    [AttackPowerType.DEATH_BLIGHT]: "Death Blight",
  };
  switch (objective.kind) {
    case "totalAr":
      return "Total Attack Rating";
    case "damageType":
      return `${names[objective.type]} damage`;
    case "status":
      return `${names[objective.type]} buildup`;
    case "spellScaling":
      return objective.type === undefined
        ? "Spell scaling"
        : `${names[objective.type]} spell scaling`;
  }
}

export { damageTypeSet, statusTypeSet };
