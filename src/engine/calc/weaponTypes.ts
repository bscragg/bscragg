/**
 * Weapon category ids, as used by the regulation data's `weaponType` field.
 * Ported from ThomasJClark/elden-ring-weapon-calculator (MIT). See ATTRIBUTION.md.
 */
export const WeaponType = {
  DAGGER: 1,
  STRAIGHT_SWORD: 3,
  GREATSWORD: 5,
  COLOSSAL_SWORD: 7,
  CURVED_SWORD: 9,
  CURVED_GREATSWORD: 11,
  KATANA: 13,
  TWINBLADE: 14,
  THRUSTING_SWORD: 15,
  HEAVY_THRUSTING_SWORD: 16,
  AXE: 17,
  GREATAXE: 19,
  HAMMER: 21,
  GREAT_HAMMER: 23,
  FLAIL: 24,
  SPEAR: 25,
  GREAT_SPEAR: 28,
  HALBERD: 29,
  REAPER: 31,
  FIST: 35,
  CLAW: 37,
  WHIP: 39,
  COLOSSAL_WEAPON: 41,
  LIGHT_BOW: 50,
  BOW: 51,
  GREATBOW: 53,
  CROSSBOW: 55,
  BALLISTA: 56,
  GLINTSTONE_STAFF: 57,
  DUAL_CATALYST: 59,
  SACRED_SEAL: 61,
  SMALL_SHIELD: 65,
  MEDIUM_SHIELD: 67,
  GREATSHIELD: 69,
  TORCH: 87,
  HAND_TO_HAND: 88,
  PERFUME_BOTTLE: 89,
  THRUSTING_SHIELD: 90,
  THROWING_BLADE: 91,
  BACKHAND_BLADE: 92,
  LIGHT_GREATSWORD: 93,
  GREAT_KATANA: 94,
  BEAST_CLAW: 95,
} as const;

export type WeaponType = (typeof WeaponType)[keyof typeof WeaponType];

/** Bows and ballistae can only be two-handed, so they always get the 2H bonus. */
export const alwaysTwoHandedWeaponTypes: ReadonlySet<number> = new Set([
  WeaponType.LIGHT_BOW,
  WeaponType.BOW,
  WeaponType.GREATBOW,
  WeaponType.BALLISTA,
]);

/** Human-readable weapon-category names. */
export const weaponTypeNames: ReadonlyMap<number, string> = new Map([
  [WeaponType.DAGGER, "Dagger"],
  [WeaponType.STRAIGHT_SWORD, "Straight Sword"],
  [WeaponType.GREATSWORD, "Greatsword"],
  [WeaponType.COLOSSAL_SWORD, "Colossal Sword"],
  [WeaponType.CURVED_SWORD, "Curved Sword"],
  [WeaponType.CURVED_GREATSWORD, "Curved Greatsword"],
  [WeaponType.KATANA, "Katana"],
  [WeaponType.TWINBLADE, "Twinblade"],
  [WeaponType.THRUSTING_SWORD, "Thrusting Sword"],
  [WeaponType.HEAVY_THRUSTING_SWORD, "Heavy Thrusting Sword"],
  [WeaponType.AXE, "Axe"],
  [WeaponType.GREATAXE, "Greataxe"],
  [WeaponType.HAMMER, "Hammer"],
  [WeaponType.GREAT_HAMMER, "Great Hammer"],
  [WeaponType.FLAIL, "Flail"],
  [WeaponType.SPEAR, "Spear"],
  [WeaponType.GREAT_SPEAR, "Great Spear"],
  [WeaponType.HALBERD, "Halberd"],
  [WeaponType.REAPER, "Reaper"],
  [WeaponType.FIST, "Fist"],
  [WeaponType.CLAW, "Claw"],
  [WeaponType.WHIP, "Whip"],
  [WeaponType.COLOSSAL_WEAPON, "Colossal Weapon"],
  [WeaponType.LIGHT_BOW, "Light Bow"],
  [WeaponType.BOW, "Bow"],
  [WeaponType.GREATBOW, "Greatbow"],
  [WeaponType.CROSSBOW, "Crossbow"],
  [WeaponType.BALLISTA, "Ballista"],
  [WeaponType.GLINTSTONE_STAFF, "Glintstone Staff"],
  [WeaponType.DUAL_CATALYST, "Dual Catalyst"],
  [WeaponType.SACRED_SEAL, "Sacred Seal"],
  [WeaponType.SMALL_SHIELD, "Small Shield"],
  [WeaponType.MEDIUM_SHIELD, "Medium Shield"],
  [WeaponType.GREATSHIELD, "Greatshield"],
  [WeaponType.TORCH, "Torch"],
  [WeaponType.HAND_TO_HAND, "Hand-to-Hand"],
  [WeaponType.PERFUME_BOTTLE, "Perfume Bottle"],
  [WeaponType.THRUSTING_SHIELD, "Thrusting Shield"],
  [WeaponType.THROWING_BLADE, "Throwing Blade"],
  [WeaponType.BACKHAND_BLADE, "Backhand Blade"],
  [WeaponType.LIGHT_GREATSWORD, "Light Greatsword"],
  [WeaponType.GREAT_KATANA, "Great Katana"],
  [WeaponType.BEAST_CLAW, "Beast Claw"],
]);

export function weaponTypeName(id: number): string {
  return weaponTypeNames.get(id) ?? `Type ${id}`;
}

/** Catalysts (cast spells; ranked by spell scaling, not AR). */
export const catalystWeaponTypes: ReadonlySet<number> = new Set([
  WeaponType.GLINTSTONE_STAFF,
  WeaponType.DUAL_CATALYST,
  WeaponType.SACRED_SEAL,
]);

export const staffWeaponTypes: ReadonlySet<number> = new Set([
  WeaponType.GLINTSTONE_STAFF,
  WeaponType.DUAL_CATALYST,
]);

export const sealWeaponTypes: ReadonlySet<number> = new Set([
  WeaponType.SACRED_SEAL,
  WeaponType.DUAL_CATALYST,
]);

/** Ranged armaments. */
export const rangedWeaponTypes: ReadonlySet<number> = new Set([
  WeaponType.LIGHT_BOW,
  WeaponType.BOW,
  WeaponType.GREATBOW,
  WeaponType.CROSSBOW,
  WeaponType.BALLISTA,
]);

/** Non-offensive / utility categories excluded from melee AR ranking by default. */
export const nonMeleeWeaponTypes: ReadonlySet<number> = new Set([
  ...catalystWeaponTypes,
  ...rangedWeaponTypes,
  WeaponType.SMALL_SHIELD,
  WeaponType.MEDIUM_SHIELD,
  WeaponType.GREATSHIELD,
  WeaponType.THRUSTING_SHIELD,
  WeaponType.TORCH,
]);

/** True for hand-held melee armaments (everything that isn't a catalyst, bow, shield, or torch). */
export function isMeleeWeaponType(id: number): boolean {
  return !nonMeleeWeaponTypes.has(id);
}
