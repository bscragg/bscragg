import { AttackPowerType } from "../data/schema.ts";
import type { Modifier } from "./applyModifiers.ts";

/**
 * Vendored modifier dataset — talismans, Wondrous Physick tears, and buffs that
 * affect Attack Rating, for vanilla patch 1.14 (post Shadow of the Erdtree).
 *
 * Values are hand-transcribed and cross-checked against the community wiki
 * (Fextralife); see ATTRIBUTION.md. This covers every modifier that the engine
 * can represent faithfully — i.e. **flat attribute bonuses** and **percentage
 * AR multipliers on normal attacks**.
 *
 * Stacking (enforced by `applyModifiers.ts`): within a `group` only the
 * strongest effect applies (same-category buffs overwrite in game); per-group
 * factors multiply. Mutually-exclusive in-game pairs share a group (e.g. the two
 * Golden Vows; Flame Grant Me Strength / Howl of Shabriri); everything else gets
 * its own group so it multiplies.
 *
 * Deliberately NOT included, because the current model can't represent them
 * faithfully (PvE values are not simple per-type constants on a normal attack):
 *   - Weapon-buff spells that add flat elemental damage (Bloodflame Blade,
 *     Scholar's Armament, Black Flame Blade, Lightning/Electrify Armament, …)
 *     and all greases.
 *   - On-hit ramping effects (Winged Sword Insignia, Rotten Winged Sword
 *     Insignia, Millicent's Prosthesis, Thorny/Spiked cracked tears).
 *   - Charged- / skill- / move-specific talismans (Shard of Alexander,
 *     Godfrey Icon, Axe/Claw/Curved Sword/Spear/Roar/Lance talismans, the DLC
 *     dash/kick/throwable/bow talismans).
 * Conditional effects that DO apply to normal attacks are included, with the
 * trigger noted in `condition`.
 */

const SRC = "Elden Ring community wiki (Fextralife), vanilla patch 1.14";

