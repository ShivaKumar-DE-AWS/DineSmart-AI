"use client";

/**
 * Plays a short chime using Web Audio API — zero external assets.
 * Variants: "new-order" (kitchen) = double rising beep; "ready" (customer/counter) = bright bell.
 */
export function playChime(variant: "new-order" | "ready" = "new-order") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx: AudioContext = new AudioCtx();
    const now = ctx.currentTime;

    const tones = variant === "new-order"
      ? [{ f: 660, t: 0.0 }, { f: 880, t: 0.18 }]
      : [{ f: 880, t: 0.0 }, { f: 1175, t: 0.12 }, { f: 1568, t: 0.24 }];

    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(tone.f, now + tone.t);
      gain.gain.setValueAtTime(0, now + tone.t);
      gain.gain.linearRampToValueAtTime(0.25, now + tone.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + tone.t + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + tone.t);
      osc.stop(now + tone.t + 0.3);
    }
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {}
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
  } catch {}
}
