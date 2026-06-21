import { useMemo, useState } from "react";
import { REGULATION_PATCH } from "../engine/data/loadData.ts";
import { PATCH_LABEL } from "../engine/data/patch.ts";
import { allAttributes, AttackPowerType, type Attribute } from "../engine/data/schema.ts";
import type { Attributes } from "../engine/calc/types.ts";
import { buildStyles, getStyle } from "../engine/search/styles.ts";
import { objectiveLabel } from "../engine/search/objectives.ts";
import { rankWeaponsForStyle } from "../engine/search/search.ts";

const ATTR_LABELS: Record<Attribute, string> = {
  str: "STR",
  dex: "DEX",
  int: "INT",
  fai: "FAI",
  arc: "ARC",
};

const DAMAGE_LABELS: [AttackPowerType, string][] = [
  [AttackPowerType.PHYSICAL, "Phys"],
  [AttackPowerType.MAGIC, "Mag"],
  [AttackPowerType.FIRE, "Fire"],
  [AttackPowerType.LIGHTNING, "Ltng"],
  [AttackPowerType.HOLY, "Holy"],
];

const STATUS_LABELS: [AttackPowerType, string][] = [
  [AttackPowerType.BLEED, "Bleed"],
  [AttackPowerType.FROST, "Frost"],
  [AttackPowerType.POISON, "Poison"],
  [AttackPowerType.SCARLET_ROT, "Rot"],
  [AttackPowerType.SLEEP, "Sleep"],
  [AttackPowerType.MADNESS, "Madness"],
];

export function App() {
  const [styleId, setStyleId] = useState("open");
  const [attributes, setAttributes] = useState<Attributes>({
    str: 60,
    dex: 60,
    int: 20,
    fai: 20,
    arc: 20,
  });
  const [twoHanding, setTwoHanding] = useState(false);
  const [requireReqs, setRequireReqs] = useState(false);
  const [includeDlc, setIncludeDlc] = useState(true);

  const style = getStyle(styleId)!;

  const results = useMemo(
    () =>
      rankWeaponsForStyle(style, {
        attributes,
        twoHanding,
        filter: { requireRequirementsMet: requireReqs, includeDlc },
        limit: 25,
      }),
    [style, attributes, twoHanding, requireReqs, includeDlc],
  );

  const isSpell = style.objective.kind === "spellScaling";
  const isStatus = style.objective.kind === "status";

  return (
    <main className="app">
      <header>
        <h1>EldenAR</h1>
        <p className="tagline">
          Maximize your <strong>Attack Rating</strong>. <span className="warn">AR, not DPS</span> —
          motion values &amp; target defense aren't modeled yet.
        </p>
      </header>

      <section className="panel">
        <label className="field">
          <span>I'm aiming for a style</span>
          <select value={styleId} onChange={(e) => setStyleId(e.target.value)}>
            {buildStyles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <p className="hint">{style.description}</p>
        <p className="hint">
          Ranking by <strong>{objectiveLabel(style.objective)}</strong>.
        </p>

        <div className="attrs">
          {allAttributes.map((attr) => (
            <label key={attr} className="attr">
              <span>{ATTR_LABELS[attr]}</span>
              <input
                type="number"
                min={1}
                max={99}
                value={attributes[attr]}
                onChange={(e) =>
                  setAttributes((prev) => ({
                    ...prev,
                    [attr]: Math.max(1, Math.min(99, Number(e.target.value) || 1)),
                  }))
                }
              />
            </label>
          ))}
        </div>

        <div className="toggles">
          <label>
            <input type="checkbox" checked={twoHanding} onChange={(e) => setTwoHanding(e.target.checked)} />{" "}
            Two-hand
          </label>
          <label>
            <input type="checkbox" checked={requireReqs} onChange={(e) => setRequireReqs(e.target.checked)} />{" "}
            Only weapons I can wield
          </label>
          <label>
            <input type="checkbox" checked={includeDlc} onChange={(e) => setIncludeDlc(e.target.checked)} />{" "}
            Include DLC
          </label>
        </div>
      </section>

      <section>
        <h2>Top {results.length} {isSpell ? "catalysts" : "weapons"} (each at max upgrade)</h2>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Weapon</th>
                <th>Affinity</th>
                <th className="num">{isSpell ? "Spell" : isStatus ? "Buildup" : "Total AR"}</th>
                {!isSpell &&
                  DAMAGE_LABELS.map(([t, l]) => (
                    <th key={t} className="num">
                      {l}
                    </th>
                  ))}
                {!isSpell &&
                  STATUS_LABELS.map(([t, l]) => (
                    <th key={t} className="num">
                      {l}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.name} className={r.requirementsMet ? "" : "unmet"}>
                  <td>{r.rank}</td>
                  <td>
                    {r.weaponName}
                    <span className="wt"> · {r.weaponTypeName}</span>
                    {!r.requirementsMet && <span className="flag" title="Stat requirements not met"> ⚠</span>}
                  </td>
                  <td>{r.affinityName}</td>
                  <td className="num strong">{Math.round(r.score)}</td>
                  {!isSpell &&
                    DAMAGE_LABELS.map(([t]) => (
                      <td key={t} className="num dim">
                        {fmt(r.attackPower[t])}
                      </td>
                    ))}
                  {!isSpell &&
                    STATUS_LABELS.map(([t]) => (
                      <td key={t} className="num dim">
                        {fmt(r.attackPower[t])}
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {results.length === 0 && <p className="hint">No matching weapons for these settings.</p>}
      </section>

      <footer>
        <p>
          Data: {PATCH_LABEL} ({REGULATION_PATCH}). AR/status only. See ATTRIBUTION.md for sources
          &amp; licensing. Unofficial fan tool.
        </p>
      </footer>
    </main>
  );
}

function fmt(value: number | undefined): string {
  return value ? String(Math.round(value)) : "—";
}
