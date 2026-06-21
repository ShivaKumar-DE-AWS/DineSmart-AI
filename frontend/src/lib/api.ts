// NOTE on storage: JWT lives in zustand persist (sd-session localStorage) for SPA simplicity.
// httpOnly cookies would be more XSS-resistant, but require CSRF mitigation and a full
// fetch refactor with credentials:'include'. Acceptable trade-off for a demo app on
// trusted networks. Mitigation: short JWT TTL (7 days) + no third-party scripts on /admin /kitchen /counter.
//
// IMPORTANT: We read the token from zustand's persisted state rather than a separate
// localStorage key ("sd_token") to prevent cross-restaurant token collision when multiple
// staff tabs are open on different restaurants. zustand state is per-tab until hydrate;
// the old approach overwrote a shared key on every login, causing the wrong JWT to be
// sent on background tabs.
const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("sd-session");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers, cache: "no-store" });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.detail || j.message || msg; } catch (parseErr) {
      console.warn(`[api] could not parse error body for ${path}:`, parseErr);
    }
    throw new Error(msg);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return (await res.text()) as unknown as T;
}

export const apiUrl = (path: string) => `${BASE}${path}`;
