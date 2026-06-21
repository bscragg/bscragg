import type { Attribute, AttackPowerType } from "../data/schema.ts";

/** A full 5-attribute spread for a character. */
export type Attributes = Record<Attribute, number>;

/**
 * For each damage/status type, which attributes scale it. A value of `true`
 * means "use the weapon's scaling coefficient as-is"; a number is an override
 * ratio (rare). Mirrors the reference `AttackElementCorrect`.
 */
export type CalcAttackElementCorrect = Partial<
  Record<AttackPowerType, Partial<Record<Attribute, number | true>>>
>;

/**
 * A weapon variant denormalized into calc-ready form: base attack and scaling
 * are expanded per upgrade level, and the soft-cap curves are pre-evaluated
 * into lookup arrays indexed by attribute value. Produced by `preprocess.ts`.
 */
export interface CalcWeapon {
  /** Full name including affinity, e.g. "Heavy Longsword". */
  name: string;
  /** Base name without affinity, e.g. "Longsword". */
  weaponName: string;
  affinityId: number;
  weaponType: number;
  requirements: Partial<Record<Attribute, number>>;
  /** Base attack power per type, indexed by upgrade level (0..maxUpgradeLevel). */
  attack: Partial<Record<AttackPowerType, number>>[];
  /** Scaling coefficient per attribute, indexed by upgrade level. */
  attributeScaling: Partial<Record<Attribute, number>>[];
  attackElementCorrect: CalcAttackElementCorrect;
  /** Pre-evaluated soft-cap curve per attack-power type; index by attribute value. */
  calcCorrectGraphs: Record<AttackPowerType, number[]>;
  paired?: boolean;
  sorceryTool?: boolean;
  incantationTool?: boolean;
  dlc: boolean;
  /** Highest valid upgrade level (+25 for normal, +10 for somber/unique). */
  maxUpgradeLevel: number;
}

export interface WeaponAttackResult {
  upgradeLevel: number;
  /** AR contribution per damage type and status buildup per status type. */
  attackPower: Partial<Record<AttackPowerType, number>>;
  /** Spell scaling per damage type (only populated for staffs/seals). */
  spellScaling: Partial<Record<AttackPowerType, number>>;
  /** Requirement attributes the character does not meet. */
  ineffectiveAttributes: Attribute[];
  /** Damage types that took the unmet-requirement penalty. */
  ineffectiveAttackPowerTypes: AttackPowerType[];
}
