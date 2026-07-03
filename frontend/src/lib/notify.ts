"use client";

/**
 * Plays a short chime using Web Audio API — zero external assets.
 * Variants: "new-order" (kitchen) = loud descending alarm; "ready" (customer/counter) = loud ascending bell.
 */
export function playChime(variant: "new-order" | "ready" = "new-order") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx: AudioContext = new AudioCtx();
    const now = ctx.currentTime;

    if (variant === "new-order") {
      // Kitchen — loud descending alarm (square wave, attention-grabbing)
      const tones = [
        { f: 880, t: 0.0 },
        { f: 622, t: 0.15 },
        { f: 880, t: 0.35 },
        { f: 622, t: 0.5 },
      ];
      for (const tone of tones) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(tone.f, now + tone.t);
        gain.gain.setValueAtTime(0, now + tone.t);
        gain.gain.linearRampToValueAtTime(0.45, now + tone.t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + tone.t + 0.28);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + tone.t);
        osc.stop(now + tone.t + 0.32);
      }
    } else {
      // Ready — loud busy bell (square wave, layered, higher gain)
      const tones = [
        { f: 523, t: 0.0 },  // C5
        { f: 659, t: 0.15 }, // E5
        { f: 784, t: 0.3 },  // G5
        { f: 1047, t: 0.45 }, // C6
      ];
      for (const tone of tones) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(tone.f, now + tone.t);
        gain.gain.setValueAtTime(0, now + tone.t);
        gain.gain.linearRampToValueAtTime(0.45, now + tone.t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + tone.t + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + tone.t);
        osc.stop(now + tone.t + 0.55);
      }
    }
    setTimeout(() => ctx.close().catch((err) => console.warn("[notify] AudioContext close failed:", err)), 1800);
  } catch (err) {
    console.warn("[notify] playChime failed:", err);
  }
}

/** Asks for browser Notification permission (no-op on server, idempotent). */
export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") return Notification.permission;
  return await Notification.requestPermission();
}

/** Show a desktop notification (silently no-ops if permission denied). */
export function notify(title: string, body?: string, options: NotificationOptions = {}) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.ico", badge: "/favicon.ico", ...options });
  } catch (err) {
    console.warn("[notify] Notification constructor failed:", err);
  }
}

// =========================================================
// Web Push (service worker + VAPID)
// =========================================================
import { api, apiUrl } from "@/lib/api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

/** Generates or retrieves secure anonymous device ID for privacy-first loyalty and push recognition. */
export function getOrCreateAnonID(): string {
  if (typeof window === "undefined") return "";
  let deviceId = localStorage.getItem("mahika_anon_id");
  if (!deviceId) {
    deviceId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "anon-" + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("mahika_anon_id", deviceId);
  }
  return deviceId;
}

/** Returns true if browser supports Service Worker Push API. */
export function isPushSupported(): boolean {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

/** Subscribe to restaurant-level push notifications. Idempotent. */
export async function subscribeToRestaurantPush(restaurantId: string): Promise<boolean> {
  if (!isPushSupported()) return false;
  const perm = await ensureNotificationPermission();
  if (perm !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const { key } = await api<{ key: string }>("/api/push/vapid-public-key");
    if (!key) return false;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }
    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
    const res = await fetch(apiUrl("/api/push/subscribe"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        restaurant_id: restaurantId,
        device_id: getOrCreateAnonID(),
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn("[push] restaurant subscribe failed:", err);
    return false;
  }
}

export async function subscribeToOrderPush(orderId: string): Promise<boolean> {
  if (!isPushSupported()) return false;
  const perm = await ensureNotificationPermission();
  if (perm !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const { key } = await api<{ key: string }>("/api/push/vapid-public-key");
    if (!key) return false;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }
    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
    const res = await fetch(apiUrl("/api/push/subscribe"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        order_id: orderId,
        device_id: getOrCreateAnonID(),
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn("[push] subscribe failed:", err);
    return false;
  }
}

/** Subscribe to offers after payment/checkout (anonymous lock-screen broadcast). */
export async function subscribeToOffers(restaurantId?: string, orderId?: string): Promise<boolean> {
  if (!isPushSupported()) return false;
  const perm = await ensureNotificationPermission();
  if (perm !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const { key } = await api<{ key: string }>("/api/push/vapid-public-key");
    if (!key) return false;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }
    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
    const res = await fetch(apiUrl("/api/notifications/subscribe"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        restaurant_id: restaurantId,
        order_id: orderId,
        device_id: getOrCreateAnonID(),
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn("[push] subscribeToOffers failed:", err);
    return false;
  }
}
