import type { Attributes } from "../engine/calc/types.ts";

/**
 * Serializable UI build state. Everything the user configures lives here so a
 * build can be (a) remembered across reloads via localStorage and (b) shared via
 * a URL hash. Transient results (the optimize output, spinners) are deliberately
 * excluded — they're recomputed.
 */
export interface BuildState {
  styleId: string;
  mode: "rank" | "optimize";
  attributes: Attributes;
  twoHanding: boolean;
  requireReqs: boolean;
  includeDlc: boolean;
  budget: number;
  /** Weapon upgrade level on the regular 0–25 scale (somber weapons are mapped). */
  upgrade: number;
  /** Catalyst Spell Buff (sorcery/incant scaling) for weapon-buff spells. */
  spellBuff: number;
  modifierIds: string[];
  ownedBaseNames: string[];
}

export const DEFAULT_STATE: BuildState = {
  styleId: "open",
  mode: "rank",
  attributes: { str: 60, dex: 60, int: 20, fai: 20, arc: 20 },
  twoHanding: false,
  requireReqs: false,
  includeDlc: true,
  budget: 150,
  upgrade: 25,
  spellBuff: 250,
  modifierIds: [],
  ownedBaseNames: [],
};

const STORAGE_KEY = "eldenar.build.v1";

function freshDefault(): BuildState {
  return { ...DEFAULT_STATE, attributes: { ...DEFAULT_STATE.attributes } };
}

const clampAttr = (n: number) => Math.max(1, Math.min(99, Math.round(n)));
const clampBudget = (n: number) => Math.max(5, Math.min(495, Math.round(n)));
const clampUpgrade = (n: number) => Math.max(0, Math.min(25, Math.round(n)));
const clampSpellBuff = (n: number) => Math.max(0, Math.min(600, Math.round(n)));

/** Encode a build to a compact `URLSearchParams` query string (no leading `?`). */
export function encodeState(s: BuildState): string {
  const p = new URLSearchParams();
  p.set("st", s.styleId);
  p.set("md", s.mode);
  const a = s.attributes;
  p.set("a", `${a.str}.${a.dex}.${a.int}.${a.fai}.${a.arc}`);
  if (s.twoHanding) p.set("th", "1");
  if (s.requireReqs) p.set("rq", "1");
  if (!s.includeDlc) p.set("dlc", "0");
  p.set("bg", String(s.budget));
  p.set("up", String(s.upgrade));
  p.set("sb", String(s.spellBuff));
  for (const id of s.modifierIds) p.append("mod", id);
  for (const n of s.ownedBaseNames) p.append("own", n);
  return p.toString();
}

/** Decode a query string back into a full build, falling back to defaults per field. */
export function decodeState(query: string): BuildState {
  const p = new URLSearchParams(query);
  const s = freshDefault();

  const st = p.get("st");
  if (st) s.styleId = st;

  const md = p.get("md");
  if (md === "optimize" || md === "rank") s.mode = md;

  const a = p.get("a");
  if (a) {
    const parts = a.split(".").map(Number);
    if (parts.length === 5 && parts.every((n) => Number.isFinite(n))) {
      s.attributes = {
        str: clampAttr(parts[0]!),
        dex: clampAttr(parts[1]!),
        int: clampAttr(parts[2]!),
        fai: clampAttr(parts[3]!),
        arc: clampAttr(parts[4]!),
      };
    }
  }

  s.twoHanding = p.get("th") === "1";
  s.requireReqs = p.get("rq") === "1";
  s.includeDlc = p.get("dlc") !== "0";

  const bg = Number(p.get("bg"));
  if (Number.isFinite(bg) && bg > 0) s.budget = clampBudget(bg);

  const up = p.get("up");
  if (up !== null && Number.isFinite(Number(up))) s.upgrade = clampUpgrade(Number(up));

  const sb = p.get("sb");
  if (sb !== null && Number.isFinite(Number(sb))) s.spellBuff = clampSpellBuff(Number(sb));

  const mods = p.getAll("mod");
  if (mods.length) s.modifierIds = mods;

  const own = p.getAll("own");
  if (own.length) s.ownedBaseNames = own;

  return s;
}

/** Initial state: URL hash wins (shareable links), then localStorage, then defaults. */
export function loadInitialState(): BuildState {
  if (typeof window === "undefined") return freshDefault();
  try {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash) return decodeState(hash);
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return decodeState(stored);
  } catch {
    // Malformed hash / unavailable storage — fall through to defaults.
  }
  return freshDefault();
}

/** Persist to the URL hash (no history spam) and localStorage. */
export function persistState(s: BuildState): void {
  if (typeof window === "undefined") return;
  const q = encodeState(s);
  try {
    window.history.replaceState(null, "", `#${q}`);
  } catch {
    // ignore
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, q);
  } catch {
    // ignore
  }
}

/** A full shareable URL for the given build. */
export function shareUrl(s: BuildState): string {
  const base = typeof window !== "undefined" ? window.location.href.split("#")[0] : "";
  return `${base}#${encodeState(s)}`;
}
