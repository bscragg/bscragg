/**
 * Pinned game data version. Bump this (and re-vendor the JSON) when adopting a
 * newer extracted regulation. v1 targets vanilla only — balance mods are out of
 * scope.
 */
export const REGULATION_PATCH = "vanilla-1.14" as const;

/** Human-readable note shown in the UI footer. */
export const PATCH_LABEL = "Elden Ring patch 1.14 (Shadow of the Erdtree)";
