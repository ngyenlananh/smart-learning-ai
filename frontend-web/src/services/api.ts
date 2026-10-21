const baseUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;

export function setAccessToken(token: string | null) { accessToken = token; }
export function getAccessToken() { return accessToken; }

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch(`${baseUrl}/api/auth/refresh`, { method: "POST", credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return false;
        const payload = await response.json() as { accessToken?: string };
        if (!payload.accessToken) return false;
        setAccessToken(payload.accessToken);
        return true;
      })
      .catch(() => false)
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers, credentials: "include" });
  if (response.status === 401 && retry && path !== "/api/auth/refresh" && await refreshAccessToken()) {
    return apiFetch<T>(path, init, false);
  }
  const payload = await response.json().catch(() => undefined) as T | { error?: { message?: string } } | undefined;
  if (!response.ok) throw new Error((payload as { error?: { message?: string } } | undefined)?.error?.message ?? "Không thể kết nối máy chủ.");
  return payload as T;
}
