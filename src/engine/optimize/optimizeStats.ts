import {
  allAttributes,
  allDamageTypes,
  AttackPowerType,
  type Attribute,
} from "../data/schema.ts";
import { affinityName } from "../data/affinities.ts";
import { weaponTypeName } from "../calc/weaponTypes.ts";
import { getCalcWeapons, resolveUpgradeLevel } from "../calc/weapons.ts";
import type { Attributes, CalcWeapon } from "../calc/types.ts";
import { getModifiedWeaponAttack, type Modifier } from "../modifiers/applyModifiers.ts";
import { scoreResult, sumDamage, type SearchObjective } from "../search/objectives.ts";
import { dedupeByWeapon, passesFilter, type RankFilter } from "../search/search.ts";

/**
 * Stat optimizer. Given a point budget for the five offensive attributes, find
 * the attribute spread that maximizes an objective for a weapon — exactly.
 *
 * Why this is exact and fast: for a fixed weapon at requirements-met stats, the
 * objective score is *additively separable* across attributes —
 *   score = const + Σᵢ gᵢ(attrᵢ)
 * because each damage/status type's scaling is a sum of per-attribute terms, and
 * each term depends on only one attribute (through that type's soft-cap curve).
 * Two-handing only changes how Strength maps to its effective value, so g_str is
 * still a 1-D function of raw Strength. That collapses the ~57M-distribution
 * brute force into a per-attribute resource-allocation DP.
 */

export interface StatBudget {
  /** Total points to distribute across STR/DEX/INT/FAI/ARC. */
  total: number;
  /** Hard per-attribute minimums (e.g. class base, or stats you want to keep). Default 1 each. */
  minimums?: Partial<Attributes>;
}

export interface OptimizeStatsOptions {
  weapon: CalcWeapon;
  objective: SearchObjective;
  budget: StatBudget;
  twoHanding?: boolean;
  upgradeLevel?: number | "max";
  /** Force meeting the weapon's stat requirements (default true). */
  meetRequirements?: boolean;
  /**
   * Talismans / physick tears / buffs to apply while optimizing. Flat attribute
   * bonuses and per-type % multipliers both preserve the objective's additive
   * separability, so the DP stays exact. Requirement minimums are computed on the
   * raw requirements (a flat-stat bonus is a conservative bonus, never assumed to
   * cover a requirement). Default none.
   */
  modifiers?: readonly Modifier[];
}

export interface OptimizeStatsResult {
  attributes: Attributes;
  score: number;
  attackPower: Partial<Record<AttackPowerType, number>>;
  spellScaling: Partial<Record<AttackPowerType, number>>;
  totalAr: number;
  /** Points actually placed in the five offensive attributes. */
  pointsUsed: number;
  /** Points left over (objective-irrelevant — can go to VIG/END instead). */
  pointsLeftover: number;
  /** False if the budget can't even cover minimums + requirements. */
  feasible: boolean;
  requirementsMet: boolean;
}

const MAX_ATTR = 99;

/** Smallest raw Strength whose effective (two-handed) value meets a requirement. */
function minStrengthForRequirement(req: number, twoHanding: boolean): number {
  if (!twoHanding) return req;
  return Math.ceil(req / 1.5);
}

/** Per-attribute hard minimums after applying floors and (optionally) requirements. */
function resolveMinimums(
  weapon: CalcWeapon,
  budget: StatBudget,
  twoHanding: boolean,
  meetRequirements: boolean,
): Attributes {
  const mins: Attributes = { str: 1, dex: 1, int: 1, fai: 1, arc: 1 };
  for (const attr of allAttributes) {
    mins[attr] = Math.max(1, budget.minimums?.[attr] ?? 1);
  }
  if (meetRequirements) {
    for (const attr of allAttributes) {
      const req = weapon.requirements[attr];
      if (req) {
        const needed = attr === "str" ? minStrengthForRequirement(req, twoHanding) : req;
        mins[attr] = Math.max(mins[attr], needed);
      }
    }
  }
  for (const attr of allAttributes) mins[attr] = Math.min(mins[attr], MAX_ATTR);
  return mins;
}