export const MODIFIERS: readonly Modifier[] = [
  // --- Talismans: flat attribute bonuses -----------------------------------
  {
    id: "starscourge-heirloom",
    name: "Starscourge Heirloom",
    kind: "talisman",
    attributeBonuses: { str: 5 },
    source: SRC,
  },
  {
    id: "prosthesis-wearer-heirloom",
    name: "Prosthesis-Wearer Heirloom",
    kind: "talisman",
    attributeBonuses: { dex: 5 },
    source: SRC,
  },
  {
    id: "stargazer-heirloom",
    name: "Stargazer Heirloom",
    kind: "talisman",
    attributeBonuses: { int: 5 },
    source: SRC,
  },
  {
    id: "two-fingers-heirloom",
    name: "Two Fingers Heirloom",
    kind: "talisman",
    attributeBonuses: { fai: 5 },
    source: SRC,
  },
  {
    id: "outer-god-heirloom",
    name: "Outer God Heirloom",
    kind: "talisman",
    attributeBonuses: { arc: 5 },
    dlc: true,
    source: SRC,
  },
  {
    id: "radagons-soreseal",
    name: "Radagon's Soreseal",
    kind: "talisman",
    attributeBonuses: { str: 5, dex: 5 },
    drawback: "+15% damage taken (also raises Vigor & Endurance)",
    source: SRC,
  },
  {
    id: "marikas-soreseal",
    name: "Marika's Soreseal",
    kind: "talisman",
    attributeBonuses: { int: 5, fai: 5, arc: 5 },
    drawback: "+15% damage taken (also raises Mind)",
    source: SRC,
  },
  {
    id: "radagons-scarseal",
    name: "Radagon's Scarseal",
    kind: "talisman",
    attributeBonuses: { str: 3, dex: 3 },
    drawback: "+10% damage taken (also raises Vigor & Endurance)",
    source: SRC,
  },
  {
    id: "marikas-scarseal",
    name: "Marika's Scarseal",
    kind: "talisman",
    attributeBonuses: { int: 3, fai: 3, arc: 3 },
    drawback: "+10% damage taken (also raises Mind)",
    source: SRC,
  },

  // --- Talismans: percentage AR --------------------------------------------
  {
    id: "ritual-sword-talisman",
    name: "Ritual Sword Talisman",
    kind: "talisman",
    multipliers: [{ group: "ritual-sword", amount: 0.1 }],
    condition: "while HP is at maximum",
    source: SRC,
  },
  {
    id: "magic-scorpion-charm",
    name: "Magic Scorpion Charm",
    kind: "talisman",
    multipliers: [{ group: "scorpion-magic", amount: 0.12, types: [AttackPowerType.MAGIC] }],
    drawback: "+10% physical damage taken",
    source: SRC,
  },
  {
    id: "fire-scorpion-charm",
    name: "Fire Scorpion Charm",
    kind: "talisman",
    multipliers: [{ group: "scorpion-fire", amount: 0.12, types: [AttackPowerType.FIRE] }],
    drawback: "+10% physical damage taken",
    source: SRC,
  },
  {
    id: "lightning-scorpion-charm",
    name: "Lightning Scorpion Charm",
    kind: "talisman",
    multipliers: [{ group: "scorpion-lightning", amount: 0.12, types: [AttackPowerType.LIGHTNING] }],
    drawback: "+10% physical damage taken",
    source: SRC,
  },
  {
    id: "sacred-scorpion-charm",
    name: "Sacred Scorpion Charm",
    kind: "talisman",
    multipliers: [{ group: "scorpion-holy", amount: 0.12, types: [AttackPowerType.HOLY] }],
    drawback: "+10% physical damage taken",
    source: SRC,
  },
  {
    id: "lord-of-bloods-exultation",
    name: "Lord of Blood's Exultation",
    kind: "talisman",
    // Exultations have distinct triggers; whether multiple stack with each other
    // is undocumented, so each is its own (multiplicative) group.
    multipliers: [{ group: "exultation-blood", amount: 0.2 }],
    condition: "~20s after blood loss procs nearby",
    source: SRC,
  },
  {
    id: "kindred-of-rots-exultation",
    name: "Kindred of Rot's Exultation",
    kind: "talisman",
    multipliers: [{ group: "exultation-rot", amount: 0.2 }],
    condition: "~20s after poison or Scarlet Rot procs nearby",
    source: SRC,
  },
  {
    id: "aged-ones-exultation",
    name: "Aged One's Exultation",
    kind: "talisman",
    multipliers: [{ group: "exultation-madness", amount: 0.2 }],
    condition: "~30s after madness procs nearby",
    dlc: true,
    source: SRC,
  },
  {
    id: "two-handed-sword-talisman",
    name: "Two-Handed Sword Talisman",
    kind: "talisman",
    multipliers: [{ group: "two-handed-talisman", amount: 0.15, types: [AttackPowerType.PHYSICAL] }],
    condition: "while two-handing (normal attacks; not skills, spells or crits)",
    dlc: true,
    source: SRC,
  },
  {
    id: "crusade-insignia",
    name: "Crusade Insignia",
    kind: "talisman",
    multipliers: [{ group: "crusade-insignia", amount: 0.15 }],
    condition: "~20s after defeating a nearby enemy",
    dlc: true,
    source: SRC,
  },

  // --- Wondrous Physick: stat "knot" crystal tears (flat attributes) -------
  {
    id: "strength-knot-crystal-tear",
    name: "Strength-knot Crystal Tear",
    kind: "physick",
    attributeBonuses: { str: 10 },
    condition: "while the physick effect is active (~3 min)",
    source: SRC,
  },
  {
    id: "dexterity-knot-crystal-tear",
    name: "Dexterity-knot Crystal Tear",
    kind: "physick",
    attributeBonuses: { dex: 10 },
    condition: "while the physick effect is active (~3 min)",
    source: SRC,
  },
  {
    id: "intelligence-knot-crystal-tear",
    name: "Intelligence-knot Crystal Tear",
    kind: "physick",
    attributeBonuses: { int: 10 },
    condition: "while the physick effect is active (~3 min)",
    source: SRC,
  },
  {
    id: "faith-knot-crystal-tear",
    name: "Faith-knot Crystal Tear",
    kind: "physick",
    attributeBonuses: { fai: 10 },
    condition: "while the physick effect is active (~3 min)",
    source: SRC,
  },

  // --- Wondrous Physick: cracked tears (percentage AR) ---------------------
  {
    id: "bloodsucking-cracked-tear",
    name: "Bloodsucking Cracked Tear",
    kind: "physick",
    multipliers: [{ group: "physick-bloodsucking", amount: 0.2 }],
    condition: "while the physick effect is active (~3 min)",
    drawback: "drains your HP while active",
    dlc: true,
    source: SRC,
  },
  {
    id: "magic-shrouding-cracked-tear",
    name: "Magic-Shrouding Cracked Tear",
    kind: "physick",
    multipliers: [{ group: "physick-shroud-magic", amount: 0.2, types: [AttackPowerType.MAGIC] }],
    condition: "while the physick effect is active (~3 min)",
    source: SRC,
  },
  {
    id: "flame-shrouding-cracked-tear",
    name: "Flame-Shrouding Cracked Tear",
    kind: "physick",
    multipliers: [{ group: "physick-shroud-fire", amount: 0.2, types: [AttackPowerType.FIRE] }],
    condition: "while the physick effect is active (~3 min)",
    source: SRC,
  },
  {
    id: "lightning-shrouding-cracked-tear",
    name: "Lightning-Shrouding Cracked Tear",
    kind: "physick",
    multipliers: [
      { group: "physick-shroud-lightning", amount: 0.2, types: [AttackPowerType.LIGHTNING] },
    ],
    condition: "while the physick effect is active (~3 min)",
    source: SRC,
  },
  {
    id: "holy-shrouding-cracked-tear",
    name: "Holy-Shrouding Cracked Tear",
    kind: "physick",
    multipliers: [{ group: "physick-shroud-holy", amount: 0.2, types: [AttackPowerType.HOLY] }],
    condition: "while the physick effect is active (~3 min)",
    source: SRC,
  },

  // --- Buffs: incantations -------------------------------------------------
  {
    id: "golden-vow",
    name: "Golden Vow (incantation)",
    kind: "buff",
    multipliers: [{ group: "aura-golden-vow", amount: 0.15 }],
    condition: "self & allies, ~80s",
    source: SRC,
  },
  {
    id: "golden-vow-ash",
    name: "Golden Vow (Ash of War)",
    kind: "buff",
    // Same Aura category as the incantation — mutually exclusive (the incantation
    // is strictly stronger), so they share a group and the best one wins.
    multipliers: [{ group: "aura-golden-vow", amount: 0.115 }],
    condition: "self & allies, ~45s (weaker than the incantation)",
    source: SRC,
  },
  {
    id: "flame-grant-me-strength",
    name: "Flame, Grant Me Strength",
    kind: "buff",
    multipliers: [
      {
        group: "body-buff",
        amount: 0.2,
        types: [AttackPowerType.PHYSICAL, AttackPowerType.FIRE],
      },
    ],
    condition: "incantation active, ~30s",
    source: SRC,
  },
  {
    id: "howl-of-shabriri",
    name: "Howl of Shabriri",
    kind: "buff",
    // Body buff, same category as Flame Grant Me Strength — they don't stack.
    multipliers: [{ group: "body-buff", amount: 0.25 }],
    condition: "incantation active, ~40s",
    drawback: "+30% damage taken; builds your own madness",
    source: SRC,
  },
];

const byId = new Map(MODIFIERS.map((m) => [m.id, m]));

/** Look up a modifier by id. */
export function getModifier(id: string): Modifier | undefined {
  return byId.get(id);
}

/** Resolve a list of ids to modifiers, dropping any unknown ids. */
export function getModifiers(ids: readonly string[]): Modifier[] {
  return ids.map((id) => byId.get(id)).filter((m): m is Modifier => m !== undefined);
}

/** All modifiers of a given kind, in declaration order. */
export function modifiersByKind(kind: Modifier["kind"]): Modifier[] {
  return MODIFIERS.filter((m) => m.kind === kind);
}
