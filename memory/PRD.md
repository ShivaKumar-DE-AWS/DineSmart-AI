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
  - **Explore** — searchable category-filtered list, tap-to-add.
  - **Chat** — SSE streaming via Claude Sonnet (Emergent LLM key). System prompt instructs AI to emit `<recommend>Dish 1|Dish 2</recommend>` block parsed into **Tap-and-Order recommendation cards**.
  - **Talk (Voice)** — browser MediaRecorder → `POST /api/ai-waiter/transcribe` (OpenAI Whisper) → AI chat → `POST /api/ai-waiter/speak` (OpenAI TTS, voice="nova") → audio playback. Mute toggle in header.
- ✅ **Guest login** (`/auth/login`) — dual-tab UI: "I'm a Guest" (default, optional name/phone) and "Mehfil Staff" (legacy email/password). Guest creates a 30-day JWT via `POST /api/auth/guest`.

### Owner / Admin (neutral SmartDine Operations theme — intentionally unchanged per user)
- ✅ **Menu CRUD** (`/admin/menu`) — Add/Edit/Delete dishes via modal editor with tabs for image URL vs file upload (uploads served from `/api/uploads/<filename>`). Available toggle, tags, prep time. Confirm-dialog on delete.
- ✅ **Inventory CRUD** (`/admin/inventory`) — Add/Edit/Delete ingredients, inline quantity edit on blur, low-stock flag.
- ✅ **RoleGuard hydration race fix** — admin deep-links/refresh no longer bounce to login when zustand-persist is mid-rehydration.

### Backend (FastAPI)
- ✅ `POST /api/auth/guest` — lightweight guest JWT issuance.
- ✅ `POST /api/upload/image` — admin multipart upload (≤5MB, jpg/png/webp/gif), served via `/api/uploads/*` static mount.
- ✅ `POST /api/menu`, `DELETE /api/menu/{id}` added (PATCH/GET already existed).
- ✅ `POST /api/inventory`, `DELETE /api/inventory/{id}` added (PATCH/GET already existed).
- ✅ `POST /api/ai-waiter/transcribe` — OpenAI Whisper STT via emergentintegrations.
- ✅ `POST /api/ai-waiter/speak` — OpenAI TTS (tts-1, voice="nova") via emergentintegrations.
- ✅ Updated MehfilAI system prompt to emit recommendation tag block.

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
