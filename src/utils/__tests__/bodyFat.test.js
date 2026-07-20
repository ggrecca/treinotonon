import { describe, expect, it } from "vitest";
import { BODY_FAT_METHOD_REQUIREMENTS, calculateBodyFat } from "../bodyFat";

describe("fórmulas de percentual de gordura", () => {
  it("mantém os resultados históricos de Jackson & Pollock 3", () => {
    expect(calculateBodyFat({
      bodyFatMethod: "jp3", sex: "male", age: "30", skinfoldChest: "20", skinfoldAbdominal: "25", skinfoldThigh: "20",
    })).toMatchObject({calculated: "19,3", final: "19,3", density: "1,1", skinfoldSum: "65", message: ""});

    expect(calculateBodyFat({
      bodyFatMethod: "jp3", sex: "female", age: "28", skinfoldTriceps: "16", skinfoldSuprailiac: "14", skinfoldThigh: "18",
    })).toMatchObject({calculated: "20", final: "20", density: "1,1", skinfoldSum: "48", message: ""});
  });

  it("mantém os resultados históricos de Jackson & Pollock 7", () => {
    const record = {
      bodyFatMethod: "jp7", sex: "male", age: "30", skinfoldChest: "12", skinfoldMidaxillary: "12", skinfoldTriceps: "12",
      skinfoldSubscapular: "12", skinfoldAbdominal: "12", skinfoldSuprailiac: "12", skinfoldThigh: "12",
    };

    expect(calculateBodyFat(record)).toMatchObject({calculated: "12,3", final: "12,3", density: "1,1", skinfoldSum: "84", message: ""});
  });

  it("mantém os resultados históricos do método Navy", () => {
    expect(calculateBodyFat({bodyFatMethod: "navy", sex: "male", height: "175", neck: "38", abdomen: "85"}))
      .toMatchObject({calculated: "17", final: "17", message: ""});
    expect(calculateBodyFat({bodyFatMethod: "navy", sex: "female", height: "165", neck: "33", cintura: "78", hip: "98"}))
      .toMatchObject({calculated: "30,2", final: "30,2", message: ""});
  });

  it("ignora as novas circunferências laterais e mantém o protocolo central", () => {
    const legacyRecord = {bodyFatMethod: "navy", sex: "male", height: "175", neck: "38", abdomen: "85"};
    const lateralRecord = {...legacyRecord, armRight: "36", armLeft: "34", forearmRight: "29", forearmLeft: "28", thighRight: "62", thighLeft: "60", calfRight: "40", calfLeft: "39"};

    expect(calculateBodyFat(lateralRecord)).toEqual(calculateBodyFat(legacyRecord));
    expect(BODY_FAT_METHOD_REQUIREMENTS.navy.lateralPolicy).toContain("Não usa medidas laterais");
  });

  it("não calcula quando faltam dados obrigatórios e identifica os campos", () => {
    const missingJp3 = calculateBodyFat({bodyFatMethod: "jp3", sex: "male", age: "30", skinfoldChest: "20"});
    const missingNavy = calculateBodyFat({bodyFatMethod: "navy", sex: "female", height: "165", neck: "33"});

    expect(missingJp3.calculated).toBeUndefined();
    expect(missingJp3.message).toContain("Abdominal");
    expect(missingJp3.message).toContain("Coxa (dobra cutânea)");
    expect(missingNavy.calculated).toBeUndefined();
    expect(missingNavy.message).toContain("Abdômen ou cintura");
    expect(missingNavy.message).toContain("Quadril");
  });
});
