# KoinKart — Family Finance & Chores App

A gamified family finance app for Indian families. Kids earn coins for chores, teens track UPI spending and savings goals, parents manage allowances and get AI spending insights with receipt scanning.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at /api)
- `pnpm --filter @workspace/family-finance run dev` — run the React frontend (served at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite, TanStack Query, Wouter, Framer Motion, Recharts, Zustand, Tailwind CSS
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — Drizzle table definitions (families, members, chores, transactions, expenses, savings, allowances, receipts, activity)
- `artifacts/api-server/src/routes/` — Express route handlers (families, members, chores, transactions, expenses, savings, allowances, receipts, insights)
- `artifacts/family-finance/src/` — React frontend with role-based routing (/parent, /teen, /kid)
- `artifacts/family-finance/src/lib/store.ts` — Zustand store for auth (currentMemberId, familyId)

## Architecture decisions

- Role selection is persisted in localStorage via Zustand; no server-side auth for demo
- Receipt scanning uses heuristic text parsing (real impl would use vision AI/document AI)
- AI spending insights are computed server-side from real DB data (no external AI API needed)
- Coin balance updates happen atomically on chore approval — transaction + activity event + streak increment in one Promise.all
- Query params removed from list endpoints to avoid Orval TS2308 name collision; filtering done client-side
- familyId = 1 is the Sharma family demo — hardcoded in the frontend

## Product

Three role-tuned experiences in one app:
- **Kid (Adi):** Gamified quest list, coin counter, streak flames, level/XP bar, savings jar
- **Teen (Priya):** Wallet view, UPI spending tracker, savings goals with progress rings, receipt history
- **Parent (Rahul):** Family dashboard, chore approval, expense analytics with charts, AI insights, allowance manager, receipt scanner

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any OpenAPI spec change, run codegen before touching frontend or backend types
- Query params on list endpoints cause Orval TS2308 collision — avoid adding them; use path-based filtering instead
- `pnpm --filter @workspace/family-finance run typecheck` requires `pnpm run typecheck:libs` first if lib/db schema changed
- Use `sql` template literal from drizzle-orm for arithmetic updates (not `sql.raw`)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
