import {describe, expect, it} from "vitest";
import {createUiHistoryState, mergeUiHistoryState, readUiHistoryState, uiHistoryDirection} from "../uiHistory";

describe("uiHistory", ()=>{
  it("creates a stable, serializable marker", ()=>{
    expect(createUiHistoryState(2, "alunos|abc")).toEqual({
      treinoTononUi:{index:2, viewKey:"alunos|abc"},
    });
  });

  it("preserves unrelated browser history state", ()=>{
    expect(mergeUiHistoryState({foreign:true}, 1, "treino")).toEqual({
      foreign:true,
      treinoTononUi:{index:1, viewKey:"treino"},
    });
  });

  it("rejects malformed markers", ()=>{
    expect(readUiHistoryState(null)).toBeNull();
    expect(readUiHistoryState({treinoTononUi:{index:-1}})).toBeNull();
    expect(readUiHistoryState({treinoTononUi:{index:1.5}})).toBeNull();
  });

  it("classifies browser navigation direction", ()=>{
    expect(uiHistoryDirection(2, createUiHistoryState(1))).toBe("back");
    expect(uiHistoryDirection(1, createUiHistoryState(2))).toBe("forward");
    expect(uiHistoryDirection(1, createUiHistoryState(1))).toBe("same");
    expect(uiHistoryDirection(1, {})).toBe("external");
  });
});
