import { useMemo, useState } from "react";
import { REGULATION_PATCH } from "../engine/data/loadData.ts";
import { PATCH_LABEL } from "../engine/data/patch.ts";
import { allAttributes, AttackPowerType, type Attribute } from "../engine/data/schema.ts";
import type { Attributes } from "../engine/calc/types.ts";
import { buildStyles, getStyle } from "../engine/search/styles.ts";
import { objectiveLabel } from "../engine/search/objectives.ts";
import { rankWeaponsForStyle } from "../engine/search/search.ts";
import { optimizeAcrossWeapons, type OptimizedWeapon } from "../engine/optimize/optimizeStats.ts";

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

type Mode = "rank" | "optimize";

export function App() {
  const [styleId, setStyleId] = useState("open");
  const [mode, setMode] = useState<Mode>("rank");
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
  const [budget, setBudget] = useState(150);
  const [optimized, setOptimized] = useState<OptimizedWeapon[] | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  const style = getStyle(styleId)!;
  const isSpell = style.objective.kind === "spellScaling";

  const ranked = useMemo(
    () =>
      rankWeaponsForStyle(style, {
        attributes,
        twoHanding,
        filter: { requireRequirementsMet: requireReqs, includeDlc },
        limit: 25,
      }),
    [style, attributes, twoHanding, requireReqs, includeDlc],
  );

  function runOptimize() {
    setOptimizing(true);
    // Defer so the spinner paints before the (synchronous) search runs.
    setTimeout(() => {
      const result = optimizeAcrossWeapons({
        objective: style.objective,
        budget: { total: budget },
        twoHanding,
        meetRequirements: true,
        filter: {
          affinities: style.affinities,
          weaponTypes: style.weaponTypes,
          includeDlc,
        },
        limit: 25,
      });
      setOptimized(result);
      setOptimizing(false);
    }, 20);
  }

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

        <div className="modes">
          <label>
            <input
              type="radio"
              name="mode"
              checked={mode === "rank"}
              onChange={() => setMode("rank")}
            />{" "}
            Rank weapons for my current stats
          </label>
          <label>
            <input
              type="radio"
              name="mode"
              checked={mode === "optimize"}
              onChange={() => setMode("optimize")}
            />{" "}
            Optimize: find the best stat spread
          </label>
        </div>

        {mode === "rank" ? (
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
        ) : (
          <div className="budgetrow">
            <label className="attr">
              <span>Points for STR/DEX/INT/FAI/ARC</span>
              <input
                type="number"
                min={5}
                max={495}
                value={budget}
                onChange={(e) => setBudget(Math.max(5, Math.min(495, Number(e.target.value) || 5)))}
              />
            </label>
            <button onClick={runOptimize} disabled={optimizing}>
              {optimizing ? "Optimizing…" : "Find best builds"}
            </button>
            <p className="hint">
              Distributes this many points across the five offensive attributes to maximize the
              objective, meeting each weapon's requirements. (Survival stats like VIG/END are
              budgeted separately.)
            </p>
          </div>
        )}

        <div className="toggles">
          <label>
            <input type="checkbox" checked={twoHanding} onChange={(e) => setTwoHanding(e.target.checked)} />{" "}
            Two-hand
          </label>
          {mode === "rank" && (
            <label>
              <input type="checkbox" checked={requireReqs} onChange={(e) => setRequireReqs(e.target.checked)} />{" "}
              Only weapons I can wield
            </label>
          )}
          <label>
            <input type="checkbox" checked={includeDlc} onChange={(e) => setIncludeDlc(e.target.checked)} />{" "}
            Include DLC
          </label>
        </div>
      </section>

      {mode === "rank" ? (
        <RankTable rows={ranked} isSpell={isSpell} />
      ) : (
        <OptimizeTable rows={optimized} isSpell={isSpell} optimizing={optimizing} />
      )}

      <footer>
        <p>
          Data: {PATCH_LABEL} ({REGULATION_PATCH}). AR/status only. See ATTRIBUTION.md for sources
          &amp; licensing. Unofficial fan tool.
        </p>
      </footer>
    </main>
  );
}

function RankTable({
  rows,
  isSpell,
}: {
  rows: ReturnType<typeof rankWeaponsForStyle>;
  isSpell: boolean;
}) {
  return (
    <section>
      <h2>
        Top {rows.length} {isSpell ? "catalysts" : "weapons"} (each at max upgrade)
      </h2>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Weapon</th>
              <th>Affinity</th>
              <th className="num">{isSpell ? "Spell" : "Score"}</th>
              {!isSpell && DAMAGE_LABELS.map(([t, l]) => <th key={t} className="num">{l}</th>)}
              {!isSpell && STATUS_LABELS.map(([t, l]) => <th key={t} className="num">{l}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className={r.requirementsMet ? "" : "unmet"}>
                <td>{r.rank}</td>
                <td>
                  {r.weaponName}
                  <span className="wt"> · {r.weaponTypeName}</span>
                  {!r.requirementsMet && <span className="flag" title="Requirements not met"> ⚠</span>}
                </td>
                <td>{r.affinityName}</td>
                <td className="num strong">{Math.round(r.score)}</td>
                {!isSpell && DAMAGE_LABELS.map(([t]) => <td key={t} className="num dim">{fmt(r.attackPower[t])}</td>)}
                {!isSpell && STATUS_LABELS.map(([t]) => <td key={t} className="num dim">{fmt(r.attackPower[t])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="hint">No matching weapons for these settings.</p>}
    </section>
  );
}

function OptimizeTable({
  rows,
  isSpell,
  optimizing,
}: {
  rows: OptimizedWeapon[] | null;
  isSpell: boolean;
  optimizing: boolean;
}) {
  if (optimizing) return <p className="hint">Optimizing across weapons…</p>;
  if (rows === null) return <p className="hint">Set a point budget and press “Find best builds”.</p>;
  return (
    <section>
      <h2>Top {rows.length} optimized builds</h2>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Weapon</th>
              <th>Affinity</th>
              <th className="num">{isSpell ? "Spell" : "Score"}</th>
              {allAttributes.map((a) => (
                <th key={a} className="num">{ATTR_LABELS[a]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td>{r.rank}</td>
                <td>
                  {r.weaponName}
                  <span className="wt"> · {r.weaponTypeName}</span>
                </td>
                <td>{r.affinityName}</td>
                <td className="num strong">{Math.round(r.score)}</td>
                {allAttributes.map((a) => (
                  <td key={a} className="num dim">{r.attributes[a]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="hint">No feasible builds for this budget.</p>}
    </section>
  );
}

function fmt(value: number | undefined): string {
  return value ? String(Math.round(value)) : "—";
}
