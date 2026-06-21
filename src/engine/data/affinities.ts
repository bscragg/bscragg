/**
 * Vanilla affinity id → name mapping, from ThomasJClark/elden-ring-weapon-calculator
 * (MIT). Affinity -1 is the synthetic "Unique" id for uninfusable weapons.
 */
export const affinityNames: ReadonlyMap<number, string> = new Map([
  [-1, "Unique"],
  [0, "Standard"],
  [1, "Heavy"],
  [2, "Keen"],
  [3, "Quality"],
  [4, "Fire"],
  [5, "Flame Art"],
  [6, "Lightning"],
  [7, "Sacred"],
  [8, "Magic"],
  [9, "Cold"],
  [10, "Poison"],
  [11, "Blood"],
  [12, "Occult"],
]);

export function affinityName(id: number): string {
  return affinityNames.get(id) ?? `Affinity ${id}`;
}

/** Named affinity ids for convenient use in build-style filters. */
export const Affinity = {
  UNIQUE: -1,
  STANDARD: 0,
  HEAVY: 1,
  KEEN: 2,
  QUALITY: 3,
  FIRE: 4,
  FLAME_ART: 5,
  LIGHTNING: 6,
  SACRED: 7,
  MAGIC: 8,
  COLD: 9,
  POISON: 10,
  BLOOD: 11,
  OCCULT: 12,
} as const;
