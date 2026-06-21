import {
  AttackPowerType,
  allAttributes,
  allDamageTypes,
  allStatusTypes,
  type Attribute,
} from "../data/schema.ts";
import type { Attributes, CalcWeapon, WeaponAttackResult } from "./types.ts";
import { alwaysTwoHandedWeaponTypes } from "./weaponTypes.ts";

/**
 * AR engine. Ported from ThomasJClark/elden-ring-weapon-calculator's
 * `getWeaponAttack` / `adjustAttributesForTwoHanding` (MIT). See ATTRIBUTION.md.
 *
 * Given a weapon variant, a 5-attribute spread, and an upgrade level, returns
 * the Attack Rating broken down per damage type plus status buildup. AR — not
 * true DPS.
 */

export interface WeaponAttackOptions {
  weapon: CalcWeapon;
  attributes: Attributes;
  twoHanding?: boolean;
  upgradeLevel: number;
  /** When true, two-handing does not boost attack power (only requirements). */
  disableTwoHandingAttackPowerBonus?: boolean;
  /** Multiplier penalty when a requirement isn't met (default 0.4 → ×0.6). */
  ineffectiveAttributePenalty?: number;
}

/**
 * Apply the +50% Strength bonus for two-handing (floor(str × 1.5)). Paired
 * weapons get no bonus; bows/ballistae always do.
 */
export function adjustAttributesForTwoHanding({
  twoHanding = false,
  weapon,
  attributes,
}: {
  twoHanding?: boolean;
  weapon: CalcWeapon;
  attributes: Attributes;
}): Attributes {
  let twoHandingBonus = twoHanding;

  if (weapon.paired) {
    twoHandingBonus = false;
  }

  if (alwaysTwoHandedWeaponTypes.has(weapon.weaponType)) {
    twoHandingBonus = true;
  }

  if (twoHandingBonus) {
    return { ...attributes, str: Math.floor(attributes.str * 1.5) };
  }

  return attributes;
}

export function getWeaponAttack({
  weapon,
  attributes,
  twoHanding,
  upgradeLevel,
  disableTwoHandingAttackPowerBonus,
  ineffectiveAttributePenalty = 0.4,
}: WeaponAttackOptions): WeaponAttackResult {
  const adjustedAttributes = adjustAttributesForTwoHanding({ twoHanding, weapon, attributes });

  const ineffectiveAttributes = (Object.entries(weapon.requirements) as [Attribute, number][])
    .filter(([attribute, requirement]) => adjustedAttributes[attribute] < requirement)
    .map(([attribute]) => attribute);

  const ineffectiveAttackPowerTypes: AttackPowerType[] = [];
  const attackPower: Partial<Record<AttackPowerType, number>> = {};
  const spellScaling: Partial<Record<AttackPowerType, number>> = {};

  const attackAtLevel = weapon.attack[upgradeLevel];
  const scalingAtLevel = weapon.attributeScaling[upgradeLevel];
  const scalingAtBase = weapon.attributeScaling[0];
  if (!attackAtLevel || !scalingAtLevel || !scalingAtBase) {
    throw new Error(
      `Invalid upgrade level ${upgradeLevel} for ${weapon.name} (max ${weapon.maxUpgradeLevel})`,
    );
  }

  for (const attackPowerType of [...allDamageTypes, ...allStatusTypes]) {
    const isDamageType = (allDamageTypes as readonly AttackPowerType[]).includes(attackPowerType);

    const baseAttackPower = attackAtLevel[attackPowerType] ?? 0;
    if (baseAttackPower || weapon.sorceryTool || weapon.incantationTool) {
      const scalingAttributes = weapon.attackElementCorrect[attackPowerType] ?? {};

      let totalScaling = 1;

      if (ineffectiveAttributes.some((attribute) => scalingAttributes[attribute])) {
        // Unmet requirement: subtract a penalty instead of adding scaling.
        totalScaling = 1 - ineffectiveAttributePenalty;
        ineffectiveAttackPowerTypes.push(attackPowerType);
      } else {
        const effectiveAttributes =
          !disableTwoHandingAttackPowerBonus && isDamageType ? adjustedAttributes : attributes;

        for (const attribute of allAttributes) {
          const attributeCorrect = scalingAttributes[attribute];
          if (attributeCorrect) {
            let scaling: number;
            if (attributeCorrect === true) {
              scaling = scalingAtLevel[attribute] ?? 0;
            } else {
              scaling =
                (attributeCorrect * (scalingAtLevel[attribute] ?? 0)) /
                (scalingAtBase[attribute] ?? 0);
            }

            if (scaling) {
              const curve = weapon.calcCorrectGraphs[attackPowerType];
              totalScaling += (curve[effectiveAttributes[attribute]] ?? 0) * scaling;
            }
          }
        }
      }

      if (baseAttackPower) {
        attackPower[attackPowerType] = baseAttackPower * totalScaling;
      }

      if (isDamageType && (weapon.sorceryTool || weapon.incantationTool)) {
        spellScaling[attackPowerType] = 100 * totalScaling;
      }
    }
  }

  return {
    upgradeLevel,
    attackPower,
    spellScaling,
    ineffectiveAttributes,
    ineffectiveAttackPowerTypes,
  };
}

/** Sum of the five damage types (the displayed "Attack Power" total). Excludes status buildup. */
export function totalAttackRating(result: WeaponAttackResult): number {
  let total = 0;
  for (const type of allDamageTypes) {
    total += result.attackPower[type] ?? 0;
  }
  return total;
}
