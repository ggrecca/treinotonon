import type { User } from "@supabase/supabase-js";
import { supabase } from "../supabase/client";
import type { AuthService, AuthState, AuthUser, LoginCredentials, SignUpCredentials, UserRole } from "./types";

function normalizeRole(role: unknown): UserRole {
  if(role === "coach" || role === "both" || role === "trainer" || role === "admin") return "coach";
  if(role === "athlete") return "athlete";
  return "athlete";
}

type ProfileRow = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
};

function userToAuthUser(user: User, profile?: ProfileRow | null): AuthUser {
  const metadata = user.user_metadata || {};
  return {
    id: user.id,
    name: String(profile?.name || metadata.name || user.email?.split("@")[0] || "Usuario"),
    email: String(profile?.email || user.email || ""),
    role: normalizeRole(profile?.role || metadata.role),
    createdAt: String(profile?.created_at || user.created_at || ""),
    updatedAt: String(profile?.updated_at || user.updated_at || ""),
  };
}

function requireSupabase() {
  if(!supabase) throw new Error("Supabase nao esta configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.");
  return supabase;
}

function authError(message: string | undefined, fallback: string): Error {
  return new Error(message || fallback);
}

function authErrorMessage(error: unknown, fallback: string): string {
  const source = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const message = String(source.message || "");
  const code = String(source.code || source.error_code || source.name || "").toLowerCase();
  const lower = message.toLowerCase();
  if(code.includes("email_not_confirmed") || lower.includes("email not confirmed") || lower.includes("not confirmed")) {
    return "Seu email ainda não foi confirmado. Verifique sua caixa de entrada ou desative a confirmação de email no Supabase durante os testes.";
  }
  if(code.includes("invalid_credentials") || lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    return "Email ou senha inválidos.";
  }
  if(code.includes("weak_password") || lower.includes("password") && (lower.includes("short") || lower.includes("least") || lower.includes("weak"))) {
    return "Senha curta. Use pelo menos 6 caracteres.";
  }
  if(code.includes("email") && code.includes("invalid") || lower.includes("invalid email")) {
    return "Email inválido. Confira o endereço informado.";
  }
  if(lower.includes("already") || lower.includes("registered") || lower.includes("exists")) {
    return "Este email já possui conta. Tente entrar.";
  }
  return message || fallback;
}

function supabaseAuthError(error: unknown, fallback: string): Error {
  return new Error(authErrorMessage(error, fallback));
}

async function ensureProfile(user: User, preferredRole?: UserRole): Promise<AuthUser> {
  const client = requireSupabase();
  const metadata = user.user_metadata || {};
  const fallbackProfile = {
    id: user.id,
    email: user.email || "",
    name: String(metadata.name || user.email?.split("@")[0] || "Usuario"),
    role: normalizeRole(preferredRole || metadata.role),
  };

  const {data: existing, error: selectError} = await client
    .from("profiles")
    .select("id,email,name,role,created_at,updated_at")
    .eq("id", user.id)
    .maybeSingle();
  if(selectError) throw authError(selectError.message, "Nao foi possivel carregar o perfil da conta.");

  if(existing) {
    const existingProfile = existing as ProfileRow;
    const currentRole = normalizeRole(existingProfile.role || preferredRole || fallbackProfile.role);
    const {data, error} = await client
      .from("profiles")
      .update({
        email: user.email || existingProfile.email || "",
        name: existingProfile.name || fallbackProfile.name,
        role: currentRole,
      })
      .eq("id", user.id)
      .select("id,email,name,role,created_at,updated_at")
      .single();
    if(error) throw authError(error.message, "Nao foi possivel preparar o perfil da conta.");
    return userToAuthUser(user, data as ProfileRow);
  }

  const {data, error} = await client
    .from("profiles")
    .insert(fallbackProfile)
    .select("id,email,name,role,created_at,updated_at")
    .single();
  if(error) throw authError(error.message, "Nao foi possivel preparar o perfil da conta.");
  return userToAuthUser(user, data as ProfileRow);
}

export const supabaseAuthService = {
  async getCurrentUser(): Promise<AuthUser | null> {
    const client = requireSupabase();
    const {data, error} = await client.auth.getUser();
    if(error) return null;
    if(!data.user) return null;
    return ensureProfile(data.user);
  },

  async getAuthState(): Promise<AuthState> {
    const user = await this.getCurrentUser();
    return {user, isAuthenticated: !!user, isLoading: false};
  },

  async signIn(credentials: LoginCredentials): Promise<AuthUser> {
    const client = requireSupabase();
    const {data, error} = await client.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    if(error) throw supabaseAuthError(error, "Não foi possível entrar com este email e senha.");
    if(!data.user) throw new Error("Não foi possível entrar. Confira email, senha e confirmação da conta.");
    return ensureProfile(data.user);
  },

  async signUp(credentials: SignUpCredentials): Promise<AuthUser | null> {
    const client = requireSupabase();
    const name = String(credentials.name || "").trim() || String(credentials.email || "").split("@")[0] || "Usuario";
    const role = normalizeRole(credentials.role);
    const {data, error} = await client.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          name,
          role,
        },
      },
    });
    if(error) throw supabaseAuthError(error, "Não foi possível criar a conta.");
    if(!data.user) return null;
    if(!data.session) return null;
    return ensureProfile(data.user, role);
  },

  async resetPassword(email: string): Promise<void> {
    const client = requireSupabase();
    const {error} = await client.auth.resetPasswordForEmail(email);
    if(error) throw supabaseAuthError(error, "Nao foi possivel enviar as instrucoes de recuperacao.");
  },

  async signOut(): Promise<void> {
    const client = requireSupabase();
    const {error} = await client.auth.signOut();
    if(error) throw authError(error.message, "Nao foi possivel sair da conta Supabase.");
  },

  async updateCurrentUser(userPatch: Partial<AuthUser>): Promise<AuthUser> {
    const client = requireSupabase();
    const current = await this.getCurrentUser();
    if(!current) throw new Error("Entre na conta antes de atualizar o usuario.");
    const {data, error} = await client.auth.updateUser({
      data: {
        name: userPatch.name ?? current.name,
        role: userPatch.role ?? current.role,
      },
    });
    if(error || !data.user) throw authError(error?.message, "Nao foi possivel atualizar o usuario.");
    if(userPatch.name !== undefined) {
      const {error: profileError} = await client
        .from("profiles")
        .update({name: String(userPatch.name).trim()})
        .eq("id", current.id);
      if(profileError) throw authError(profileError.message, "Nao foi possivel atualizar o nome no perfil.");
    }
    return ensureProfile(data.user, userPatch.role ?? current.role);
  },
} satisfies AuthService;
