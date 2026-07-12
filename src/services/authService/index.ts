import { localAuthService } from "./localAuthService";
import { supabaseAuthService } from "./supabaseAuthService";
import { configurationError, isLocalModeEnabled, isSupabaseConfigured } from "../supabase/client";
import type { AuthService } from "./types";

function configurationFailure(): never {
  throw new Error(configurationError || "O aplicativo não está configurado para autenticação.");
}

const unavailableAuthService: AuthService = {
  async getCurrentUser() { return configurationFailure(); },
  async getAuthState() { return configurationFailure(); },
  async signIn() { return configurationFailure(); },
  async signUp() { return configurationFailure(); },
  async resetPassword() { return configurationFailure(); },
  async signOut() { return configurationFailure(); },
  async updateCurrentUser() { return configurationFailure(); },
};

export { configurationError, isLocalModeEnabled, isSupabaseConfigured, localAuthService, supabaseAuthService };
export const authService = isSupabaseConfigured
  ? supabaseAuthService
  : isLocalModeEnabled
    ? localAuthService
    : unavailableAuthService;

export type { AuthService, AuthState, AuthUser, LoginCredentials, SignUpCredentials, UserRole } from "./types";
