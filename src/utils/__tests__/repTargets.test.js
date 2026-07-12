import { describe, expect, it } from "vitest";
import { buildRepPlan, expandRepTargetsForSets, normalizeRepTargets, parseDropTargets, parseRepTargets, setRepTargetLabelForEditing } from "../repTargets";

describe("metas de repetições", () => {
  it("distribui progressivo 12 / 10 / 8 por série", () => {
    const targets = parseRepTargets("12 / 10 / 8");
    expect(expandRepTargetsForSets(targets, 3).map(item => item.label)).toEqual(["12", "10", "8"]);
  });

  it("mantém os textos digitados no editor progressivo", () => {
    expect(normalizeRepTargets(["12", "10", "8"]).map(item => item.label)).toEqual(["12", "10", "8"]);
    expect(normalizeRepTargets(["10-12", "falha"]).map(item => item.label)).toEqual(["10-12", "falha"]);
  });

  it("permite preencher as séries progressivas uma a uma sem perder posições vazias", () => {
    let labels = setRepTargetLabelForEditing([], 3, 0, "12");
    expect(labels).toEqual(["12", "", ""]);
    labels = setRepTargetLabelForEditing(labels, 3, 1, "10");
    expect(labels).toEqual(["12", "10", ""]);
    labels = setRepTargetLabelForEditing(labels, 3, 2, "8");
    expect(labels).toEqual(["12", "10", "8"]);
  });

  it("repete a última meta quando há mais séries que metas", () => {
    const targets = parseRepTargets("12 / 10 / 8");
    expect(expandRepTargetsForSets(targets, 4).map(item => item.label)).toEqual(["12", "10", "8", "8"]);
  });

  it("interpreta drop set 12 + 8 como dois drops em cada série", () => {
    expect(parseDropTargets("12 + 8").map(item => item.label)).toEqual(["12", "8"]);
    const plan = buildRepPlan({type:"DROP SET", reps:"12 + 8", setCount:3});
    expect(plan).toHaveLength(3);
    expect(plan.every(set => set.drops.map(item => item.label).join("+") === "12+8")).toBe(true);
  });

  it("interpreta rest-pause como segmentos repetidos por série", () => {
    const plan = buildRepPlan({type:"REST PAUSE", reps:"10 + 4 + 3", setCount:2});
    expect(plan.map(set => set.drops.map(item => item.label))).toEqual([["10","4","3"],["10","4","3"]]);
    expect(plan.every(set => set.segmentKind === "rest_pause")).toBe(true);
  });
});
