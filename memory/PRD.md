# SmartDine AI — Product Requirements Document

## 1. Original Problem Statement
Unify two repos (customer site + DineSmart-OS) into a single Next.js application called **SmartDine AI** containing four role-aware portals: `/customer`, `/admin`, `/kitchen`, `/counter`. Preserve the customer site's visual warmth and DineSmart-OS operational features. Stack: Next.js App Router + TypeScript + Tailwind + ShadCN + Supabase-ready architecture.

## 2. Architecture (delivered)
- **Frontend**: Next.js 14 App Router (TS, Tailwind, ShadCN-style primitives, Zustand, TanStack Query, Recharts, Sonner) on port 3000.
- **Backend**: FastAPI on port 8001 — all `/api/*` routes (auth, menu, orders, inventory, analytics, payment, AI waiter SSE).
- **Database**: MongoDB via Motor; document models with idempotent seed.
- **Auth**: HS256 JWT + RBAC (customer/admin/kitchen/counter), client `RoleGuard` redirects.
- **AI Waiter**: Claude Sonnet (4.5) via `emergentintegrations` library, streamed as SSE.
- **Payments**: Mock `/api/payment/intent` — drop-in Stripe later.
- **Data layer**: Repository pattern in `server.py`; swap MongoDB → Supabase by replacing the data functions, contracts unchanged.

## 3. User Personas
- **Diner / Customer** — wants quick browsing, conversational AI help, instant payment, live tracking.
- **Owner / Manager** — wants KPIs, sales charts, menu/inventory control, customer cohorts.
- **Kitchen Staff** — glanceable queue with timers, one-tap status update.
- **Counter Staff** — public-screen token board + hand-over flow.

## 4. Core Requirements (static)
- Single Next.js codebase, four portals, shared component library, shared auth, shared DB layer.
- Visual warmth (clay/cream) for customer & admin; high-contrast dark for kitchen & counter.
- AI Waiter as a signature dockable widget.
- Mock-first payments and data; swappable without UI changes.

## 5. What's been implemented (Jan 17, 2026)
- ✅ Next.js scaffold + Tailwind + custom typography (Space Grotesk / Manrope / Anton / JetBrains Mono).
- ✅ FastAPI backend with idempotent seed (4 users, 8 menu items, 8 inventory items).
- ✅ Customer: landing, menu (filterable), cart, checkout, mock payment, token confirmation, live tracking.
- ✅ AI Waiter dock with SSE streaming, session-persisted history.
- ✅ Admin: dashboard KPIs + revenue chart, orders w/ status mgmt, revenue analytics (7d/30d), inventory editor, menu CRUD toggle, customer analytics.
- ✅ Kitchen KDS: live queue with elapsed timers, late ticket pulse, START/READY actions.
- ✅ Counter: split-screen Preparing/Ready board with massive tokens + SERVED action.
- ✅ JWT login + role-based redirect + `RoleGuard` component.
- ✅ Notifications saved per order on status change.
- ✅ Testing: 22/22 backend pytest pass + full frontend journey via Playwright (all 4 portals).

## 5a. Iteration 2 — Real Payments + In-tab Notifications (Jan 17, 2026)
- ✅ **Real Stripe Checkout** integrated via `emergentintegrations.payments.stripe` (test key `sk_test_emergent`). Server-side amount recomputation prevents price tampering. Mock fallback preserved behind `STRIPE_ENABLED` env toggle.
- ✅ New endpoints: `POST /api/payment/checkout/session`, `GET /api/payment/checkout/status/{id}` (idempotent order materialization on 'paid'), `POST /api/webhook/stripe`, `GET /api/payment/config`.
- ✅ New `/customer/payment-return` page polls status post-Stripe redirect.
- ✅ **Audio chime** (Web Audio API, no external assets) + **browser Notifications API** wired to:
  - Kitchen: new orders trigger `new-order` chime + desktop notification (toggle `kitchen-toggle-sound`)
  - Counter: orders entering `ready` trigger `ready` chime + desktop notification
  - Customer Track: status transition to `ready` triggers chime + "Your order is ready!" notification (opt-in button `track-enable-notif`)
- ✅ Testing: 29/29 backend pytest pass; frontend regression fixed (TrackPage Rules-of-Hooks bug found and patched in iteration_3).

## 5b. Pending / Deferred
- ⏳ **Supabase data layer**: deferred. User provided anon+service keys, but the Python playbook requires a **Transaction Pooler URI** (`postgresql://postgres.[ref]:[pw]@aws-0-[region].pooler.supabase.com:6543/postgres`). Requested from user.
- ⏳ **Real Web Push** (service worker + VAPID, works tab-closed): on backlog. In-tab Notifications shipped now.

## 6. Backlog
**P1**
- Real Supabase adapter (auth + Postgres + Realtime channels replacing polling).
- Real Stripe checkout integration.
- Audio cue on new kitchen ticket / "ORDER UP" sound on counter ready.
- Push/web-push notifications to guest devices when token ready.

**P2**
- AI Waiter tool-calling: let Claude actually add items to the cart on request.
- Multi-restaurant tenancy.
- Menu CRUD (create/edit/delete + image upload), currently only toggle.
- Order printing to thermal printer.
- Daily report email to owner.

**P3**
- Loyalty / wallet.
- Table-side QR ordering with table-mapped tokens.
- Inventory auto-deduction from order line items.

## 7. Next tasks
1. Connect Supabase (when user provides URL + anon key).
2. Replace mock payment with real Stripe (test key is already in env).
3. Wire web-push to "Track" page so guests get notified hands-free.
