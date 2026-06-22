import { describe, it, expect } from "vitest";
import { DEFAULT_STATE, encodeState, decodeState, type BuildState } from "./buildState.ts";

const sample: BuildState = {
  styleId: "bleed",
  mode: "optimize",
  attributes: { str: 50, dex: 80, int: 9, fai: 9, arc: 45 },
  twoHanding: true,
  requireReqs: true,
  includeDlc: false,
  budget: 200,
  modifierIds: ["golden-vow", "flame-grant-me-strength"],
  ownedBaseNames: ["Longsword", "Rivers of Blood", "Marais Executioner's Sword"],
};

describe("buildState encode/decode", () => {
  it("round-trips a fully-populated build", () => {
    expect(decodeState(encodeState(sample))).toEqual(sample);
  });

  it("round-trips the defaults", () => {
    expect(decodeState(encodeState(DEFAULT_STATE))).toEqual(DEFAULT_STATE);
  });

  it("preserves weapon names with spaces and apostrophes", () => {
    const decoded = decodeState(encodeState(sample));
    expect(decoded.ownedBaseNames).toContain("Marais Executioner's Sword");
  });

  it("falls back to defaults for an empty/garbage query", () => {
    expect(decodeState("")).toEqual(DEFAULT_STATE);
    expect(decodeState("not=a&real=build").styleId).toBe(DEFAULT_STATE.styleId);
  });

  it("clamps out-of-range attributes and budget", () => {
    const decoded = decodeState("a=200.-5.10.10.10&bg=9999");
    expect(decoded.attributes.str).toBe(99);
    expect(decoded.attributes.dex).toBe(1);
    expect(decoded.budget).toBe(495);
  });
});
