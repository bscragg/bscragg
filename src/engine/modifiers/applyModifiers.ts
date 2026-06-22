import {
  allAttributes,
  allDamageTypes,
  type AttackPowerType,
} from "../data/schema.ts";
import type { Attributes, WeaponAttackResult } from "../calc/types.ts";
import { getWeaponAttack, type WeaponAttackOptions } from "../calc/getWeaponAttack.ts";

/**
 * Phase 5 — modifier stacking.
 *
 * Talismans, Wondrous Physick tears, and buffs (incantations/sorceries) layer
 * on top of a weapon's base Attack Rating in two distinct ways:
 *
 *   1. **Flat attribute bonuses** (e.g. Starscourge Heirloom +5 STR) change the
 *      character's stats, so they feed *into* scaling. They are applied to the
 *      attribute spread *before* the AR calc.
 *   2. **Percentage AR multipliers** (e.g. Golden Vow +15%) apply *after* the
 *      calc, per damage type.
 *
 * The multiplier stacking model follows Elden Ring's buff rules: **only the
 * strongest effect in a group applies (same-category buffs are mutually
 * exclusive in game — they overwrite rather than add), and different groups
 * multiply.** Each multiplier carries a `group` tag. For a damage type `t`:
 *
 *     multiplier(t) = Π over groups g ( 1 + max of effects in g affecting t )
 *
 * (e.g. Flame Grant Me Strength and Howl of Shabriri are both Body buffs, so
 * picking both yields the stronger of the two, not their sum; Golden Vow is a
 * separate group, so it multiplies on top.)
 *
 * This module is pure (no React, no I/O) so the stacking math is unit-tested
 * independently of any dataset. See `modifiers-data.ts` for the vendored values.
 *
 * AR — not true DPS. Multipliers scale the displayed Attack Power and status
 * buildup; spell scaling is intentionally left untouched in this phase.
 */

/** The hard attribute cap; also the bound the soft-cap curves are evaluated to. */
const ATTR_CAP = 99;

export type ModifierKind = "talisman" | "physick" | "buff";

export interface ModifierMultiplier {
  /**
   * Stacking group. Within a group only the strongest effect applies (in-game,
   * same-category buffs are mutually exclusive — they overwrite, not add); the
   * resulting per-group factors multiply across different groups. Use the same
   * group for mutually-exclusive in-game effects, distinct groups for effects
   * that stack multiplicatively.
   */
  group: string;
  /** Fractional boost applied to the affected types. `0.15` = +15%. */
  amount: number;
  /**
   * Attack-power types this boosts. Omit to mean "all five damage types".
   * Status buildup is only affected when its type is listed explicitly.
   */
  types?: readonly AttackPowerType[];
}

export interface Modifier {
  /** Stable slug, e.g. "golden-vow". */
  id: string;
  /** Display name, e.g. "Golden Vow". */
  name: string;
  kind: ModifierKind;
  /** Flat attribute bonuses applied before scaling (e.g. `{ str: 5 }`). */
  attributeBonuses?: Partial<Attributes>;
  /** Percentage AR effects, applied after the calc. */
  multipliers?: readonly ModifierMultiplier[];
  /** Activation caveat that the user must satisfy, e.g. "while HP is at maximum". */
  condition?: string;
  /** Downside worth surfacing, e.g. "+10% damage taken". Informational only. */
  drawback?: string;
  dlc?: boolean;
  /** Where the values come from (attribution / community reference). */
  source: string;
}

/**
 * Sum every modifier's flat attribute bonuses onto a base spread, clamped to the
 * `[1, 99]` cap. The cap matters: the engine's soft-cap curves are only
 * evaluated up to attribute value 148 (two-handed 99 STR), so a raw stat must
 * stay at 99 to remain in range once the two-handing bonus is applied.
 */
export function applyAttributeBonuses(
  attributes: Attributes,
  modifiers: readonly Modifier[],
): Attributes {
  const out = { ...attributes };
  for (const modifier of modifiers) {
    if (!modifier.attributeBonuses) continue;
    for (const attr of allAttributes) {
      const bonus = modifier.attributeBonuses[attr];
      if (bonus) out[attr] += bonus;
    }
  }
  for (const attr of allAttributes) {
    out[attr] = Math.min(ATTR_CAP, Math.max(1, out[attr]));
  }
  return out;
}

/**
 * Resolve the per-type AR multiplier for a set of modifiers: within each group
 * the strongest effect wins (mutually-exclusive same-category buffs), then the
 * per-group factors multiply. Returns a map from attack-power type to its
 * multiplier (only types with at least one effect are present; absent types are
 * an implicit ×1).
 */
export function computeTypeMultipliers(
  modifiers: readonly Modifier[],
): Map<AttackPowerType, number> {
  // group -> (type -> strongest amount in that group)
  const groupBest = new Map<string, Map<AttackPowerType, number>>();

  for (const modifier of modifiers) {
    for (const mult of modifier.multipliers ?? []) {
      const types = mult.types ?? allDamageTypes;
      let byType = groupBest.get(mult.group);
      if (!byType) {
        byType = new Map();
        groupBest.set(mult.group, byType);
      }
      for (const type of types) {
        byType.set(type, Math.max(byType.get(type) ?? 0, mult.amount));
      }
    }
  }

  const result = new Map<AttackPowerType, number>();
  for (const byType of groupBest.values()) {
    for (const [type, best] of byType) {
      result.set(type, (result.get(type) ?? 1) * (1 + best));
    }
  }
  return result;
}

/**
 * Apply post-calc percentage multipliers to an attack result, returning a new
 * result. Only types the weapon actually deals are scaled — a multiplier for a
 * type the weapon has no attack power in is a no-op (it never fabricates damage).
 */
export function applyResultMultipliers(
  result: WeaponAttackResult,
  modifiers: readonly Modifier[],
): WeaponAttackResult {
  const mults = computeTypeMultipliers(modifiers);
  if (mults.size === 0) return result;

  const attackPower = { ...result.attackPower };
  for (const [type, factor] of mults) {
    const base = attackPower[type];
    if (base !== undefined) attackPower[type] = base * factor;
  }
  return { ...result, attackPower };
}

export interface ModifiedWeaponAttackOptions extends WeaponAttackOptions {
  /** Talismans / physick tears / buffs to apply. Empty = plain base AR. */
  modifiers?: readonly Modifier[];
}

/**
 * Attack Rating with modifiers applied: flat attribute bonuses feed into scaling
 * before the calc, and percentage multipliers are applied after, per damage
 * type, using the additive-within-group / multiplicative-across-groups model.
 *
 * With no modifiers this is exactly `getWeaponAttack`, so it can be dropped in
 * anywhere the base calc is used without changing existing behaviour.
 */
export function getModifiedWeaponAttack({
  modifiers = [],
  ...options
}: ModifiedWeaponAttackOptions): WeaponAttackResult {
  if (modifiers.length === 0) return getWeaponAttack(options);
  const attributes = applyAttributeBonuses(options.attributes, modifiers);
  const base = getWeaponAttack({ ...options, attributes });
  return applyResultMultipliers(base, modifiers);
}
