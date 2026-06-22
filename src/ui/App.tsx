import { useEffect, useMemo, useState } from "react";
import { REGULATION_PATCH } from "../engine/data/loadData.ts";
import { PATCH_LABEL } from "../engine/data/patch.ts";
import { allAttributes, AttackPowerType, type Attribute } from "../engine/data/schema.ts";
import { listBaseWeapons } from "../engine/calc/weapons.ts";
import type { Attributes } from "../engine/calc/types.ts";
import { buildStyles, getStyle } from "../engine/search/styles.ts";
import { objectiveLabel } from "../engine/search/objectives.ts";
import { rankWeaponsForStyle } from "../engine/search/search.ts";
import { optimizeAcrossWeapons, type OptimizedWeapon } from "../engine/optimize/optimizeStats.ts";
import {
  getModifiers,
  modifiersByKind,
  type Modifier,
  type ModifierKind,
} from "../engine/modifiers/index.ts";
import {
  DEFAULT_STATE,
  loadInitialState,
  persistState,
  shareUrl,
} from "./buildState.ts";

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
  const [initial] = useState(loadInitialState);
  const [styleId, setStyleId] = useState(initial.styleId);
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [attributes, setAttributes] = useState<Attributes>(initial.attributes);
  const [twoHanding, setTwoHanding] = useState(initial.twoHanding);
  const [requireReqs, setRequireReqs] = useState(initial.requireReqs);
  const [includeDlc, setIncludeDlc] = useState(initial.includeDlc);
  const [budget, setBudget] = useState(initial.budget);
  const [modifierIds, setModifierIds] = useState<string[]>(initial.modifierIds);
  const [ownedBaseNames, setOwnedBaseNames] = useState<string[]>(initial.ownedBaseNames);
  const [optimized, setOptimized] = useState<OptimizedWeapon[] | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  const style = getStyle(styleId) ?? getStyle("open")!;
  const isSpell = style.objective.kind === "spellScaling";

  const modifiers = useMemo(() => getModifiers(modifierIds), [modifierIds]);
  const ownedFilter = ownedBaseNames.length > 0 ? ownedBaseNames : undefined;

  // Remember the build across reloads and keep the URL shareable.
  useEffect(() => {
    persistState({
      styleId,
      mode,
      attributes,
      twoHanding,
      requireReqs,
      includeDlc,
      budget,
      modifierIds,
      ownedBaseNames,
    });
  }, [styleId, mode, attributes, twoHanding, requireReqs, includeDlc, budget, modifierIds, ownedBaseNames]);

  const ranked = useMemo(
    () =>
      rankWeaponsForStyle(style, {
        attributes,
        twoHanding,
        modifiers,
        filter: {
          requireRequirementsMet: requireReqs,
          includeDlc,
          ownedWeaponBaseNames: ownedFilter,
        },
        limit: 25,
      }),
    [style, attributes, twoHanding, modifiers, requireReqs, includeDlc, ownedFilter],
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
        modifiers,
        filter: {
          affinities: style.affinities,
          weaponTypes: style.weaponTypes,
          includeDlc,
          ownedWeaponBaseNames: ownedFilter,
        },
        limit: 25,
      });
      setOptimized(result);
      setOptimizing(false);
    }, 20);
  }

  function resetAll() {
    setStyleId(DEFAULT_STATE.styleId);
    setMode(DEFAULT_STATE.mode);
    setAttributes({ ...DEFAULT_STATE.attributes });
    setTwoHanding(DEFAULT_STATE.twoHanding);
    setRequireReqs(DEFAULT_STATE.requireReqs);
    setIncludeDlc(DEFAULT_STATE.includeDlc);
    setBudget(DEFAULT_STATE.budget);
    setModifierIds([]);
    setOwnedBaseNames([]);
    setOptimized(null);
  }

  return (
    <main className="app">
      <header>
        <div className="brand">
          <svg className="moonmark" viewBox="0 0 48 48" aria-hidden="true">
            <g fill="currentColor">
              {/* Witch-hat silhouette — a nod to Ranni. */}
              <ellipse cx="24" cy="37" rx="21" ry="4.6" />
              <path d="M13 37C13 27 15 15 25 9c5-3 7 0 4.5 4.5C26 20 26 30 33 37Z" />
            </g>
          </svg>
          <h1>EldenAR</h1>
        </div>
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

        <InventoryPicker selected={ownedBaseNames} onChange={setOwnedBaseNames} />

        <ModifierPicker selected={modifierIds} onChange={setModifierIds} />

        <BuildToolbar
          getState={() => ({
            styleId,
            mode,
            attributes,
            twoHanding,
            requireReqs,
            includeDlc,
            budget,
            modifierIds,
            ownedBaseNames,
          })}
          onReset={resetAll}
        />
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

const MODIFIER_GROUPS: { kind: ModifierKind; label: string }[] = [
  { kind: "talisman", label: "Talismans" },
  { kind: "physick", label: "Wondrous Physick" },
  { kind: "buff", label: "Buffs" },
];

function modifierNote(m: Modifier): string {
  const parts: string[] = [];
  if (m.attributeBonuses) {
    parts.push(
      Object.entries(m.attributeBonuses)
        .map(([a, n]) => `${n > 0 ? "+" : ""}${n} ${a.toUpperCase()}`)
        .join(", "),
    );
  }
  for (const mult of m.multipliers ?? []) {
    // Up to one decimal, so e.g. 0.115 shows as "11.5%" not "12%".
    parts.push(`+${+(mult.amount * 100).toFixed(1)}%`);
  }
  if (m.condition) parts.push(m.condition);
  if (m.drawback) parts.push(`⚠ ${m.drawback}`);
  return parts.join(" · ");
}

function ModifierPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(selected.length > 0);
  const set = new Set(selected);
  function toggle(id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }
  return (
    <details className="gear" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        Gear &amp; buffs{" "}
        {selected.length > 0 ? (
          <span className="gear-count">{selected.length} active</span>
        ) : (
          <span className="hint">— talismans, physick tears, incantations</span>
        )}
      </summary>
      <p className="hint">
        Flat stat bonuses feed into scaling. % buffs from different sources multiply; alternatives
        in the same category (e.g. two body buffs) don't stack — the strongest applies. Conditions
        (e.g. “HP full”) are noted per item. Applies to both ranking and optimizing.
      </p>
      <div className="gear-groups">
        {MODIFIER_GROUPS.map(({ kind, label }) => (
          <div key={kind} className="gear-group">
            <h3>{label}</h3>
            {modifiersByKind(kind).map((m) => (
              <label key={m.id} className="mod" title={m.source}>
                <input type="checkbox" checked={set.has(m.id)} onChange={() => toggle(m.id)} />
                <span className="mod-name">
                  {m.name}
                  {m.dlc && <span className="mod-dlc"> DLC</span>}
                  <span className="mod-note"> {modifierNote(m)}</span>
                </span>
              </label>
            ))}
          </div>
        ))}
      </div>
      {selected.length > 0 && (
        <button className="gear-clear" onClick={() => onChange([])}>
          Clear all
        </button>
      )}
    </details>
  );
}

