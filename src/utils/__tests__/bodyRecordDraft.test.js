import { describe, expect, it } from "vitest";
import { calculateBodyFat } from "../bodyFat";
import { createBodyRecordDraft, patchBodyRecordDraft } from "../bodyRecordDraft";

describe("rascunho dos dados corporais", () => {
  it("preserva a digitação sequencial como texto, incluindo decimais intermediários", () => {
    let draft = createBodyRecordDraft();
    draft = patchBodyRecordDraft(draft, {name: "peso", type: "text", value: "1"});
    draft = patchBodyRecordDraft(draft, {name: "peso", type: "text", value: "1,"});
    draft = patchBodyRecordDraft(draft, {name: "peso", type: "text", value: "1,5"});

    expect(draft.peso).toBe("1,5");
    expect(typeof draft.peso).toBe("string");
  });

  it("aceita ponto, apagamento e substituição de um valor existente", () => {
    let draft = createBodyRecordDraft({peso: 72.8, armRight: 36});
    expect(draft).toMatchObject({peso: "72.8", armRight: "36"});

    draft = patchBodyRecordDraft(draft, {name: "peso", type: "text", value: ""});
    expect(draft.peso).toBe("");
    draft = patchBodyRecordDraft(draft, {name: "peso", type: "text", value: "81.25"});
    expect(draft.peso).toBe("81.25");
  });

  it("mantém as medidas laterais fora dos cálculos de BF", () => {
    const legacy = {bodyFatMethod: "navy", sex: "male", height: "175", neck: "38", abdomen: "85"};
    const draft = createBodyRecordDraft({...legacy, armRight: "36", armLeft: "35", thighRight: "62", thighLeft: "61"});

    expect(calculateBodyFat(draft)).toEqual(calculateBodyFat(legacy));
  });
});
