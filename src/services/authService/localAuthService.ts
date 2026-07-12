import type { AuthService, AuthState, AuthUser, LoginCredentials, SignUpCredentials, UserRole } from "./types";

const AUTH_USER_KEY = "authUser";
const PROFILE_KEY = "profile";
export const LOCAL_USER_ID = "local-user";

function nowIso(): string {
  return new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if(raw === null) return fallback;
    return JSON.parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Auth must not make the local-only app unusable if storage is blocked.
  }
}

function readProfileName(): string {
  const profile = readJson<Record<string, unknown>>(PROFILE_KEY, {});
  return String(profile.name || "").trim();
}

function normalizeRole(role: unknown): UserRole {
  if(role === "coach" || role === "both" || role === "trainer" || role === "admin") return "coach";
  if(role === "athlete") return "athlete";
  return "athlete";
}

function normalizeUser(value: unknown): AuthUser {
  const user = isRecord(value) ? value : {};
  const timestamp = nowIso();
  return {
    id: String(user.id || LOCAL_USER_ID),
    name: String(user.name || readProfileName() || "Usuario Local"),
    email: String(user.email || ""),
    role: normalizeRole(user.role),
    createdAt: String(user.createdAt || timestamp),
    updatedAt: String(user.updatedAt || timestamp),
  };
}

function localDefaultUser(): AuthUser {
  return normalizeUser({id: LOCAL_USER_ID, name: readProfileName() || "Usuario Local", email: "", role: "athlete"});
}

function nameFromEmail(email: string): string {
  const prefix = String(email || "").split("@")[0] || "";
  return prefix.trim() || "Usuario Local";
}

export const localAuthService = {
  async getCurrentUser(): Promise<AuthUser | null> {
    const stored = readJson<unknown>(AUTH_USER_KEY, null);
    return stored ? normalizeUser(stored) : localDefaultUser();
  },

  async getAuthState(): Promise<AuthState> {
    const user = await this.getCurrentUser();
    return {user, isAuthenticated: !!user, isLoading: false};
  },

  async signIn(credentials: LoginCredentials): Promise<AuthUser> {
    const existing = await this.getCurrentUser();
    const email = String(credentials.email || "").trim();
    const user = normalizeUser({
      ...existing,
      id: existing?.id || LOCAL_USER_ID,
      name: existing?.name || nameFromEmail(email),
      email,
      role: existing?.role || "athlete",
      updatedAt: nowIso(),
    });
    writeJson(AUTH_USER_KEY, user);
    return user;
  },

  async signUp(credentials: SignUpCredentials): Promise<AuthUser> {
    const email = String(credentials.email || "").trim();
    const user = normalizeUser({
      id: LOCAL_USER_ID,
      name: String(credentials.name || "").trim() || nameFromEmail(email),
      email,
      role: normalizeRole(credentials.role),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    writeJson(AUTH_USER_KEY, user);
    return user;
  },

  async resetPassword(): Promise<void> {
    throw new Error("Recuperacao de senha disponivel apenas com Supabase configurado.");
  },

  async signOut(): Promise<void> {
    // Local fallback has no remote session; keep authUser intact for compatibility.
  },

  async updateCurrentUser(userPatch: Partial<AuthUser>): Promise<AuthUser> {
    const current = await this.getCurrentUser();
    const user = normalizeUser({
      ...current,
      ...userPatch,
      id: userPatch.id || current?.id || LOCAL_USER_ID,
      updatedAt: nowIso(),
    });
    writeJson(AUTH_USER_KEY, user);
    return user;
  },
} satisfies AuthService;
