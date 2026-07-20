import { describe, expect, it } from "vitest";
import { resolveRuntimeConfig } from "../runtimeConfig";

describe("resolveRuntimeConfig", () => {
  it("bloqueia produção sem Supabase mesmo quando o modo local foi solicitado", () => {
    const config = resolveRuntimeConfig({PROD:true, VITE_ENABLE_LOCAL_MODE:"true"});
    expect(config.supabaseConfigured).toBe(false);
    expect(config.localModeEnabled).toBe(false);
    expect(config.configurationError).toContain("Configuração incompleta");
  });

  it("permite modo local apenas em desenvolvimento e de forma explícita", () => {
    const config = resolveRuntimeConfig({DEV:true, VITE_ENABLE_LOCAL_MODE:"true"});
    expect(config.localModeEnabled).toBe(true);
    expect(config.configurationError).toBe("");
  });

  it("prioriza Supabase quando as variáveis obrigatórias existem", () => {
    const config = resolveRuntimeConfig({
      PROD:true,
      VITE_SUPABASE_URL:"https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY:"publishable-key",
      VITE_ENABLE_LOCAL_MODE:"true",
    });
    expect(config.supabaseConfigured).toBe(true);
    expect(config.localModeEnabled).toBe(false);
    expect(config.configurationError).toBe("");
  });
});
