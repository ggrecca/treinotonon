import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = name => readFileSync(resolve(process.cwd(), name), "utf8");

describe("dados corporais e convites", () => {
  it("mantém campos decimais controlados, sem seção recriada, e inclui lateralidade", () => {
    const app = projectFile("src/App.jsx");
    const draft = projectFile("src/utils/bodyRecordDraft.js");
    const css = projectFile("src/style.css");

    expect(app).toContain('type="text" inputMode="decimal" value={values[name] ?? ""}');
    expect(app).toContain("function BodyRecordSection({title, children})");
    expect(app).not.toContain("const Section = ({title, children})");
    expect(app).toContain("patchBodyRecordDraft(current, target)");
    expect(draft).toContain('String(value ?? "")');
    expect(app).toContain('numericField("armRight", "Direito (cm)")');
    expect(app).toContain('numericField("calfLeft", "Esquerda (cm)")');
    expect(app).toContain('record:latestRecord,index:0,editing:true');
    expect(css).toContain(".bodyLateralMeasures{display:grid");
    expect(css).toContain(".bodyLateralMeasures{grid-template-columns:1fr}");
  });

  it("persiste as medidas laterais sem invalidar registros antigos", () => {
    const service = projectFile("src/services/dataService/cloudDataService.ts");
    const migration = projectFile("supabase/migrations/202607200001_body_records_lateral_measurements.sql");

    expect(service).toContain("arm_right_cm: numericValue(item.armRight)");
    expect(service).toContain("calf_left_cm: numericValue(item.calfLeft)");
    expect(migration).toContain("add column if not exists arm_right_cm numeric");
    expect(migration).toContain("add column if not exists calf_left_cm numeric");
  });

  it("remove de fato o convite pendente e mantém o diálogo no viewport", () => {
    const app = projectFile("src/App.jsx");
    const css = projectFile("src/style.css");

    expect(app).toContain("await dataService.deleteCoachStudent(link.id)");
    expect(app).toContain("setCoachStudents(current => current.filter(item => item.id !== link.id))");
    expect(css).toContain(".appDialogOverlay.tt-dialog-backdrop{position:fixed;inset:0;display:flex;align-items:center;justify-content:center");
  });
});
