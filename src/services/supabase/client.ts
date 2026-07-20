import { createClient } from "@supabase/supabase-js";
import { runtimeConfig } from "../runtimeConfig";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = runtimeConfig.supabaseConfigured;
export const isLocalModeEnabled = runtimeConfig.localModeEnabled;
export const configurationError = runtimeConfig.configurationError;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;