const INVENTORY_LIMIT = 80;

function InventoryPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (names: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(selected.length > 0);
  const all = useMemo(() => listBaseWeapons(), []);
  const set = new Set(selected);
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    const list = q ? all.filter((w) => w.weaponName.toLowerCase().includes(q)) : all;
    return { total: list.length, shown: list.slice(0, INVENTORY_LIMIT) };
  }, [all, q]);

  function toggle(name: string) {
    const next = new Set(set);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onChange([...next]);
  }

  return (
    <details className="inv" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        My weapons{" "}
        {selected.length > 0 ? (
          <span className="gear-count">{selected.length} owned</span>
        ) : (
          <span className="hint">— rank only weapons in your inventory</span>
        )}
      </summary>
      <p className="hint">
        With at least one weapon selected, ranking &amp; optimizing only consider your inventory.
        Owning an infusable weapon includes all its affinities.
      </p>

      {selected.length > 0 && (
        <div className="chips">
          {[...selected].sort((a, b) => a.localeCompare(b)).map((n) => (
            <button key={n} className="chip" onClick={() => toggle(n)} title="Remove">
              {n} ✕
            </button>
          ))}
          <button className="gear-clear" onClick={() => onChange([])}>
            Clear all
          </button>
        </div>
      )}

      <input
        className="inv-search"
        type="search"
        placeholder="Search weapons by name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="inv-list">
        {filtered.shown.map((w) => (
          <label key={w.weaponName} className="mod">
            <input
              type="checkbox"
              checked={set.has(w.weaponName)}
              onChange={() => toggle(w.weaponName)}
            />
            <span className="mod-name">
              {w.weaponName}
              <span className="mod-note">
                {" "}
                {w.weaponTypeName}
                {w.affinityCount > 1 ? ` · ${w.affinityCount} affinities` : ""}
                {w.dlc ? " · DLC" : ""}
              </span>
            </span>
          </label>
        ))}
        {filtered.shown.length === 0 && <p className="hint">No weapons match “{query}”.</p>}
      </div>
      {filtered.total > filtered.shown.length && (
        <p className="hint">
          Showing {filtered.shown.length} of {filtered.total} — keep typing to narrow.
        </p>
      )}
    </details>
  );
}

function BuildToolbar({
  getState,
  onReset,
}: {
  getState: () => Parameters<typeof shareUrl>[0];
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    const url = shareUrl(getState());
    // Best-effort copy; the same URL is always live in the address bar, so give
    // feedback immediately rather than waiting on a clipboard promise that may
    // hang when the page isn't focused.
    navigator.clipboard?.writeText?.(url)?.catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="toolbar">
      <button onClick={copyLink}>{copied ? "Link copied ✓" : "Copy share link"}</button>
      <button className="gear-clear" onClick={onReset}>
        Reset
      </button>
      <span className="hint">Your build is saved automatically and encoded in the page URL.</span>
    </div>
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
