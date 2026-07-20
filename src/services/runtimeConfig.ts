export type RuntimeEnvironment = {
  PROD?: boolean;
  DEV?: boolean;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_ENABLE_LOCAL_MODE?: string | boolean;
};

export type RuntimeConfig = {
  isProduction: boolean;
  supabaseConfigured: boolean;
  localModeEnabled: boolean;
  configurationError: string;
};

function enabled(value: unknown): boolean {
  return value === true || String(value || "").trim().toLowerCase() === "true";
}

export function resolveRuntimeConfig(env: RuntimeEnvironment): RuntimeConfig {
  const isProduction = env.PROD === true;
  const supabaseConfigured = Boolean(
    String(env.VITE_SUPABASE_URL || "").trim()
    && String(env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "").trim()
  );
  const localModeEnabled = !isProduction && enabled(env.VITE_ENABLE_LOCAL_MODE);
  const configurationError = supabaseConfigured || localModeEnabled
    ? ""
    : isProduction
      ? "Configuração incompleta: defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no ambiente de produção."
      : "Supabase não configurado. Para desenvolvimento exclusivamente local, defina VITE_ENABLE_LOCAL_MODE=true.";

  return {isProduction, supabaseConfigured, localModeEnabled, configurationError};
}

export const runtimeConfig = resolveRuntimeConfig(import.meta.env as RuntimeEnvironment);
