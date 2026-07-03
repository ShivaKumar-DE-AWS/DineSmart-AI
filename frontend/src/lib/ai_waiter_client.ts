/**
 * AI Waiter Client — Event-Driven, Non-Blocking UI Layer
 *
 * Architecture:
 *   - sendAIWaiterEvent()    → fire-and-forget async call to POST /api/ai-waiter/event
 *   - showAIToast()          → Top Toast (ITEM_ADDED compliment, auto-dismiss 3 s)
 *   - showAIUpsellSheet()    → Bottom Sheet modal (CHECKOUT upsell, requires user action)
 *   - showAIWelcomeModal()   → Welcome center modal or floating bubble (QR_SCAN)
 *   - All UI functions inject/re-use a single set of DOM elements to avoid duplicates.
 *
 * Usage (auto-wired on menu page load and cart events):
 *   import { sendAIWaiterEvent } from "@/lib/ai_waiter_client";
 *
 *   // On QR scan / page load
 *   sendAIWaiterEvent({ event_type: "QR_SCAN", restaurant_id: "mehfil" });
 *
 *   // On add to cart
 *   sendAIWaiterEvent({
 *     event_type: "ITEM_ADDED",
 *     restaurant_id: "mehfil",
 *     cart_state: cartItems,
 *     added_item: { item_id: "abc", name: "Chicken Lollipops", price: 280, qty: 1, category: "Starters" },
 *   });
 *
 *   // On proceed to pay
 *   const onCheckout = await sendAIWaiterEvent({
 *     event_type: "CHECKOUT",
 *     restaurant_id: "mehfil",
 *     cart_state: cartItems,
 *   });
 *   // Returns: { dialogue_text, action_type, suggested_items } or null on error
 */

import { api } from "@/lib/api";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AIWaiterCartItem {
  item_id: string;
  name: string;
  price: number;
  qty: number;
  category?: string;
}

export interface AIWaiterEventPayload {
  event_type: "QR_SCAN" | "ITEM_ADDED" | "CHECKOUT";
  restaurant_id: string;
  cart_state?: AIWaiterCartItem[];
  added_item?: AIWaiterCartItem;
  user_language?: string;
}

export interface AISuggestedItem {
  item_id: string;
  name: string;
  price: number;
  reason: string;
}

export interface AIWaiterEventResponse {
  dialogue_text: string;
  action_type: "WELCOME" | "ITEM_VALIDATION" | "UPSELL_OFFER";
  suggested_items: AISuggestedItem[];
}

// ── Core API Call ──────────────────────────────────────────────────────────

/**
 * Fire-and-display: sends the event to the backend and automatically
 * triggers the correct UI component based on action_type.
 *
 * The call is intentionally non-blocking — any error is swallowed silently
 * so the ordering flow is NEVER interrupted by an AI service failure.
 *
 * @param payload         - The event payload to send
 * @param addToCartFn     - Optional callback for CHECKOUT upsell "Add+" button
 * @param proceedPayFn    - Optional callback for CHECKOUT "Proceed to Pay" button
 * @returns               - The parsed AIWaiterEventResponse, or null on error
 */
export async function sendAIWaiterEvent(
  payload: AIWaiterEventPayload,
  addToCartFn?: (item: AISuggestedItem) => void,
  proceedPayFn?: () => void
): Promise<AIWaiterEventResponse | null> {
  try {
    const response = await api<AIWaiterEventResponse>("/api/ai-waiter/event", {
      method: "POST",
      body: JSON.stringify({
        event_type: payload.event_type,
        restaurant_id: payload.restaurant_id,
        cart_state: payload.cart_state ?? [],
        added_item: payload.added_item ?? null,
        user_language: payload.user_language ?? "English",
      }),
    });

    // Route to the correct UI handler
    if (response.action_type === "WELCOME") {
      showAIWelcomeModal(response.dialogue_text);
    } else if (response.action_type === "ITEM_VALIDATION") {
      showAIToast(response.dialogue_text);
    } else if (response.action_type === "UPSELL_OFFER") {
      showAIUpsellSheet(response.dialogue_text, response.suggested_items, addToCartFn, proceedPayFn);
    }

    return response;
  } catch (err) {
    // Silent failure — AI Waiter must never block ordering flow
    console.warn("[AI Waiter] Event failed (non-blocking):", err);
    return null;
  }
}

// ── DOM Bootstrap: inject styles + containers once ─────────────────────────

let _uiReady = false;

