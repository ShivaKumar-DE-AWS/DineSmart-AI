# Mehfil Restaurant (formerly SmartDine AI) — PRD

## Original Problem Statement
Rebrand the existing "SmartDine AI" restaurant SaaS to **Mehfil Restaurant** — a premium, royal, heritage Hyderabad theme (dark maroon + gold serif headings) on the customer side. Add an AI Waiter that supports text Chat, Voice (Talk), and Menu Explore — all with one-tap ordering from AI suggestions. Wire up full Owner-side CRUD for Menu (with image upload) and Inventory. Customer login must be simplified to a frictionless "Continue as Guest" flow.

## User Personas
- **Guest diner** — no account needed, optional name + phone. Browses the Mehfil menu, chats/talks to MehfilAI, taps to order.
- **Owner / Admin** — manages live Menu (Add/Edit/Delete + image upload), Inventory, Orders, Revenue.
- **Kitchen / Counter** — existing roles (unchanged).

## Implemented (Feb 2026)
### Customer-side (Mehfil royal theme — scoped via `.mehfil` body class)
- ✅ **Menu redesign** with 8 numbered Chapters sidebar, flip cards, live polling.
- ✅ **AI Waiter Dock** with 3 modes:
  - **Explore** — searchable list with per-item +/− qty controls when in tray.
  - **Chat (Mehfil Concierge dark-royal)** — Tone selector (Friendly / Formal / Playful / Poetic) + Language selector (Auto, English, हिन्दी, اردو, తెలుగు, தமிழ், मराठी). System prompt drives humanoid waiter behavior — mirrors guest's energy, asks 1 clarifying question per turn, never says "I am an AI". "YOUR TRAY" ribbon with count + ₹, **tap-and-order chips** for AI recommendations, quick-prompt chips, inline → Checkout pill.
  - **Talk (Voice)** — Whisper STT (respects selected language), AI streaming, OpenAI TTS playback (nova voice), recommendation chips below each AI reply.
- ✅ **Guest login** with dual-tab Guest/Staff flow.
- ✅ **Cart / Checkout / Token / Track-landing / Track-[id] / Reserve** all Mehfil-themed.
- ✅ **Per-item cooking instructions at checkout** — 12 toggleable chips (Less Spicy, Extra Spicy, Double Masala, No Onion, No Garlic, Leg Piece, Chest Piece, Less Oil, Less Salt, Boneless, Extra Raita, Serve Hot) + free-text input per item + general order note. Notes echo in bill summary, persist into order, and are surfaced to Kitchen / Counter / Token pages.
- ✅ **Loyalty at checkout** — name required, phone optional but triggers `POST /api/customers/lookup`; returning guests see "Welcome back, {name} — Member {M-XXXXXX} · {N} visits · {P} points". New members are auto-created.

### Owner / Admin (neutral SmartDine Operations theme)
- ✅ Mobile-responsive layout, sidebar + hamburger drawer.
- ✅ Menu & Inventory CRUD.
- ✅ **Reservations** page (`/admin/reservations`) — filter by status (All / Pending / Confirmed / Seated / Cancelled), per-card actions (Confirm → Mark seated → Cancel), 15-second refresh.
- ✅ **Customer directory** (`/admin/customers`) — full loyalty registry: code, phone, orders, lifetime spend, points, last visit, search by name/phone/code.

### Staff portals
- ✅ **Kitchen** — KDS tickets now show per-item cooking notes as yellow pills under each dish line, plus a separate "Tonight's mehfil" reservations panel listing today's bookings (time, name, phone, guests, special requests, status).
- ✅ **Counter** — Ready cards show per-item notes block so the runner sees "1× Chicken Dum Biryani: Less spicy, Leg piece" before handing the bag over.

### Backend
- ✅ `POST /api/customers/lookup` + `GET /api/customers` (admin), customer auto-create with unique `M-XXXXXX` code, 1 point per ₹100, lifetime spend + orders count tracked.
- ✅ `GET /api/reservations/today`, `PATCH /api/reservations/{id}/status`.
- ✅ Chat endpoint accepts `language` + `tone`. System prompt enforces matching reply language + tone + humanoid behavior + only-from-live-menu rule. `model = anthropic/claude-sonnet-4-6`.
- ✅ Whisper STT skips language hint when "auto" (lets Whisper auto-detect).
- ✅ Orders carry `customer_id`, `customer_code`, `customer_phone`, `items[].notes` end-to-end.

