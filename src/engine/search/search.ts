import { AttackPowerType, type Attribute } from "../data/schema.ts";
import { affinityName } from "../data/affinities.ts";
import { weaponTypeName, catalystWeaponTypes } from "../calc/weaponTypes.ts";
import { getWeaponAttack } from "../calc/getWeaponAttack.ts";
import { getCalcWeapons } from "../calc/weapons.ts";
import type { Attributes, CalcWeapon } from "../calc/types.ts";
import { scoreResult, sumDamage, isSpellObjective, type SearchObjective } from "./objectives.ts";
import type { BuildStyle } from "./styles.ts";

export interface RankFilter {
  /** If set, only these weapons (matched by full `name`) are considered — "items I own". */
  ownedWeaponNames?: string[];
  /** If set, restrict to these affinity ids. */
  affinities?: number[];
  /** If set, restrict to these weapon-type ids. */
  weaponTypes?: number[];
  /** Include Shadow of the Erdtree weapons (default true). */
  includeDlc?: boolean;
  /** Drop weapons whose stat requirements aren't met (default false: keep but flag). */
  requireRequirementsMet?: boolean;
}

export interface RankOptions {
  attributes: Attributes;
  objective: SearchObjective;
  twoHanding?: boolean;
  /** Upgrade level to evaluate. "max" uses each weapon's own cap (+25 or +10). Default "max". */
  upgradeLevel?: number | "max";
  filter?: RankFilter;
  /** Max results to return (default 25). */
  limit?: number;
}

export interface RankedWeapon {
  rank: number;
  name: string;
  weaponName: string;
  affinityId: number;
  affinityName: string;
  weaponType: number;
  weaponTypeName: string;
  upgradeLevel: number;
  /** The objective's score for this weapon (what the list is sorted by). */
  score: number;
  /** Full AR/status/spell breakdown for display. */
  attackPower: Partial<Record<AttackPowerType, number>>;
  spellScaling: Partial<Record<AttackPowerType, number>>;
  totalAr: number;
  requirementsMet: boolean;
  ineffectiveAttributes: Attribute[];
}

function passesFilter(weapon: CalcWeapon, objective: SearchObjective, filter: RankFilter): boolean {
  if (filter.includeDlc === false && weapon.dlc) return false;
  if (filter.ownedWeaponNames && !filter.ownedWeaponNames.includes(weapon.name)) return false;
  if (filter.affinities && !filter.affinities.includes(weapon.affinityId)) return false;
  if (filter.weaponTypes && !filter.weaponTypes.includes(weapon.weaponType)) return false;

  // Spell objectives only make sense for catalysts; AR/status objectives exclude them
  // (catalysts have negligible melee AR). Skip this when the caller pins weaponTypes.
  if (!filter.weaponTypes) {
    const isCatalyst = catalystWeaponTypes.has(weapon.weaponType);
    if (isSpellObjective(objective) !== isCatalyst) return false;
  }
  return true;
}

/**
 * Rank weapon variants for a fixed attribute spread by a chosen objective.
 * Returns a sorted list (best first) with a full breakdown per weapon, so the
 * user can weigh trade-offs — not just the single winner.
 */
export function rankWeapons(options: RankOptions): RankedWeapon[] {
  const { attributes, objective, twoHanding = false, upgradeLevel = "max", limit = 25 } = options;
  const filter = options.filter ?? {};

  const results: RankedWeapon[] = [];

  for (const weapon of getCalcWeapons()) {
    if (!passesFilter(weapon, objective, filter)) continue;

    const level =
      upgradeLevel === "max"
        ? weapon.maxUpgradeLevel
        : Math.min(upgradeLevel, weapon.maxUpgradeLevel);

    const attack = getWeaponAttack({ weapon, attributes, twoHanding, upgradeLevel: level });
    const requirementsMet = attack.ineffectiveAttributes.length === 0;
    if (filter.requireRequirementsMet && !requirementsMet) continue;

    const score = scoreResult(attack, objective);
    if (score <= 0) continue;

    results.push({
      rank: 0,
      name: weapon.name,
      weaponName: weapon.weaponName,
      affinityId: weapon.affinityId,
      affinityName: affinityName(weapon.affinityId),
      weaponType: weapon.weaponType,
      weaponTypeName: weaponTypeName(weapon.weaponType),
      upgradeLevel: level,
      score,
      attackPower: attack.attackPower,
      spellScaling: attack.spellScaling,
      totalAr: sumDamage(attack),
      requirementsMet,
      ineffectiveAttributes: attack.ineffectiveAttributes,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit).map((r, i) => ({ ...r, rank: i + 1 }));
}

/**
 * Rank weapons for a chosen build style. The style supplies the objective and
 * default affinity/weapon-type filters; any explicit filter the caller passes
 * (e.g. owned items, DLC toggle) is layered on top and wins on conflict.
 */
export function rankWeaponsForStyle(
  style: BuildStyle,
  options: Omit<RankOptions, "objective"> & { filter?: RankFilter },
): RankedWeapon[] {
  const merged: RankFilter = {
    affinities: style.affinities,
    weaponTypes: style.weaponTypes,
    ...options.filter,
  };
  return rankWeapons({ ...options, objective: style.objective, filter: merged });
}
