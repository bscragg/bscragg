import {
  AttackPowerType,
  allDamageTypes,
  allStatusTypes,
  type Regulation,
  type RawWeapon,
  type CalcCorrectGraph,
} from "../data/schema.ts";
import type { CalcAttackElementCorrect, CalcWeapon } from "./types.ts";

/**
 * Denormalize raw regulation data into calc-ready `CalcWeapon`s.
 *
 * Ported from ThomasJClark/elden-ring-weapon-calculator's `decodeRegulationData`
 * (MIT). See ATTRIBUTION.md. Kept faithful to the reference so AR results match.
 */

/** Default soft-cap curve ids when a weapon doesn't override them. */
const DEFAULT_DAMAGE_CALC_CORRECT_GRAPH_ID = 0;
const DEFAULT_STATUS_CALC_CORRECT_GRAPH_ID = 6;

/**
 * Pre-evaluate a piecewise calc-correct graph into an array of scaling
 * fractions indexed by attribute value (1..148). Index 148 is the cap reached
 * by two-handing 99 Strength (floor(99 * 1.5)).
 */
export function evaluateCalcCorrectGraph(graph: CalcCorrectGraph): number[] {
  const arr: number[] = [];

  for (let i = 1; i < graph.length; i++) {
    const prevStage = graph[i - 1]!;
    const stage = graph[i]!;

    const minAttributeValue = i === 1 ? 1 : prevStage.maxVal + 1;
    const maxAttributeValue = i === graph.length - 1 ? 148 : stage.maxVal;

    for (let attributeValue = minAttributeValue; attributeValue <= maxAttributeValue; attributeValue++) {
      if (!arr[attributeValue]) {
        let ratio = Math.max(
          0,
          Math.min(1, (attributeValue - prevStage.maxVal) / (stage.maxVal - prevStage.maxVal)),
        );

        if (prevStage.adjPt > 0) {
          ratio = ratio ** prevStage.adjPt;
        } else if (prevStage.adjPt < 0) {
          ratio = 1 - (1 - ratio) ** -prevStage.adjPt;
        }

        arr[attributeValue] =
          prevStage.maxGrowVal + (stage.maxGrowVal - prevStage.maxGrowVal) * ratio;
      }
    }
  }

  return arr;
}

/** Status types that scale with Arcane (added uniformly, as in the game data). */
const ARCANE_SCALING_STATUS = [
  AttackPowerType.POISON,
  AttackPowerType.BLEED,
  AttackPowerType.MADNESS,
  AttackPowerType.SLEEP,
] as const;

export function decodeRegulation(regulation: Regulation): CalcWeapon[] {
  const { calcCorrectGraphs, attackElementCorrects, reinforceTypes, statusSpEffectParams, weapons } =
    regulation;

  // Pre-evaluate every soft-cap curve once.
  const calcCorrectGraphsById = new Map<number, number[]>(
    Object.entries(calcCorrectGraphs).map(([id, graph]) => [+id, evaluateCalcCorrectGraph(graph)]),
  );

  // Resolve attack-element-correct tables and inject the Arcane status scaling
  // that the game applies uniformly (not stored per-weapon).
  const attackElementCorrectsById = new Map<number, CalcAttackElementCorrect>(
    Object.entries(attackElementCorrects).map(([id, aec]) => [
      +id,
      {
        ...(aec as CalcAttackElementCorrect),
        ...Object.fromEntries(ARCANE_SCALING_STATUS.map((t) => [t, { arc: true }])),
      },
    ]),
  );

  const getCalcCorrectGraph = (id: number, weaponName: string): number[] => {
    const graph = calcCorrectGraphsById.get(id);
    if (graph == null) {
      throw new Error(`No CalcCorrectGraph found for id=${id} weapon=${weaponName}`);
    }
    return graph;
  };

  return weapons.map((weapon: RawWeapon): CalcWeapon => {
    const attackElementCorrect = attackElementCorrectsById.get(weapon.attackElementCorrectId);
    if (attackElementCorrect == null) {
      throw new Error(
        `No AttackElementCorrectParam found for id=${weapon.attackElementCorrectId} weapon=${weapon.name}`,
      );
    }

    const reinforceParams = reinforceTypes[String(weapon.reinforceTypeId)];
    if (reinforceParams == null) {
      throw new Error(
        `No ReinforceParamWeapon found for id=${weapon.reinforceTypeId} weapon=${weapon.name}`,
      );
    }

    // Per-type soft-cap curve (weapon override, else default).
    const weaponCalcCorrectGraphs = {} as Record<AttackPowerType, number[]>;
    for (const damageType of allDamageTypes) {
      weaponCalcCorrectGraphs[damageType] = getCalcCorrectGraph(
        weapon.calcCorrectGraphIds?.[String(damageType)] ?? DEFAULT_DAMAGE_CALC_CORRECT_GRAPH_ID,
        weapon.name,
      );
    }
    for (const statusType of allStatusTypes) {
      weaponCalcCorrectGraphs[statusType] = getCalcCorrectGraph(
        weapon.calcCorrectGraphIds?.[String(statusType)] ?? DEFAULT_STATUS_CALC_CORRECT_GRAPH_ID,
        weapon.name,
      );
    }

    // Expand base attack (and per-level status buildup) for each upgrade level.
    const attack: CalcWeapon["attack"] = reinforceParams.map((reinforceParam) => {
      const atLevel: Partial<Record<AttackPowerType, number>> = {};

      for (const [attackPowerType, unupgraded] of weapon.attack) {
        atLevel[attackPowerType as AttackPowerType] =
          unupgraded * (reinforceParam.attack[String(attackPowerType)] ?? 0);
      }

      const offsets = [
        reinforceParam.statusSpEffectId1,
        reinforceParam.statusSpEffectId2,
        // The reference reads a third slot; vanilla data only populates two.
        (reinforceParam as { statusSpEffectId3?: number }).statusSpEffectId3,
      ];

      weapon.statusSpEffectParamIds?.forEach((spEffectParamId, i) => {
        if (spEffectParamId) {
          const param = statusSpEffectParams[String(spEffectParamId + (offsets[i] ?? 0))];
          if (param) {
            for (const [type, value] of Object.entries(param)) {
              atLevel[Number(type) as AttackPowerType] = value;
            }
          }
        }
      });

      return atLevel;
    });

    // Expand scaling coefficients for each upgrade level.
    const attributeScaling: CalcWeapon["attributeScaling"] = reinforceParams.map((reinforceParam) => {
      const atLevel: Partial<Record<string, number>> = {};
      for (const [attribute, unupgraded] of weapon.attributeScaling) {
        atLevel[attribute] = unupgraded * (reinforceParam.attributeScaling[attribute] ?? 0);
      }
      return atLevel;
    });

    return {
      name: weapon.name,
      weaponName: weapon.weaponName,
      affinityId: weapon.affinityId,
      weaponType: weapon.weaponType,
      requirements: weapon.requirements,
      attack,
      attributeScaling,
      attackElementCorrect,
      calcCorrectGraphs: weaponCalcCorrectGraphs,
      paired: weapon.paired,
      sorceryTool: weapon.sorceryTool,
      incantationTool: weapon.incantationTool,
      dlc: weapon.dlc ?? false,
      maxUpgradeLevel: attack.length - 1,
    };
  });
}
