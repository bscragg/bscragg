import { loadRegulation, REGULATION_PATCH } from "../engine/data/loadData.ts";
import { PATCH_LABEL } from "../engine/data/patch.ts";

/**
 * Phase 1 placeholder UI. Confirms the data layer loads and validates in the
 * browser. The real calculator/optimizer UI lands in later phases.
 */
export function App() {
  const { stats } = loadRegulation();

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>EldenAR</h1>
      <p>
        Elden Ring <strong>Attack Rating</strong> optimizer.{" "}
        <em>v1 optimizes AR &amp; status buildup — not true DPS.</em>
      </p>
      <h2>Data layer ({REGULATION_PATCH})</h2>
      <p>{PATCH_LABEL}</p>
      <ul>
        <li>Weapon/affinity variants: {stats.weaponCount.toLocaleString()}</li>
        <li>Affinities: {stats.affinityCount}</li>
        <li>DLC weapons: {stats.dlcWeaponCount.toLocaleString()}</li>
        <li>Weapons with status buildup: {stats.statusWeaponCount.toLocaleString()}</li>
        <li>Calc-correct curves: {stats.calcCorrectGraphCount}</li>
        <li>Reinforce tables: {stats.reinforceTypeCount}</li>
        <li>Status sp-effect params: {stats.statusSpEffectParamCount}</li>
      </ul>
    </main>
  );
}