function _bootstrapUI(): void {
  if (_uiReady || typeof document === "undefined") return;
  _uiReady = true;

  // ── Inject CSS ────────────────────────────────────────────────────────
  const style = document.createElement("style");
  style.id = "ai-waiter-styles";
  style.textContent = `
    /* ── Top Toast ── */
    #ai-waiter-toast {
      position: fixed;
      top: -100px;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      max-width: 420px;
      background: #1A1A1A;
      color: #FFFFFF;
      padding: 12px 18px;
      border-radius: 50px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      z-index: 9999;
      transition: top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      pointer-events: none;
    }
    #ai-waiter-toast.show { top: 20px; }
    #ai-waiter-toast .toast-icon { font-size: 20px; flex-shrink: 0; }
    #ai-waiter-toast .toast-text {
      font-size: 13px;
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.45;
      margin: 0;
    }

    /* ── Overlay ── */
    #ai-waiter-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.50);
      backdrop-filter: blur(3px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
      z-index: 9997;
    }
    #ai-waiter-overlay.show { opacity: 1; pointer-events: auto; }

    /* ── Bottom Sheet ── */
    #ai-waiter-sheet {
      position: fixed;
      bottom: -100%;
      left: 0; right: 0;
      background: #FFFFFF;
      border-radius: 24px 24px 0 0;
      padding: 28px 20px 32px;
      box-shadow: 0 -6px 30px rgba(0,0,0,0.12);
      z-index: 9998;
      transition: bottom 0.4s cubic-bezier(0.1, 1, 0.2, 1);
      font-family: system-ui, -apple-system, sans-serif;
    }
    #ai-waiter-sheet.show { bottom: 0; }
    .ai-sheet-header {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 10px;
    }
    .ai-sheet-header h3 { margin: 0; font-size: 18px; font-weight: 700; color: #222; }
    .ai-sheet-pitch { font-size: 15px; color: #555; line-height: 1.55; margin-bottom: 22px; }
    .ai-upsell-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
    .ai-upsell-card {
      display: flex; justify-content: space-between; align-items: center;
      background: #F8F9FA; padding: 14px 16px;
      border-radius: 14px; border: 1px solid #E8E8E8;
    }
    .ai-upsell-card h4 { margin: 0 0 2px; font-size: 16px; color: #222; font-weight: 600; }
    .ai-upsell-card .reason { font-size: 12px; color: #888; margin: 0; }
    .ai-upsell-card .price { color: #C0392B; font-weight: 700; font-size: 15px; }
    .ai-add-btn {
      background: #C0392B; color: #FFF; border: none;
      padding: 10px 18px; border-radius: 10px;
      font-size: 14px; font-weight: 700; cursor: pointer;
      flex-shrink: 0; margin-left: 12px;
      transition: opacity 0.2s;
    }
    .ai-add-btn:active { opacity: 0.8; }
    .ai-skip-btn {
      width: 100%; background: none; border: none;
      color: #777; font-size: 15px; font-weight: 500;
      padding: 14px; cursor: pointer; text-align: center;
    }
    .ai-skip-btn:hover { color: #333; }

    /* ── Welcome Modal ── */
    #ai-waiter-welcome {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 20px;
    }
    #ai-waiter-welcome.hidden { display: none; }
    .ai-welcome-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.4);
      backdrop-filter: blur(4px);
    }
    .ai-welcome-card {
      position: relative;
      background: #FFFFFF;
      border-radius: 20px;
      padding: 32px 24px;
      max-width: 340px;
      width: 100%;
      text-align: center;
      box-shadow: 0 12px 40px rgba(0,0,0,0.2);
    }
    .ai-welcome-icon { font-size: 36px; margin-bottom: 12px; }
    .ai-welcome-card h2 { margin: 0 0 10px; font-size: 20px; font-weight: 700; color: #222; }
    .ai-welcome-card p { margin: 0 0 22px; font-size: 15px; color: #555; line-height: 1.55; }
    .ai-welcome-btn {
      background: #C0392B; color: #FFF; border: none;
      padding: 14px 32px; border-radius: 50px;
      font-size: 16px; font-weight: 700; cursor: pointer;
      width: 100%;
    }
  `;
  document.head.appendChild(style);

  // ── Toast DOM ──────────────────────────────────────────────────────────
  const toast = document.createElement("div");
  toast.id = "ai-waiter-toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.innerHTML = `<span class="toast-icon" aria-hidden="true">✨</span><p class="toast-text" id="ai-toast-msg"></p>`;
  document.body.appendChild(toast);

  // ── Overlay DOM ────────────────────────────────────────────────────────
  const overlay = document.createElement("div");
  overlay.id = "ai-waiter-overlay";
  overlay.setAttribute("role", "dialog");
  document.body.appendChild(overlay);

  // ── Bottom Sheet DOM ───────────────────────────────────────────────────
  const sheet = document.createElement("div");
  sheet.id = "ai-waiter-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.innerHTML = `
    <div class="ai-sheet-header">
      <span aria-hidden="true">✨</span>
      <h3>Chef's Recommendation</h3>
    </div>
    <p class="ai-sheet-pitch" id="ai-sheet-pitch"></p>
    <div class="ai-upsell-list" id="ai-upsell-list"></div>
    <button class="ai-skip-btn" id="ai-skip-btn">No thanks, Proceed to Payment →</button>
  `;
  document.body.appendChild(sheet);

  // ── Welcome Modal DOM ──────────────────────────────────────────────────
  const welcome = document.createElement("div");
  welcome.id = "ai-waiter-welcome";
  welcome.classList.add("hidden");
  welcome.setAttribute("role", "dialog");
  welcome.setAttribute("aria-modal", "true");
  welcome.innerHTML = `
    <div class="ai-welcome-backdrop" id="ai-welcome-backdrop"></div>
    <div class="ai-welcome-card">
      <div class="ai-welcome-icon" aria-hidden="true">👨‍🍳</div>
      <h2>Welcome!</h2>
      <p id="ai-welcome-text"></p>
      <button class="ai-welcome-btn" id="ai-welcome-btn">View Menu</button>
    </div>
  `;
  document.body.appendChild(welcome);
}

// ── UI Functions ───────────────────────────────────────────────────────────

let _toastTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Show a Top Toast notification that auto-dismisses after 3 seconds.
 * Position: slides down from top — keeps thumb-scrolling zone free.
 */
export function showAIToast(message: string, durationMs = 4000): void {
  toast("✨ AI Waiter Suggestion", {
    description: message,
    duration: durationMs,
    style: {
      background: "#FAF5EC",
      color: "#1A1106",
      border: "1px solid #8A6A1B",
      fontSize: "13px",
      fontFamily: "var(--font-editorial, serif)",
      padding: "12px 16px",
      borderRadius: "12px",
      boxShadow: "0 8px 24px rgba(138, 106, 27, 0.18)",
    },
  });
}

/**
 * Show a Bottom Sheet upsell modal.
 * Slides up from bottom, requiring user to either add an item or skip.
 */
export function showAIUpsellSheet(
  pitchText: string,
  items: AISuggestedItem[],
  onAddToCart?: (item: AISuggestedItem) => void,
  onProceedToPay?: () => void
): void {
  _bootstrapUI();
  const overlay = document.getElementById("ai-waiter-overlay");
  const sheet   = document.getElementById("ai-waiter-sheet");
  const pitch   = document.getElementById("ai-sheet-pitch");
  const list    = document.getElementById("ai-upsell-list");
  const skipBtn = document.getElementById("ai-skip-btn");
  if (!overlay || !sheet || !pitch || !list || !skipBtn) return;

  pitch.textContent = pitchText;

  // Build upsell cards
  list.innerHTML = items
    .map(
      (item) => `
      <div class="ai-upsell-card">
        <div>
          <h4>${_esc(item.name)}</h4>
          ${item.reason ? `<p class="reason">${_esc(item.reason)}</p>` : ""}
          <span class="price">₹${item.price.toFixed(0)}</span>
        </div>
        <button class="ai-add-btn" data-item-id="${_esc(item.item_id)}">Add +</button>
      </div>`
    )
    .join("");

  // Wire up Add buttons
  list.querySelectorAll<HTMLButtonElement>(".ai-add-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.itemId;
      const found = items.find((i) => i.item_id === id);
      if (found && onAddToCart) onAddToCart(found);
      _closeSheet();
    });
  });

  // Wire up Skip / Proceed to Pay button
  skipBtn.onclick = () => {
    _closeSheet();
    if (onProceedToPay) onProceedToPay();
  };

  overlay.classList.add("show");
  sheet.classList.add("show");
  // Overlay tap also closes the sheet
  overlay.onclick = () => {
    _closeSheet();
    if (onProceedToPay) onProceedToPay();
  };
}

function _closeSheet(): void {
  document.getElementById("ai-waiter-overlay")?.classList.remove("show");
  document.getElementById("ai-waiter-sheet")?.classList.remove("show");
}

/**
 * Show a Welcome center modal when the customer first opens the menu.
 * Auto-closes after 5 seconds if user does not interact.
 */
export function showAIWelcomeModal(message: string, autoDismissMs = 6000): void {
  toast("👨‍🍳 Welcome Greeting", {
    description: message,
    duration: autoDismissMs,
    style: {
      background: "#FAF5EC",
      color: "#1A1106",
      border: "1px solid #8A6A1B",
      fontSize: "13px",
      fontFamily: "var(--font-editorial, serif)",
      padding: "14px 18px",
      borderRadius: "14px",
      boxShadow: "0 8px 24px rgba(138, 106, 27, 0.18)",
    },
  });
  _bootstrapUI();
  const welcome = document.getElementById("ai-waiter-welcome");
  const text    = document.getElementById("ai-welcome-text");
  const btn     = document.getElementById("ai-welcome-btn");
  if (!welcome || !text || !btn) return;

  text.textContent = message;
  welcome.classList.remove("hidden");

  const close = () => welcome.classList.add("hidden");

  btn.onclick = close;
  document.getElementById("ai-welcome-backdrop")!.onclick = close;

  // Auto-dismiss after delay so it never blocks the menu browse
  setTimeout(close, autoDismissMs);
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Escape HTML to prevent XSS from AI-generated text inserted into DOM. */
function _esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
