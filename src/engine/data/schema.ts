/**
 * Type definitions for the vendored Elden Ring regulation data.
 *
 * Source: ThomasJClark/elden-ring-weapon-calculator (MIT). These types mirror the
 * exact JSON shape of `regulation-vanilla-v1.14.json` as extracted from the game's
 * regulation.bin. See ATTRIBUTION.md.
 *
 * Vanilla game patch: 1.14 (post Shadow of the Erdtree).
 */

/** The five attributes that can scale weapon damage. */
export type Attribute = "str" | "dex" | "int" | "fai" | "arc";
export const allAttributes: readonly Attribute[] = ["str", "dex", "int", "fai", "arc"];

/**
 * Damage and status "attack power" types, by their in-game numeric id.
 * 0-4 are damage; 5-11 are status buildup.
 */
export const AttackPowerType = {
  PHYSICAL: 0,
  MAGIC: 1,
  FIRE: 2,
  LIGHTNING: 3,
  HOLY: 4,
  POISON: 5,
  SCARLET_ROT: 6,
  BLEED: 7,
  FROST: 8,
  SLEEP: 9,
  MADNESS: 10,
  DEATH_BLIGHT: 11,
} as const;
export type AttackPowerType = (typeof AttackPowerType)[keyof typeof AttackPowerType];

export const allDamageTypes: readonly AttackPowerType[] = [
  AttackPowerType.PHYSICAL,
  AttackPowerType.MAGIC,
  AttackPowerType.FIRE,
  AttackPowerType.LIGHTNING,
  AttackPowerType.HOLY,
];

export const allStatusTypes: readonly AttackPowerType[] = [
  AttackPowerType.POISON,
  AttackPowerType.SCARLET_ROT,
  AttackPowerType.BLEED,
  AttackPowerType.FROST,
  AttackPowerType.SLEEP,
  AttackPowerType.MADNESS,
  AttackPowerType.DEATH_BLIGHT,
];

/**
 * A single piecewise stage of a "calc correct" / soft-cap saturation curve.
 * `maxVal` is the attribute value where this stage ends; `maxGrowVal` is the
 * fraction of total scaling reached at that point; `adjPt` bends the curve
 * between stages (the soft-cap diminishing-returns behaviour).
 */
export interface CalcCorrectStage {
  maxVal: number;
  maxGrowVal: number;
  adjPt: number;
}
export type CalcCorrectGraph = CalcCorrectStage[];

/**
 * For one weapon's `attackElementCorrectId`, maps each damage-type id (as a
 * string key) to the set of attributes that scale it. The value per attribute
 * is `true` (scale using the calc-correct graph) or a numeric override.
 */
export type AttackElementCorrect = Record<string, Partial<Record<Attribute, boolean | number>>>;

/** One upgrade level's multipliers, indexed 0..25 (or 0..10 for somber). */
export interface ReinforceLevel {
  /** Multiplier on base attack, keyed by damage-type id. */
  attack: Record<string, number>;
  /** Multiplier on attribute scaling. */
  attributeScaling: Record<string, number>;
  /** Which status sp-effect slot applies at this level (offset into the weapon's ids). */
  statusSpEffectId1?: number;
  statusSpEffectId2?: number;
}
export type ReinforceType = ReinforceLevel[];

/** Status buildup values for one sp-effect param, keyed by status-type id. */
export type StatusSpEffectParam = Record<string, number>;

/** A single weapon-and-affinity variant. */
export interface RawWeapon {
  name: string;
  weaponName: string;
  /** -1 = unique/somber (no infusions); 0..12 = an infusable affinity. */
  affinityId: number;
  weaponType: number;
  /** Base attack at +0 as [damageTypeId, value] pairs. */
  attack: [number, number][];
  attributeScaling: [Attribute, number][];
  attackElementCorrectId: number;
  reinforceTypeId: number;
  requirements: Partial<Record<Attribute, number>>;
  /** Maps a damage-type id to the calc-correct graph id used for its scaling. */
  calcCorrectGraphIds: Record<string, number>;
  /** Up to 3 status sp-effect param ids selected per upgrade level; 0 = none. */
  statusSpEffectParamIds?: number[];
  paired?: boolean;
  sorceryTool?: boolean;
  incantationTool?: boolean;
  dlc?: boolean;
  url?: string;
}

/** The full validated regulation dataset. */
export interface Regulation {
  calcCorrectGraphs: Record<string, CalcCorrectGraph>;
  attackElementCorrects: Record<string, AttackElementCorrect>;
  reinforceTypes: Record<string, ReinforceType>;
  statusSpEffectParams: Record<string, StatusSpEffectParam>;
  scalingTiers: [number, string][];
  weapons: RawWeapon[];
}
