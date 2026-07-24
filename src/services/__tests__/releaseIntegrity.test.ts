import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (name: string) => readFileSync(resolve(process.cwd(), name), "utf8");

describe("integridade do pacote de publicação", () => {
  it("mantém o package-lock portátil e sem URLs internas", () => {
    const lockfile = projectFile("package-lock.json");
    expect(lockfile).not.toContain("internal.api.openai.org");
    expect(lockfile).toContain("https://registry.npmjs.org/");
  });

  it("protege todos os campos mutáveis em treinos com histórico", () => {
    const migration = projectFile("supabase/migrations/202607110001_save_workout_atomic.sql");
    for (const field of [
      "rest_after_exercise",
      "general_notes",
      "conjugate_block_id",
      "conjugate_position",
      "conjugate_kind",
    ]) {
      expect(migration.match(new RegExp(`'${field}'`, "g"))?.length || 0).toBeGreaterThanOrEqual(2);
    }
  });

  it("salva sessão executada por uma única RPC transacional", () => {
    const service = projectFile("src/services/dataService/cloudDataService.ts");
    const migration = projectFile("supabase/migrations/202607110003_session_settings_integrity.sql");
    expect(service).toContain('client.rpc("save_workout_session_atomic"');
    expect(service).not.toContain("replacePerformedSets(");
    expect(migration).toContain("create or replace function public.save_workout_session_atomic");
    expect(migration).toContain("delete from public.performed_sets where session_id = v_session_id");
  });

  it("persiste preferências do aplicativo na nuvem", () => {
    const service = projectFile("src/services/dataService/cloudDataService.ts");
    const migration = projectFile("supabase/migrations/202607110003_session_settings_integrity.sql");
    expect(service).toContain('client.rpc("patch_app_settings"');
    expect(migration).toContain("create table if not exists public.app_settings");
  });

  it("inclui campos completos na assinatura visual de treino com histórico", () => {
    const app = projectFile("src/App.jsx");
    for (const field of ["restAfterExercise", "generalNotes", "conjugateBlockId", "conjugatePosition", "conjugateKind"]) {
      expect(app).toContain(field);
    }
    expect(app).toContain("if(sessionIds.some(isUuid)) return false");
  });

  it("remove também a FK padrão do PostgreSQL para conjugate_block_id", () => {
    const migration = projectFile("supabase/migrations/202607110001_save_workout_atomic.sql");
    expect(migration).toContain("workout_exercises_conjugate_block_id_fkey");
    expect(migration).toContain("a.attname = 'conjugate_block_id'");
  });

  it("documenta e recarrega o schema das migrations finais", () => {
    const readme = projectFile("supabase/README.md");
    const migration3 = projectFile("supabase/migrations/202607110003_session_settings_integrity.sql");
    const migration4 = projectFile("supabase/migrations/202607110004_publication_integrity_and_set_loads.sql");
    expect(readme).toContain("202607110003_session_settings_integrity.sql");
    expect(readme).toContain("202607110004_publication_integrity_and_set_loads.sql");
    expect(migration3).toContain("notify pgrst, 'reload schema'");
    expect(migration4).toContain("notify pgrst, 'reload schema'");
  });

  it("impede transferir um treino existente e normaliza conjugados legados", () => {
    const migration = projectFile("supabase/migrations/202607110004_publication_integrity_and_set_loads.sql");
    expect(migration).toContain("Não é permitido transferir ou mudar a origem de um treino existente");
    expect(migration).toContain("method in ('bi_set', 'tri_set')");
    expect(migration).toContain("set method = 'normal'");
  });

  it("mantém metas de carga por série, drop e rest-pause no fluxo completo", () => {
    const app = projectFile("src/App.jsx");
    const service = projectFile("src/services/dataService/cloudDataService.ts");
    expect(app).toContain("targetLoadsBySet");
    expect(app).toContain("dropTargetsBySet");
    expect(app).toContain("DropSetTargetsEditor");
    expect(service).toContain('method === "rest_pause" ? setLoad');
    expect(service).toContain("numericValue(drop.load) ?? defaultLoad");
    expect(service).toContain('select("*, prescribed_sets(*, prescribed_drops(*))")');
    expect(service).toContain("performedSets.length > 0 && performedSets.every");
  });

});
