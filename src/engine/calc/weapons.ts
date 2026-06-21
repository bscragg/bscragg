import { loadRegulation } from "../data/loadData.ts";
import { decodeRegulation } from "./preprocess.ts";
import type { CalcWeapon } from "./types.ts";

let cached: CalcWeapon[] | null = null;

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
