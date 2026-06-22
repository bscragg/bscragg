import { AttackPowerType } from "../data/schema.ts";
import type { Modifier } from "./applyModifiers.ts";

/**
 * Vendored modifier dataset — talismans, Wondrous Physick tears, and buffs that
 * affect Attack Rating, for vanilla patch 1.14 (post Shadow of the Erdtree).
 *
 * Values are hand-transcribed and cross-checked against the community wiki
 * (Fextralife); see ATTRIBUTION.md. This covers every modifier the engine can
 * represent faithfully — flat attribute bonuses, fixed flat damage adds
 * (greases), and percentage AR multipliers on normal attacks.
 *
 * Stacking (enforced by `applyModifiers.ts`): within a `group` only the
 * strongest effect applies (same-category buffs overwrite in game); per-group
 * factors multiply. Mutually-exclusive in-game pairs share a group (e.g. the two
 * Golden Vows; Flame Grant Me Strength / Howl of Shabriri); everything else gets
 * its own group so it multiplies. Greases are the "Armament" category — only one
 * is active at a time, enforced at selection (the UI makes them single-select).
 *
 * Weapon-buff SPELLS (Scholar's Armament, Bloodflame Blade, …) add elemental
 * damage that SCALES with the catalyst's spell/incant scaling (≈ factor ×
 * scaling), so they aren't fixed constants. They're modelled via `scalingDamage`
 * and resolved to concrete flat damage by `resolveModifiers(ids, spellBuff)`,
 * where `spellBuff` is the player's catalyst Spell Buff (read in game).
 *
 * Armor pieces that raise general attack power on normal attacks (Rakshasa Set,
 * White Mask, Mushroom Crown, …) are included as `kind: "armor"`. Slot-conflicting
 * pieces share an `exclusiveGroup` so the UI keeps them single-select.
 *
 * Deliberately NOT included, because the current model can't represent them
 * faithfully:
 *   - On-hit ramping effects (Winged Sword Insignia, Rotten Winged Sword
 *     Insignia, Millicent's Prosthesis, Thorny/Spiked cracked tears).
 *   - Charged- / skill- / move-specific talismans (Shard of Alexander,
 *     Godfrey Icon, Axe/Claw/Curved Sword/Spear/Roar/Lance talismans, the DLC
 *     dash/kick/throwable/bow talismans).
 *   - Move-specific armor (Raptor's Black Feathers / Gravebird's = jump attacks;
 *     Leda's = post-roll; Dancer's = dance skills) and spell-only armor (Snow
 *     Witch Hat = cold sorceries; Lusat's/Azur's/Crucible/Spellblade sets, etc.).
 * Conditional effects that DO apply to normal attacks are included, with the
 * trigger noted in `condition`.
 *
 * Grease note: greases require a physical-affinity armament (Standard/Heavy/
 * Keen/Quality) in game — they can't enchant an already-elemental weapon. The
 * calculator doesn't enforce that; apply them to physical weapons.
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

  // --- Weapon-buff spells (scaling flat damage; "Armament" — one at a time) -
  // Added elemental = factor × the catalyst's Spell Buff (sorcery/incant scaling).
  {
    id: "scholars-armament",
    name: "Scholar's Armament",
    kind: "weapon-buff",
    scalingDamage: { types: [AttackPowerType.MAGIC], factor: 0.75, basis: "sorcery" },
    condition: "sorcery; physical-affinity weapons only",
    source: SRC,
  },
  {
    id: "electrify-armament",
    name: "Electrify Armament",
    kind: "weapon-buff",
    scalingDamage: { types: [AttackPowerType.LIGHTNING], factor: 0.75, basis: "incant" },
    condition: "incantation; physical-affinity weapons only",
    source: SRC,
  },
  {
    id: "orders-blade",
    name: "Order's Blade",
    kind: "weapon-buff",
    scalingDamage: { types: [AttackPowerType.HOLY], factor: 0.75, basis: "incant" },
    condition: "incantation; physical-affinity weapons only",
    source: SRC,
  },
  {
    id: "bloodflame-blade",
    name: "Bloodflame Blade",
    kind: "weapon-buff",
    scalingDamage: { types: [AttackPowerType.FIRE], factor: 0.4, basis: "incant" },
    flatDamage: { [AttackPowerType.BLEED]: 40 }, // fixed bleed rider
    condition: "incantation; physical-affinity weapons only",
    source: SRC,
  },
  {
    id: "black-flame-blade",
    name: "Black Flame Blade",
    kind: "weapon-buff",
    scalingDamage: { types: [AttackPowerType.FIRE], factor: 0.65, basis: "incant" },
    condition: "incantation; physical-affinity weapons only",
    drawback: "its %-HP damage-over-time isn't modelled (AR/buildup only)",
    source: SRC,
  },

  // --- Greases (fixed flat damage; "Armament" buff — one at a time) ---------
  // Standard elemental greases: +85 for 60s. Physical-affinity weapons only.
  {
    id: "fire-grease",
    name: "Fire Grease",
    kind: "grease",
    flatDamage: { [AttackPowerType.FIRE]: 85 },
    condition: "~60s; physical-affinity weapons only",
    source: SRC,
  },
  {
    id: "magic-grease",
    name: "Magic Grease",
    kind: "grease",
    flatDamage: { [AttackPowerType.MAGIC]: 85 },
    condition: "~60s; physical-affinity weapons only",
    source: SRC,
  },
  {
    id: "lightning-grease",
    name: "Lightning Grease",
    kind: "grease",
    flatDamage: { [AttackPowerType.LIGHTNING]: 85 },
    condition: "~60s; physical-affinity weapons only",
    source: SRC,
  },
  {
    id: "holy-grease",
    name: "Holy Grease",
    kind: "grease",
    flatDamage: { [AttackPowerType.HOLY]: 85 },
    condition: "~60s; physical-affinity weapons only",
    source: SRC,
  },
  // Drawstring elemental greases: +110 but only ~10s.
  {
    id: "drawstring-fire-grease",
    name: "Drawstring Fire Grease",
    kind: "grease",
    flatDamage: { [AttackPowerType.FIRE]: 110 },
    condition: "~10s; physical-affinity weapons only",
    source: SRC,
  },
  {
    id: "drawstring-magic-grease",
    name: "Drawstring Magic Grease",
    kind: "grease",
    flatDamage: { [AttackPowerType.MAGIC]: 110 },
    condition: "~10s; physical-affinity weapons only",
    source: SRC,
  },
  {
    id: "drawstring-lightning-grease",
    name: "Drawstring Lightning Grease",
    kind: "grease",
    flatDamage: { [AttackPowerType.LIGHTNING]: 110 },
    condition: "~10s; physical-affinity weapons only",
    source: SRC,
  },
  {
    id: "drawstring-holy-grease",
    name: "Drawstring Holy Grease",
    kind: "grease",
    flatDamage: { [AttackPowerType.HOLY]: 110 },
    condition: "~10s; physical-affinity weapons only",
    source: SRC,
  },
  // Status greases: add flat status buildup per hit, ~60s.
  {
    id: "blood-grease",
    name: "Blood Grease",
    kind: "grease",
    flatDamage: { [AttackPowerType.BLEED]: 30 },
    condition: "~60s; physical-affinity weapons only",
    source: SRC,
  },
  {
    id: "poison-grease",
    name: "Poison Grease",
    kind: "grease",
    flatDamage: { [AttackPowerType.POISON]: 63 },
    condition: "~60s; physical-affinity weapons only",
    source: SRC,
  },
  {
    id: "freezing-grease",
    name: "Freezing Grease",
    kind: "grease",
    flatDamage: { [AttackPowerType.FROST]: 63 },
    condition: "~60s; physical-affinity weapons only",
    source: SRC,
  },
  {
    id: "rot-grease",
    name: "Rot Grease",
    kind: "grease",
    flatDamage: { [AttackPowerType.SCARLET_ROT]: 63 },
    condition: "~60s; physical-affinity weapons only",
    source: SRC,
  },
  {
    id: "soporific-grease",
    name: "Soporific Grease",
    kind: "grease",
    flatDamage: { [AttackPowerType.SLEEP]: 33 },
    condition: "~60s; physical-affinity weapons only",
    source: SRC,
  },

  // --- Armor: general / conditional attack-power up ------------------------
  // Helm-slot pieces share exclusiveGroup "armor-helm" (one helm at a time).
  // Each is its own multiplier group, so it stacks multiplicatively with the
  // rest. Slot mixing (e.g. 3 Rakshasa pieces + a different helm) isn't modelled.
  {
    id: "rakshasa-set",
    name: "Rakshasa Set",
    kind: "armor",
    multipliers: [{ group: "rakshasa", amount: 0.08 }],
    condition: "full 4-piece set; raises all damage (low defense for its weight)",
    exclusiveGroup: "armor-helm",
    dlc: true,
    source: SRC,
  },
  {
    id: "white-mask",
    name: "White Mask",
    kind: "armor",
    multipliers: [{ group: "white-mask", amount: 0.1 }],
    condition: "helm; ~20s after blood loss procs nearby (your own counts)",
    exclusiveGroup: "armor-helm",
    source: SRC,
  },
  {
    id: "mushroom-crown",
    name: "Mushroom Crown",
    kind: "armor",
    multipliers: [{ group: "mushroom-crown", amount: 0.1 }],
    condition: "helm; ~20s while poison or Scarlet Rot afflicts something nearby",
    exclusiveGroup: "armor-helm",
    source: SRC,
  },
  {
    id: "black-dumpling",
    name: "Black Dumpling",
    kind: "armor",
    multipliers: [{ group: "black-dumpling", amount: 0.1 }],
    condition: "helm; while you're afflicted with madness",
    drawback: "requires taking madness on yourself",
    exclusiveGroup: "armor-helm",
    source: SRC,
  },
  {
    id: "twinbird-kite-shield",
    name: "Twinbird Kite Shield",
    kind: "armor",
    multipliers: [{ group: "twinbird", amount: 0.05 }],
    condition: "shield; while below 20% HP",
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

/**
 * Like {@link getModifiers}, but folds each modifier's catalyst-scaling
 * `scalingDamage` into concrete `flatDamage` using `spellBuff` (the player's
 * staff/seal Spell Buff). Weapon-buff spells must go through this for their
 * elemental add to register — the pure engine only reads `flatDamage`.
 */
export function resolveModifiers(ids: readonly string[], spellBuff: number): Modifier[] {
  return getModifiers(ids).map((m) => {
    if (!m.scalingDamage) return m;
    const flatDamage = { ...(m.flatDamage ?? {}) };
    for (const type of m.scalingDamage.types) {
      flatDamage[type] = (flatDamage[type] ?? 0) + m.scalingDamage.factor * spellBuff;
    }
    return { ...m, flatDamage };
  });
}

/** All modifiers of a given kind, in declaration order. */
export function modifiersByKind(kind: Modifier["kind"]): Modifier[] {
  return MODIFIERS.filter((m) => m.kind === kind);
}
