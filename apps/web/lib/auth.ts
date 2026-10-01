import { authClient } from './auth-client'

export interface UserSession {
  id: string;
  name: string;
  fullName?: string;
  email: string;
  role?: string;
  phone?: string | null;
  roles: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

const TOKEN_KEY = 'hackathon_access_token';
const REFRESH_TOKEN_KEY = 'hackathon_refresh_token';
const USER_KEY = 'hackathon_user';

export function setAuth(tokens: { accessToken?: string; refreshToken?: string }, user: UserSession): void {
  if (typeof window === 'undefined') return;
  if (tokens.accessToken) {
    localStorage.setItem(TOKEN_KEY, tokens.accessToken);
    document.cookie = `auth_token=${tokens.accessToken}; path=/; max-age=604800; SameSite=Lax`;
  }
  if (tokens.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  document.cookie = `auth_roles=${encodeURIComponent(JSON.stringify(user.roles))}; path=/; max-age=604800; SameSite=Lax`;
  const primaryRole = user.role || user.roles[0] || 'participant';
  document.cookie = `auth_role=${primaryRole}; path=/; max-age=604800; SameSite=Lax`;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getAuthUser(): UserSession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

export async function clearAuth(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await authClient.signOut();
  } catch {
    // Fallback if network fails
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = 'auth_token=; path=/; max-age=0';
  document.cookie = 'auth_roles=; path=/; max-age=0';
  document.cookie = 'auth_role=; path=/; max-age=0';
  document.cookie = 'better-auth.session_token=; path=/; max-age=0';
}

/**
 * Determines the target dashboard path based on the user's role:
 * - organizer   -> /dashboard/organizer
 * - judge       -> /dashboard/judge
 * - mentor      -> /dashboard/mentor
 * - participant -> /dashboard/participant (default)
 */
export function getRedirectPathByRole(roles: string[] = []): string {
  if (roles.includes('organizer')) {
    return '/dashboard/organizer';
  }
  if (roles.includes('judge')) {
    return '/dashboard/judge';
  }
  if (roles.includes('mentor')) {
    return '/dashboard/mentor';
  }
  return '/dashboard/participant';
}
