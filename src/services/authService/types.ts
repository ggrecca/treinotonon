export type UserRole = "athlete" | "coach";

export type AuthUser = {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type SignUpCredentials = LoginCredentials & {
  name?: string;
  role?: UserRole;
};

export type AuthEvent = "INITIAL_SESSION" | "SIGNED_IN" | "SIGNED_OUT" | "PASSWORD_RECOVERY" | "TOKEN_REFRESHED" | "USER_UPDATED" | string;
export type AuthEventListener = (event: AuthEvent) => void;

export interface AuthService {
  getCurrentUser(): Promise<AuthUser | null>;
  getAuthState(): Promise<AuthState>;
  signIn(credentials: LoginCredentials): Promise<AuthUser>;
  signUp(credentials: SignUpCredentials): Promise<AuthUser | null>;
  resetPassword(email: string, options?: {redirectTo?: string}): Promise<void>;
  updatePassword(password: string): Promise<void>;
  onAuthStateChange(listener: AuthEventListener): () => void;
  signOut(): Promise<void>;
  updateCurrentUser(user: Partial<AuthUser>): Promise<AuthUser>;
}
