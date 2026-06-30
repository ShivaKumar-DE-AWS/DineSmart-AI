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
// IMPORTANT: Always use empty BASE so API calls go through the Next.js rewrite proxy
// on the same origin. NEVER set this to a backend URL — that would make browser-side
// direct calls that hit CORS or expose the backend URL to clients.
const BASE = "";

import { useSession } from "@/stores/session";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return useSession.getState().token || null;
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

  // ponytail: single retry for network errors (Render cold start)
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeoutMs = Number((init as RequestInit & { timeoutMs?: number }).timeoutMs || 60_000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    if (init.signal) {
      if (init.signal.aborted) controller.abort();
      else init.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    try {
      const res = await fetch(`${BASE}${path}`, { ...init, headers, cache: "no-store", signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { 
          const j = await res.json(); 
          if (Array.isArray(j.detail)) {
            msg = j.detail.map((e: any) => e.msg || JSON.stringify(e)).join(", ");
          } else {
            msg = j.detail || j.message || msg; 
          }
        } catch { /* ignore parse errors */ }
        throw new Error(msg);
      }
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) return res.json();
      return (await res.text()) as unknown as T;
    } catch (error) {
      clearTimeout(timeout);
      if (attempt === 1) {
        if (controller.signal.aborted) throw new Error("Request timed out. Please try again.");
        throw error;
      }
      // ponytail: network error — wait 2s for Render cold start, retry once
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error("Unreachable");
}

export const apiUrl = (path: string) => `${BASE}${path}`;
