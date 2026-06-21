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
 * The multiplier stacking model — the standard Elden Ring rule, and the design
 * the handoff specifies — is **additive within a group, multiplicative across
 * groups**. Each multiplier carries a `group` tag: effects sharing a group add
 * together, then the per-group totals multiply. For a damage type `t`:
 *
 *     multiplier(t) = Π over groups g ( 1 + Σ over effects in g affecting t )
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
   * Stacking group. Effects with the same `group` are summed (additive); the
   * resulting per-group factors multiply across different groups. Use the same
   * group for in-game effects that share a category (and so don't stack), and
   * distinct groups for effects that stack multiplicatively.
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
 * Resolve the per-type AR multiplier for a set of modifiers using the
 * additive-within-group / multiplicative-across-groups model. Returns a map from
 * attack-power type to its multiplier (only types with at least one effect are
 * present; absent types are an implicit ×1).
 */
export function computeTypeMultipliers(
  modifiers: readonly Modifier[],
): Map<AttackPowerType, number> {
  // group -> (type -> summed additive amount)
  const groupSums = new Map<string, Map<AttackPowerType, number>>();

  for (const modifier of modifiers) {
    for (const mult of modifier.multipliers ?? []) {
      const types = mult.types ?? allDamageTypes;
      let byType = groupSums.get(mult.group);
      if (!byType) {
        byType = new Map();
        groupSums.set(mult.group, byType);
      }
      for (const type of types) {
        byType.set(type, (byType.get(type) ?? 0) + mult.amount);
      }
    }
  }

  const result = new Map<AttackPowerType, number>();
  for (const byType of groupSums.values()) {
    for (const [type, sum] of byType) {
      result.set(type, (result.get(type) ?? 1) * (1 + sum));
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