/** The attack-power types an objective actually scores. */
function scoredTypes(objective: SearchObjective): AttackPowerType[] {
  switch (objective.kind) {
    case "totalAr":
      return [...allDamageTypes];
    case "damageType":
    case "status":
      return [objective.type];
    case "spellScaling":
      // Spell scaling is computed per damage type; a pinned type narrows it.
      return objective.type !== undefined ? [objective.type] : [...allDamageTypes];
  }
}

/**
 * Attributes that could plausibly affect the objective for this weapon: those
 * that scale at least one scored type. Probing only these (instead of all five)
 * is the main speedup for whole-dataset optimization, and it's loss-free — any
 * attribute not here contributes a flat zero anyway.
 */
function candidateAttributes(weapon: CalcWeapon, objective: SearchObjective): Attribute[] {
  const types = scoredTypes(objective);
  const result: Attribute[] = [];
  for (const attr of allAttributes) {
    if (types.some((t) => weapon.attackElementCorrect[t]?.[attr])) result.push(attr);
  }
  return result;
}

function scoreAttributes(
  weapon: CalcWeapon,
  attributes: Attributes,
  twoHanding: boolean,
  level: number,
  objective: SearchObjective,
  modifiers: readonly Modifier[],
): number {
  return scoreResult(
    getModifiedWeaponAttack({ weapon, attributes, twoHanding, upgradeLevel: level, modifiers }),
    objective,
  );
}

/**
 * Find the optimal offensive-attribute spread for one weapon within a budget.
 */
export function optimizeWeaponStats(options: OptimizeStatsOptions): OptimizeStatsResult {
  const { weapon, objective, budget, twoHanding = false, meetRequirements = true } = options;
  const modifiers = options.modifiers ?? [];
  const level = resolveUpgradeLevel(weapon, options.upgradeLevel ?? "max");

  const mins = resolveMinimums(weapon, budget, twoHanding, meetRequirements);
  const minSum = allAttributes.reduce((s, a) => s + mins[a], 0);

  // Infeasible: budget can't cover the forced minimums.
  if (minSum > budget.total) {
    return finalize(weapon, mins, twoHanding, level, objective, modifiers, false);
  }

  const extra = budget.total - minSum;

  // Build per-attribute marginal-contribution tables relative to the minimum
  // spread (valid because the objective is separable in this region).
  const baseScore = scoreAttributes(weapon, mins, twoHanding, level, objective, modifiers);

  interface AttrTable {
    attr: Attribute;
    cap: number; // max extra points (99 - min)
    delta: number[]; // delta[a] = score gain from putting `a` extra points here
  }
  const tables: AttrTable[] = [];
  for (const attr of candidateAttributes(weapon, objective)) {
    const cap = MAX_ATTR - mins[attr];
    if (cap <= 0) continue;
    const delta: number[] = [0];
    let varies = false;
    for (let a = 1; a <= cap; a++) {
      const probe: Attributes = { ...mins, [attr]: mins[attr] + a };
      const gain = scoreAttributes(weapon, probe, twoHanding, level, objective, modifiers) - baseScore;
      delta.push(gain);
      if (gain > 1e-9) varies = true;
    }
    if (varies) tables.push({ attr, cap, delta });
  }

  // Resource-allocation DP: maximize Σ delta_i(a_i) with Σ a_i ≤ extra.
  const alloc = allocate(tables, extra);

  const attributes: Attributes = { ...mins };
  let used = 0;
  for (const attr of allAttributes) {
    const add = alloc[attr] ?? 0;
    attributes[attr] = mins[attr] + add;
    used += add;
  }

  return finalize(weapon, attributes, twoHanding, level, objective, modifiers, true, minSum + used, budget.total);
}

