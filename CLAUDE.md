# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

"Cardápio Site" (product name: Drenux) is a SaaS multi-tenant digital menu/ordering platform. Each `Loja` (store) has its own public menu at `/:slug`, an admin panel to manage products/orders, Stripe-based subscription plans (start/pro/scale), and an affiliate program with its own login/dashboard. Order notifications go out over WhatsApp (via a self-hosted whatsmeow connection) and transactional email (via Resend).

Repo layout: `backend/` (Go API) and `frontend/` (React SPA), developed and deployed independently.

## Commands

### Backend (Go, from `backend/`)
- Run the API: `go run ./cmd/api` (reads `.env`, falls back to system env vars in production)
- Start Postgres for local dev: `docker compose up -d` (Postgres 16, exposed on host port `5433`)
- Build: `go build ./...`
- Run all tests: `go test ./...` — run a single package's tests with `go test ./internal/service/...`
- Pair the platform WhatsApp number (one-time, run against the same `DATABASE_URL` as the API): `go run ./cmd/whatsapp-pair`

### Frontend (from `frontend/`)
- Install: `npm install`
- Dev server: `npm run dev` (Vite, default `http://localhost:5173`)
- Build: `npm run build` (runs `tsc -b` then `vite build`)
- Lint: `npm run lint`
- Preview production build: `npm run preview`

Frontend talks to the backend via `VITE_API_URL` (defaults to `http://localhost:8080`, see `src/api/client.ts`).

## Backend architecture

Layered Gin app wired up entirely by hand in `backend/cmd/api/main.go` — there is no DI framework, so that file is the map of how everything connects (services constructed → handlers constructed → routes registered). When adding a feature, follow the existing layering:

- `internal/domain` — GORM models (one file per entity). `main.go` lists every model passed to `db.AutoMigrate(...)`; add new models there.
- `internal/repository` — direct DB access per entity, used by services.
- `internal/service` — business logic, orchestrates repositories and cross-cutting concerns (Stripe, WhatsApp, distance/geocoding).
- `internal/handler` — Gin HTTP handlers, one per resource; thin, delegate to services.
- `internal/middleware` — two independent JWT auth guards: `AuthRequired` (store owner, sets `usuario_id`/`loja_id` on the Gin context via claims `usuario_id`/`loja_id`) and `AfiliadoRequired` (affiliate, claim `afiliado_id`). These are separate token spaces — a store-owner token cannot access `/afiliado/*` routes and vice versa.
- `internal/notification` — outbound notifications: `sender.go` defines the `NotificationSender` interface, `whatsmeow_sender.go` is the WhatsApp implementation (session persisted in the shared Postgres DB), `email_sender.go` wraps Resend. The API continues to run even if WhatsApp fails to connect at boot (logs a warning; `whatsappSender` stays nil-safe).
- `internal/config` — all env vars loaded through `config.Load()`; never read `os.Getenv` directly elsewhere.

Routing conventions in `main.go`:
- Public store routes are namespaced under `/lojas/:slug/...` (menu, order placement, order tracking, coupon validation, shipping quote).
- Store-owner admin routes live under `router.Group("/admin")` behind `AuthRequired`.
- Affiliate routes live under `router.Group("/afiliado")` behind `AfiliadoRequired`.
- Stripe webhooks (`/webhooks/stripe`) and the weekly report cron (`/relatorio/semanal`, guarded by `cfg.CronSecret`) are unauthenticated-by-token endpoints protected by other means — don't add JWT middleware to them.

Domain notes:
- `Loja.Plano` is `"start"` (default, no billing) | `"pro"` | `"scale"`. Only Pro/Scale have `StripeCustomerID`/`StripeSubscriptionID` populated. `PlanoAgendado` holds a pending downgrade that self-applies on the next Stripe renewal webhook — don't apply plan downgrades immediately in code, they're deferred by design.
- Two separate delivery-adjacent flows exist: `Pedido` (a normal order placed against a store's menu) and `SolicitacaoEntrega` ("guardados" flow — pre-stored items requesting delivery later), each with their own repository/handler/tracking routes.

## Frontend architecture

- Routing in `src/App.tsx` (`react-router-dom`). `/` is the commercial landing (`Planos`), `/inicio` is the old home. `/:slug` is a catch-all public menu route, so any new top-level route must be declared before it in the `<Routes>` list (see the `/:slug/pedido/:id/rastrear` comment) or it will get swallowed as a store slug.
- Two independent auth contexts, mirroring the backend: `store/authStore.ts` (store owner, guarded by `<RotaProtegida />`) and `store/afiliadoAuthStore.ts` (affiliate, guarded by `<AfiliadoRotaProtegida />`) — both Zustand stores.
- `src/api/client.ts` is the single axios instance: injects the bearer token from `authStore` on every request and force-logs-out + redirects to `/login` on a 401 response. Affiliate API calls use their own token from `afiliadoAuthStore` (check `src/api/afiliado.ts`).
- API calls are organized one file per resource under `src/api/` (e.g. `produtos`, `pedidos`, `cupons`, `afiliado`, `planos`); components/pages consume these through TanStack Query, not raw axios calls.
- `@/` resolves to `src/` (see `vite.config.ts` alias). UI primitives live in `src/components/ui/` (shadcn-style: button, card, badge, accordion, etc.).
- Admin panel pages live under `src/pages/admin/`, nested under the `/admin` layout route (`Dashboard.tsx` is the shell, other pages render inside it). Affiliate pages live under `src/pages/afiliado/`.

## Language

Code comments, log messages, and JSON error keys throughout the backend are in Portuguese (e.g. `gin.H{"erro": "..."}`) — match this convention in both layers when adding new user-facing strings or comments explaining non-obvious behavior.

## Roadmap de melhorias em andamento
@docs/plano-melhorias-drenux.md