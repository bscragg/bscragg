import { AttackPowerType, type Attribute } from "../data/schema.ts";
import { Affinity } from "../data/affinities.ts";
import { staffWeaponTypes, sealWeaponTypes } from "../calc/weaponTypes.ts";
import type { SearchObjective } from "./objectives.ts";

/**
 * A build "playstyle" the user can pick up front to aim their optimization at a
 * fantasy (pure Strength, Dex/Faith lightning, a bleed build, a sorcerer, …).
 * Picking one preconfigures the ranking objective and sensible affinity /
 * weapon-type filters. The "open" style applies no constraints — that's the
 * escape hatch for "I don't have a particular style in mind."
 */
export interface BuildStyle {
  id: string;
  label: string;
  /** One-line description for the selector UI. */
  description: string;
  /** Primary attributes this style invests in (used for UI hints + Phase 4). */
  attributes: Attribute[];
  /** Default ranking objective. */
  objective: SearchObjective;
  /** If set, ranking is restricted to these affinity ids. */
  affinities?: number[];
  /** If set, ranking is restricted to these weapon-type ids. */
  weaponTypes?: number[];
}

const A = Affinity;

export const buildStyles: BuildStyle[] = [
  {
    id: "open",
    label: "Open / no specific style",
    description: "Consider everything and rank by total Attack Rating. Pick this if you're exploring.",
    attributes: ["str", "dex", "int", "fai", "arc"],
    objective: { kind: "totalAr" },
  },
  {
    id: "strength",
    label: "Strength (melee)",
    description: "Heavy-hitting Strength weapons. Heavy and uninfused armaments, ranked by total AR.",
    attributes: ["str"],
    objective: { kind: "totalAr" },
    affinities: [A.HEAVY, A.STANDARD, A.UNIQUE],
  },
  {
    id: "dexterity",
    label: "Dexterity (melee)",
    description: "Fast, technical Dexterity weapons. Keen and uninfused armaments, ranked by total AR.",
    attributes: ["dex"],
    objective: { kind: "totalAr" },
    affinities: [A.KEEN, A.STANDARD, A.UNIQUE],
  },
  {
    id: "quality",
    label: "Quality (Strength + Dexterity)",
    description: "Balanced STR/DEX. Quality and uninfused armaments, ranked by total AR.",
    attributes: ["str", "dex"],
    objective: { kind: "totalAr" },
    affinities: [A.QUALITY, A.STANDARD, A.UNIQUE],
  },
  {
    id: "intelligence",
    label: "Intelligence (spellblade)",
    description: "Melee Intelligence builds. Magic and Cold armaments, ranked by total AR.",
    attributes: ["int"],
    objective: { kind: "totalAr" },
    affinities: [A.MAGIC, A.COLD, A.UNIQUE],
  },
  {
    id: "faith",
    label: "Faith (melee)",
    description: "Melee Faith builds. Sacred and Flame Art armaments, ranked by total AR.",
    attributes: ["fai"],
    objective: { kind: "totalAr" },
    affinities: [A.SACRED, A.FLAME_ART, A.UNIQUE],
  },
  {
    id: "dex-faith",
    label: "Dexterity + Faith (lightning)",
    description: "Classic Dex/Faith lightning. Sacred and Lightning armaments, ranked by total AR.",
    attributes: ["dex", "fai"],
    objective: { kind: "totalAr" },
    affinities: [A.LIGHTNING, A.SACRED, A.UNIQUE],
  },
  {
    id: "int-faith",
    label: "Intelligence + Faith (hybrid)",
    description: "INT/FAI hybrids and Death/elemental armaments, ranked by total AR.",
    attributes: ["int", "fai"],
    objective: { kind: "totalAr" },
    affinities: [A.MAGIC, A.SACRED, A.UNIQUE],
  },
  {
    id: "arcane",
    label: "Arcane",
    description: "Arcane-scaling armaments. Occult and Blood, ranked by total AR.",
    attributes: ["arc"],
    objective: { kind: "totalAr" },
    affinities: [A.OCCULT, A.BLOOD, A.UNIQUE],
  },
  {
    id: "bleed",
    label: "Status: Bleed",
    description: "Maximize Hemorrhage buildup. Blood/Occult/uninfused armaments, ranked by bleed buildup.",
    attributes: ["arc", "dex"],
    objective: { kind: "status", type: AttackPowerType.BLEED },
    affinities: [A.BLOOD, A.OCCULT, A.KEEN, A.STANDARD, A.UNIQUE],
  },
  {
    id: "frost",
    label: "Status: Frost",
    description: "Maximize Frostbite buildup. Cold and uninfused armaments, ranked by frost buildup.",
    attributes: ["int"],
    objective: { kind: "status", type: AttackPowerType.FROST },
    affinities: [A.COLD, A.UNIQUE],
  },
  {
    id: "poison",
    label: "Status: Poison / Scarlet Rot",
    description: "Maximize Poison buildup. Poison/Occult and uninfused armaments, ranked by poison buildup.",
    attributes: ["arc"],
    objective: { kind: "status", type: AttackPowerType.POISON },
    affinities: [A.POISON, A.OCCULT, A.UNIQUE],
  },
  {
    id: "sorcerer",
    label: "Sorcerer (staff spell scaling)",
    description: "Glintstone staves ranked by sorcery spell scaling.",
    attributes: ["int"],
    objective: { kind: "spellScaling", type: AttackPowerType.MAGIC },
    weaponTypes: [...staffWeaponTypes],
  },
  {
    id: "cleric",
    label: "Cleric (seal spell scaling)",
    description: "Sacred seals ranked by incantation spell scaling.",
    attributes: ["fai"],
    objective: { kind: "spellScaling", type: AttackPowerType.HOLY },
    weaponTypes: [...sealWeaponTypes],
  },
];

const stylesById = new Map(buildStyles.map((s) => [s.id, s]));

export function getStyle(id: string): BuildStyle | undefined {
  return stylesById.get(id);
}

/** The default style when none is chosen. */
export const openStyle = stylesById.get("open")!;
