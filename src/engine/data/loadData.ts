import rawRegulation from "./regulation-vanilla-v1.14.json";
import { validateRegulation, type RegulationStats } from "./validate.ts";
import type { Regulation } from "./schema.ts";
import { REGULATION_PATCH } from "./patch.ts";

let cached: { regulation: Regulation; stats: RegulationStats } | null = null;

/**
 * Load, validate, and cache the vendored regulation dataset. Validation runs
 * once on first access; subsequent calls return the cached result.
 */
export function loadRegulation(): { regulation: Regulation; stats: RegulationStats } {
  if (cached === null) {
    cached = validateRegulation(rawRegulation);
  }
  return cached;
}

export { REGULATION_PATCH };
export type { Regulation, RegulationStats };
