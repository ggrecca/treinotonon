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

export interface AuthService {
  getCurrentUser(): Promise<AuthUser | null>;
  getAuthState(): Promise<AuthState>;
  signIn(credentials: LoginCredentials): Promise<AuthUser>;
  signUp(credentials: SignUpCredentials): Promise<AuthUser | null>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;
  updateCurrentUser(user: Partial<AuthUser>): Promise<AuthUser>;
}
