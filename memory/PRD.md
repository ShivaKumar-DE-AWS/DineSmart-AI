# Mehfil Restaurant (formerly SmartDine AI) — PRD

## Original Problem Statement
Rebrand the existing "SmartDine AI" restaurant SaaS to **Mehfil Restaurant** — a premium, royal, heritage Hyderabad theme (dark maroon + gold serif headings) on the customer side. Add an AI Waiter that supports text Chat, Voice (Talk), and Menu Explore — all with one-tap ordering from AI suggestions. Wire up full Owner-side CRUD for Menu (with image upload) and Inventory. Customer login must be simplified to a frictionless "Continue as Guest" flow.

## User Personas
- **Guest diner** — no account needed, optional name + phone. Browses the Mehfil menu, chats/talks to MehfilAI, taps to order.
- **Owner / Admin** — manages live Menu (Add/Edit/Delete + image upload), Inventory, Orders, Revenue.
- **Kitchen / Counter** — existing roles (unchanged).

## Implemented (Feb 2026)
### Customer-side (Mehfil royal theme — scoped via `.mehfil` body class)
- ✅ **Menu redesign** (`/customer/menu`) — 8 numbered Chapters left-sidebar nav, dark-royal aesthetic, flip-card dish details, image + name + price + ADD layout, search, bestseller/spicy badges, floating cart pill. Polls `/api/menu` every 8s so admin edits reflect live.
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
