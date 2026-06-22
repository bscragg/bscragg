import { loadRegulation } from "../data/loadData.ts";
import { decodeRegulation } from "./preprocess.ts";
import { weaponTypeName } from "./weaponTypes.ts";
import type { CalcWeapon } from "./types.ts";

let cached: CalcWeapon[] | null = null;
let baseCache: BaseWeapon[] | null = null;

/** Load, decode, and cache all weapon variants in calc-ready form. */
export function getCalcWeapons(): CalcWeapon[] {
  if (cached === null) {
    cached = decodeRegulation(loadRegulation().regulation);
  }
  return cached;
}

/** Find a weapon variant by its full name (including affinity), e.g. "Heavy Longsword". */
export function findWeapon(name: string): CalcWeapon | undefined {
  return getCalcWeapons().find((w) => w.name === name);
}

/** A distinct base weapon (by `weaponName`), with display metadata for inventory selection. */
export interface BaseWeapon {
  /** Base name without affinity, e.g. "Longsword". */
  weaponName: string;
  weaponType: number;
  weaponTypeName: string;
  dlc: boolean;
  /**
   * How many affinity variants exist for this base. Standard weapons are
   * infusable (many affinities via Ashes of War); somber/unique weapons have one.
   */
  affinityCount: number;
}

/**
 * Distinct base weapons, sorted by name — the catalogue for an "items I own"
 * inventory. Owning a base weapon implies access to all of its affinity variants
 * (which is exactly how Ashes of War infusion works for standard weapons; somber
 * and unique weapons simply have a single variant).
 */
export function listBaseWeapons(): BaseWeapon[] {
  if (baseCache) return baseCache;
  const byName = new Map<string, BaseWeapon>();
  for (const w of getCalcWeapons()) {
    const existing = byName.get(w.weaponName);
    if (existing) {
      existing.affinityCount++;
    } else {
      byName.set(w.weaponName, {
        weaponName: w.weaponName,
        weaponType: w.weaponType,
        weaponTypeName: weaponTypeName(w.weaponType),
        dlc: w.dlc,
        affinityCount: 1,
      });
    }
  }
  baseCache = [...byName.values()].sort((a, b) => a.weaponName.localeCompare(b.weaponName));
  return baseCache;
}
