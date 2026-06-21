import { AttackPowerType } from "../data/schema.ts";
import type { Modifier } from "./applyModifiers.ts";

/**
 * Vendored modifier dataset — talismans, Wondrous Physick tears, and buffs that
 * affect Attack Rating, for vanilla patch 1.14 (post Shadow of the Erdtree).
 *
 * Values are sourced from the community knowledge base (Fextralife / the
 * community calculator spreadsheets); see ATTRIBUTION.md. This is a curated
 * starter set covering the common AR-relevant gear, not the full game catalogue
 * — it is deliberately easy to extend: a modifier is plain data and its
 * `group` (the stacking category) is just a string.
 *
 * Stacking model (enforced by `applyModifiers.ts`): effects sharing a `group`
 * add; per-group totals multiply. Each entry below is grouped so that effects
 * which stack multiplicatively in game sit in *distinct* groups.
 *
 * Only base-attack AR effects are included. Conditional/skill-only multipliers
 * (e.g. Shard of Alexander, which boosts skills only) are omitted so the numbers
 * stay honest for ordinary attacks; flat-stat and unconditional % effects carry
 * any caveat in `condition` / `drawback` for the UI to surface.
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
    multipliers: [{ group: "scorpion-charm", amount: 0.12, types: [AttackPowerType.MAGIC] }],
    drawback: "+10% damage taken",
    source: SRC,
  },
  {
    id: "fire-scorpion-charm",
    name: "Fire Scorpion Charm",
    kind: "talisman",
    multipliers: [{ group: "scorpion-charm", amount: 0.12, types: [AttackPowerType.FIRE] }],
    drawback: "+10% damage taken",
    source: SRC,
  },
  {
    id: "lightning-scorpion-charm",
    name: "Lightning Scorpion Charm",
    kind: "talisman",
    multipliers: [{ group: "scorpion-charm", amount: 0.12, types: [AttackPowerType.LIGHTNING] }],
    drawback: "+10% damage taken",
    source: SRC,
  },
  {
    id: "sacred-scorpion-charm",
    name: "Sacred Scorpion Charm",
    kind: "talisman",
    multipliers: [{ group: "scorpion-charm", amount: 0.12, types: [AttackPowerType.HOLY] }],
    drawback: "+10% damage taken",
    source: SRC,
  },

  // --- Wondrous Physick: cracked tears -------------------------------------
  {
    id: "bloodsucking-cracked-tear",
    name: "Bloodsucking Cracked Tear",
    kind: "physick",
    multipliers: [{ group: "physick-bloodsucking", amount: 0.2 }],
    condition: "while the physick effect is active",
    drawback: "+10% damage taken",
    source: SRC,
  },
  {
    id: "magic-shrouding-cracked-tear",
    name: "Magic-Shrouding Cracked Tear",
    kind: "physick",
    multipliers: [{ group: "physick-shroud", amount: 0.2, types: [AttackPowerType.MAGIC] }],
    condition: "while the physick effect is active",
    source: SRC,
  },
  {
    id: "flame-shrouding-cracked-tear",
    name: "Flame-Shrouding Cracked Tear",
    kind: "physick",
    multipliers: [{ group: "physick-shroud", amount: 0.2, types: [AttackPowerType.FIRE] }],
    condition: "while the physick effect is active",
    source: SRC,
  },

  // --- Buffs: incantations -------------------------------------------------
  {
    id: "golden-vow",
    name: "Golden Vow",
    kind: "buff",
    multipliers: [{ group: "golden-vow", amount: 0.15 }],
    condition: "incantation active (self & allies)",
    source: SRC,
  },
  {
    id: "flame-grant-me-strength",
    name: "Flame, Grant Me Strength",
    kind: "buff",
    multipliers: [
      {
        group: "flame-grant-me-strength",
        amount: 0.2,
        types: [AttackPowerType.PHYSICAL, AttackPowerType.FIRE],
      },
    ],
    condition: "incantation active",
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
