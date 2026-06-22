export {
  applyAttributeBonuses,
  applyFlatDamage,
  applyResultMultipliers,
  computeTypeMultipliers,
  getModifiedWeaponAttack,
  type Modifier,
  type ModifierKind,
  type ModifierMultiplier,
  type ModifiedWeaponAttackOptions,
  type ScalingDamage,
} from "./applyModifiers.ts";
export {
  MODIFIERS,
  getModifier,
  getModifiers,
  resolveModifiers,
  modifiersByKind,
} from "./modifiers-data.ts";