### Mobile responsive
- ✅ Viewport meta, responsive section padding, full-width dock on mobile.
- ✅ **AI Waiter Dock** with **3 modes**:
  - **Explore** — searchable category-filtered list. **Per-item +/- qty controls when item is in cart** (live tray reflection).
  - **Chat** — **Mehfil Concierge dark-royal pane** with "YOUR TRAY" ribbon showing count + total in real time, **tap-and-order chips** for AI-recommended dishes (`+ Dish Name · ₹price`), quick-prompt chips ("What's your signature dish?", "Suggest a pairing", "Build me a meal for 2", "Something not too spicy"), inline **→ Checkout** pill, SSE streaming via Claude Sonnet. AI emits `<recommend>` tag parsed into chips.
  - **Talk (Voice)** — MediaRecorder → OpenAI Whisper STT → AI → OpenAI TTS playback, mute toggle, recommended-dish chips below each AI reply.
- ✅ **Guest login** — dual-tab `/auth/login` (Guest with optional name/phone, or Staff email/password).
- ✅ **Cart, Checkout, Token, Track-landing, Track-[id]** — all polished in Mehfil royal theme with Framer Motion micro-animations.
- ✅ **Checkout cooking instructions** — per-item chips: Less Spicy / Extra Spicy / Double Masala / No Onion / No Garlic / Leg Piece / Chest Piece / Less Oil / Less Salt / Boneless / Extra Raita / Serve Hot — plus free-text input per item, plus a general order note. Notes echoed in the "↳" line of the bill summary and persisted on the order document.
- ✅ **Reservation flow** (`/customer/reserve`) — Mehfil-themed form (name, phone, date, time slot, guests pills, special-request note) → POST `/api/reservations`.

### Owner / Admin (neutral SmartDine Operations theme)
- ✅ **Mobile-responsive admin layout** — sticky top bar + hamburger drawer < lg breakpoint, persistent sidebar at lg+. Tables (Inventory, Orders, Customers) wrapped in `overflow-x-auto` with `min-w` for safe horizontal scroll.
- ✅ **Menu CRUD** — Add/Edit/Delete dishes via modal editor with URL or file upload (served from `/api/uploads/*`).
- ✅ **Inventory CRUD** — Add/Edit/Delete ingredients, inline qty edit, low-stock flag.

### Backend (FastAPI)
- ✅ `POST /api/auth/guest`, `POST /api/upload/image`, full menu + inventory CRUD.
- ✅ `POST /api/ai-waiter/transcribe` (Whisper), `POST /api/ai-waiter/speak` (TTS), updated MehfilAI system prompt with `<recommend>` tag.
- ✅ `POST /api/reservations`, `GET /api/reservations` (admin).
- ✅ **Web Push** — `GET /api/push/vapid-public-key`, `POST /api/push/subscribe`, `POST /api/push/test/{order_id}`, automatic push fired on order status change with stage-specific copy. Service worker at `/sw.js`.
- ✅ **Per-item order notes** — `CartItemModel.notes` flows through `_price_cart` → order draft → final order document.

### Mobile responsive
- ✅ Viewport meta added to root layout (`width=device-width, initial-scale=1, theme-color=#5C0E1B`).
- ✅ Customer home sections use `py-14 md:py-24` responsive padding.
- ✅ AI Waiter dock full-width on mobile (`w-full sm:w-[460px]`, `h-[90vh] sm:h-[680px]`).
- ✅ All admin pages now mobile-friendly with hamburger nav.

## Testing Status
- Backend: **14/14 new Mehfil tests + 29/29 SmartDine regression tests PASS** (`/app/backend/tests/test_mehfil.py`, `/app/backend/tests/test_smartdine.py`).
- Frontend: All critical flows verified — guest login, menu chapter nav, flip cards, add to cart, AI chat streaming, recommendation tap cards, admin menu CRUD with live propagation, admin inventory CRUD modal.

## 3rd-Party Integrations
- **Emergent LLM Key** (`sk-emergent-…`) — Claude Sonnet 4.6 for chat, OpenAI Whisper for STT, OpenAI TTS for speech.
- **Stripe** — placeholder (payments not wired; mock checkout currently).

## Backlog (P1 → P3)
- **P1** — Polish remaining customer pages (Cart, Checkout, Live Tracking, Token) with Mehfil branding + Framer Motion transitions.
- **P2** — Web Push notifications for the customer Track page when status changes.
- **P3** — Real Stripe checkout (replace mock payment, COD already works).
- **P3** — Multi-language menu (English / Hindi / Urdu transliteration).
- **P3** — Reservation flow under `/customer/reserve` (currently 404).

## Credentials
See `/app/memory/test_credentials.md`.

## Key Files
- `/app/frontend/src/app/customer/menu/page.tsx`
- `/app/frontend/src/components/customer/AIWaiterDock.tsx`
- `/app/frontend/src/app/auth/login/page.tsx`
- `/app/frontend/src/app/admin/menu/page.tsx`
- `/app/frontend/src/app/admin/inventory/page.tsx`
- `/app/frontend/src/components/shared/RoleGuard.tsx`
- `/app/backend/server.py`
- `/app/frontend/src/styles/mehfil.css`