/** Exact DP over separable per-attribute gain tables. */
function allocate(
  tables: { attr: Attribute; cap: number; delta: number[] }[],
  extra: number,
): Partial<Record<Attribute, number>> {
  const result: Partial<Record<Attribute, number>> = {};
  if (tables.length === 0 || extra <= 0) return result;

  // dp[p] = best total gain using p extra points among processed attributes.
  let dp = new Float64Array(extra + 1);
  const choice: number[][] = []; // choice[i][p] = points given to attr i at budget p

  for (let i = 0; i < tables.length; i++) {
    const { cap, delta } = tables[i]!;
    const ndp = new Float64Array(extra + 1);
    const pick = new Int16Array(extra + 1);
    for (let p = 0; p <= extra; p++) {
      let best = dp[p]!; // give 0 to this attr
      let bestA = 0;
      const maxA = Math.min(cap, p);
      for (let a = 1; a <= maxA; a++) {
        const cand = dp[p - a]! + delta[a]!;
        if (cand > best + 1e-12) {
          best = cand;
          bestA = a;
        }
      }
      ndp[p] = best;
      pick[p] = bestA;
    }
    dp = ndp;
    choice.push(Array.from(pick));
  }

  // Best total points to actually use (≤ extra; extra beyond useful is leftover).
  let bestP = 0;
  for (let p = 1; p <= extra; p++) if (dp[p]! > dp[bestP]!) bestP = p;

  // Reconstruct allocations.
  let p = bestP;
  for (let i = tables.length - 1; i >= 0; i--) {
    const a = choice[i]![p]!;
    if (a > 0) result[tables[i]!.attr] = a;
    p -= a;
  }
  return result;
}

function finalize(
  weapon: CalcWeapon,
  attributes: Attributes,
  twoHanding: boolean,
  level: number,
  objective: SearchObjective,
  modifiers: readonly Modifier[],
  feasible: boolean,
  pointsUsed = allAttributes.reduce((s, a) => s + attributes[a], 0),
  budgetTotal = pointsUsed,
): OptimizeStatsResult {
  const attack = getModifiedWeaponAttack({ weapon, attributes, twoHanding, upgradeLevel: level, modifiers });
  return {
    attributes,
    score: scoreResult(attack, objective),
    attackPower: attack.attackPower,
    spellScaling: attack.spellScaling,
    totalAr: sumDamage(attack),
    pointsUsed,
    pointsLeftover: Math.max(0, budgetTotal - pointsUsed),
    feasible,
    requirementsMet: attack.ineffectiveAttributes.length === 0,
  };
}

// ---------------------------------------------------------------------------
// Across many weapons
// ---------------------------------------------------------------------------

export interface OptimizeAcrossOptions {
  objective: SearchObjective;
  budget: StatBudget;
  twoHanding?: boolean;
  upgradeLevel?: number | "max";
  meetRequirements?: boolean;
  filter?: RankFilter;
  /** Talismans / physick tears / buffs to apply while optimizing. Default none. */
  modifiers?: readonly Modifier[];
  /** Collapse to the single best affinity per base weapon before the limit. Default false. */
  bestPerWeapon?: boolean;
  limit?: number;
}

export interface OptimizedWeapon extends OptimizeStatsResult {
  rank: number;
  name: string;
  weaponName: string;
  affinityId: number;
  affinityName: string;
  weaponType: number;
  weaponTypeName: string;
  upgradeLevel: number;
}

/**
 * Optimize the stat spread for every (filtered) weapon and rank the results, so
 * the user sees the best achievable build per weapon at their level — and which
 * weapon wins overall.
 */
export function optimizeAcrossWeapons(options: OptimizeAcrossOptions): OptimizedWeapon[] {
  const { objective, budget, twoHanding = false, meetRequirements = true, limit = 25 } = options;
  const filter = options.filter ?? {};

  const out: OptimizedWeapon[] = [];
  for (const weapon of getCalcWeapons()) {
    if (!passesFilter(weapon, objective, filter)) continue;

    const result = optimizeWeaponStats({
      weapon,
      objective,
      budget,
      twoHanding,
      upgradeLevel: options.upgradeLevel,
      meetRequirements,
      modifiers: options.modifiers,
    });
    if (!result.feasible || result.score <= 0) continue;
    if (filter.requireRequirementsMet && !result.requirementsMet) continue;

    const level = resolveUpgradeLevel(weapon, options.upgradeLevel ?? "max");

    out.push({
      ...result,
      rank: 0,
      name: weapon.name,
      weaponName: weapon.weaponName,
      affinityId: weapon.affinityId,
      affinityName: affinityName(weapon.affinityId),
      weaponType: weapon.weaponType,
      weaponTypeName: weaponTypeName(weapon.weaponType),
      upgradeLevel: level,
    });
  }

  out.sort((a, b) => b.score - a.score);
  const rows = options.bestPerWeapon ? dedupeByWeapon(out) : out;
  return rows.slice(0, limit).map((r, i) => ({ ...r, rank: i + 1 }));
}
