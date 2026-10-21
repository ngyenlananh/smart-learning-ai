import { apiFetch, getAccessToken, setAccessToken } from "./api";

export type AuthUser = { id: string; email: string; fullName: string; birthDate?: string | null; phone?: string | null; education?: string | null; level?: string | null; avatarUrl?: string | null };
type AuthResponse = { user: AuthUser; accessToken: string };

export async function register(fullName: string, email: string, password: string): Promise<AuthUser> {
  const result = await apiFetch<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify({ fullName, email, password }) });
  setAccessToken(result.accessToken);
  return result.user;
}

export async function login(email: string, password: string, remember: boolean): Promise<AuthUser> {
  const result = await apiFetch<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password, remember }) });
  setAccessToken(result.accessToken);
  return result.user;
}

export async function refresh(): Promise<AuthUser | null> {
  try {
    const result = await apiFetch<AuthResponse>("/api/auth/refresh", { method: "POST" }, false);
    setAccessToken(result.accessToken);
    return await getMe();
  } catch {
    setAccessToken(null);
    return null;
  }
}

export async function getMe(): Promise<AuthUser> {
  const result = await apiFetch<{ user: AuthUser }>("/api/auth/me");
  return result.user;
}

export async function logout(): Promise<void> {
  try { await apiFetch<void>("/api/auth/logout", { method: "POST" }, false); } finally { setAccessToken(null); }
}

export function isAuthenticated() { return Boolean(getAccessToken()); }
