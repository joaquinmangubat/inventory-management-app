# Development Log

Tracks challenges, resolutions, and lessons learned as we build the inventory management app.

---

## Week 1, Task 1: Next.js + Railway PostgreSQL + Prisma Setup

**Date:** 2026-02-16
**Scope:** Project scaffolding, dependency installation, Prisma initialization, directory structure setup

### Subtasks Completed

1. Scaffold Next.js 14 project (TypeScript, Tailwind, App Router, `src/` directory)
2. Install all project dependencies
3. Initialize Prisma with PostgreSQL and define full database schema
4. Set up project directory structure, shadcn/ui config, and base utilities

---

### Challenge 1: `create-next-app` refuses to scaffold in a non-empty directory

**Problem:** The project directory already contained planning documents (`CLAUDE.md`, `TECHNICAL_SPECIFICATION.md`, `UI_UX_PLAN.md`, etc.). Running `npx create-next-app@14 .` failed with:

```
The directory inventory_web_app contains files that could conflict
```

**Resolution:** Scaffolded into a temp directory (`/tmp/inventory_scaffold`), then copied all generated files back into the project directory.

**Lesson:** When bootstrapping a Next.js project in a directory with existing files, scaffold in a temp location first and merge. Alternatively, start the repo fresh and add planning docs after scaffolding.

---

### Challenge 2: Broken `node_modules` symlinks after copying from temp directory

**Problem:** After copying `/tmp/inventory_scaffold/node_modules` into the project directory, `npm run build` failed with:

```
Error: Cannot find module '../server/require-hook'
```

The `.bin` symlinks inside `node_modules` were pointing back to the temp directory paths, which no longer existed.

**Resolution:** Deleted the copied `node_modules` and ran a fresh `npm install` in the project directory.

**Lesson:** Never copy `node_modules` between directories. Always run `npm install` fresh — symlinks and paths inside `node_modules/.bin` are absolute and machine/path-specific.

---

### Challenge 3: Prisma 7 defaults to the new `prisma-client` generator (breaking change from v5/v6 patterns)

**Problem:** Running `npx prisma init` with Prisma 7.4.0 generated a schema with the new generator:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

This new generator produces a client at `src/generated/prisma/` with significant API differences from the traditional `@prisma/client`:

1. **No index file** — The generated directory has `client.ts`, `browser.ts`, etc. but no `index.ts`. Importing from `@/generated/prisma` failed with `Cannot find module`. Had to import from `@/generated/prisma/client` specifically.

2. **Constructor requires arguments** — `new PrismaClient()` (zero args) threw `Expected 1 arguments, but got 0`. The new client constructor signature requires an options object.

3. **Options require `adapter` or `accelerateUrl`** — The options type is a discriminated union:
   ```typescript
   type PrismaClientOptions = (
     { adapter: SqlDriverAdapterFactory; accelerateUrl?: never } |
     { accelerateUrl: string; adapter?: never }
   ) & { ... }
   ```
   Passing `{}` failed because neither `adapter` nor `accelerateUrl` was provided. The new client no longer reads `DATABASE_URL` from the environment automatically.

**Resolution:** Switched the generator back to the traditional `prisma-client-js`:

```prisma
generator client {
  provider = "prisma-client-js"
}
```

This generates into `node_modules/@prisma/client` as expected, supports `new PrismaClient()` with zero args, and reads `DATABASE_URL` from the environment automatically.

Also cleaned up by removing the `src/generated/` directory and its `.gitignore` entry.

**Lesson:** Prisma 7's new `prisma-client` generator is designed for edge/serverless with explicit driver adapters (e.g., `@prisma/adapter-pg`). For a traditional Next.js + Vercel deployment with a standard PostgreSQL connection, `prisma-client-js` is still the right choice. If we later need edge runtime support, we can revisit the new generator with a proper adapter setup.

---

### Challenge 4: Prisma 7 auto-generates `prisma.config.ts` requiring `dotenv`

**Problem:** Prisma 7 generates a `prisma.config.ts` file that imports `dotenv/config`:

```typescript
import "dotenv/config";
```

This is required for Prisma CLI commands (`prisma migrate dev`, `prisma studio`, etc.) to read `DATABASE_URL` from the `.env` file. However, `dotenv` was not installed.

**Resolution:** Installed `dotenv` as a dev dependency: `npm install -D dotenv`.

**Lesson:** Prisma 7 decouples env loading from the CLI — it now relies on `prisma.config.ts` to handle environment variables. Remember to install `dotenv` (or use Bun, which loads `.env` natively).

---

### Challenge 5: `.env` not in `.gitignore` by default

**Problem:** `create-next-app` only adds `.env*.local` to `.gitignore`. Prisma creates a `.env` file (not `.env.local`) for the `DATABASE_URL`. This `.env` file containing database credentials would be committed by default.

**Resolution:** Added `.env` to `.gitignore`. Created `.env.example` (committed) as a template showing required variables without actual secrets.

**Lesson:** Always verify `.gitignore` covers all env files after adding new tools. Prisma and Next.js use different env file conventions (`.env` vs `.env.local`). Ship a `.env.example` so contributors know what's needed.

---

### Final State After Task 1

```
inventory_web_app/
├── prisma/
│   └── schema.prisma          # 6 models: User, Category, Item, Transaction, Notification, SystemSetting
├── prisma.config.ts            # Prisma CLI config (reads DATABASE_URL via dotenv)
├── src/
│   ├── app/
│   │   ├── (auth)/             # Auth route group (empty, ready)
│   │   ├── (main)/             # Main app route group (empty, ready)
│   │   ├── api/                # API routes (empty, ready)
│   │   ├── globals.css         # shadcn/ui CSS variables
│   │   ├── layout.tsx          # Root layout with Geist fonts
│   │   └── page.tsx            # Placeholder home page
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives (empty, ready)
│   │   ├── layout/             # Shell, sidebar, nav (empty, ready)
│   │   └── shared/             # Reusable components (empty, ready)
│   ├── hooks/                  # Custom hooks (empty, ready)
│   ├── lib/
│   │   ├── db.ts               # Prisma client singleton
│   │   └── utils.ts            # cn() Tailwind merge helper
│   ├── providers/              # React context providers (empty, ready)
│   └── types/                  # Shared TypeScript types (empty, ready)
├── components.json             # shadcn/ui configuration
├── tailwind.config.ts          # Brand colors (arcys/bale) + shadcn/ui theme
├── .env                        # DATABASE_URL (gitignored)
├── .env.example                # Template for required env vars (committed)
├── package.json                # All dependencies installed
└── [planning docs]             # CLAUDE.md, TECHNICAL_SPECIFICATION.md, UI_UX_PLAN.md, etc.
```

**Build status:** Passing (`npm run build` succeeds)
**Next:** Configure Railway PostgreSQL `DATABASE_URL`, run `prisma migrate dev`, then proceed to Task 2 (Database schema / seed data) or Task 3 (Two-tier auth).

---

## Week 1, Task 2: Database Migration & Seed Data

**Date:** 2026-02-17
**Scope:** Run initial Prisma migration, create seed script, populate default data

### Subtasks Completed

1. Install PostgreSQL 15 locally via Homebrew
2. Run initial Prisma migration (`npx prisma migrate dev --name init`) — creates all 6 tables
3. Create seed script (`prisma/seed.ts`) with system settings, categories, and default owner
4. Configure seed command in `prisma.config.ts`
5. Run and verify seed data

---

### Challenge 6: Prisma 7 requires a driver adapter — `new PrismaClient()` with no args no longer works

**Problem:** Prisma 7.4.0's `prisma-client-js` generator now uses the "client" engine type by default, which requires either an `adapter` or `accelerateUrl` in the constructor. Calling `new PrismaClient()` (the traditional zero-args pattern from Prisma 5/6) throws:

```
PrismaClientInitializationError: `PrismaClient` needs to be constructed with a non-empty, valid `PrismaClientOptions`
```

Adding `engineType = "binary"` to the schema generator had no effect — the runtime still enforced the "client" engine validation.

**Resolution:** Installed `@prisma/adapter-pg` and `pg`, then passed a `PrismaPg` adapter to the PrismaClient constructor:

```typescript
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
```

Updated both `src/lib/db.ts` (app) and `prisma/seed.ts` (seed script) to use this pattern.

**Lesson:** Prisma 7 has fully committed to the driver adapter architecture. The traditional "binary" query engine that auto-reads `DATABASE_URL` is gone. Every PrismaClient instance needs an explicit adapter (e.g., `@prisma/adapter-pg` for PostgreSQL). This is a breaking change from Prisma 5/6 patterns — check the migration guide when upgrading.

---

### Challenge 7: `PrismaPg` constructor expects a config object, not a URL string

**Problem:** Passing the DATABASE_URL string directly to `new PrismaPg(process.env.DATABASE_URL!)` threw:

```
TypeError: Cannot use 'in' operator to search for 'password' in postgresql://...
```

**Resolution:** `PrismaPg` accepts a `pg.Pool` or `pg.PoolConfig` object, not a raw connection string. Pass it as:

```typescript
new PrismaPg({ connectionString: process.env.DATABASE_URL! })
```

**Lesson:** Read the TypeScript types for adapter constructors carefully. The `PrismaPg` constructor wraps `pg.Pool` internally, and `pg.Pool` expects a config object with named properties.

---

### Challenge 8: Prisma 7 seed config moved from `package.json` to `prisma.config.ts`

**Problem:** Adding the standard `"prisma": { "seed": "npx tsx prisma/seed.ts" }` to `package.json` (the Prisma 5/6 pattern) didn't work. Running `npx prisma db seed` said "No seed command configured."

**Resolution:** In Prisma 7, seed configuration lives in `prisma.config.ts` under `migrations.seed`:

```typescript
export default defineConfig({
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  // ...
});
```

**Lesson:** Prisma 7 centralizes all CLI configuration in `prisma.config.ts`. The `package.json` `"prisma"` key is no longer used. Check `prisma.config.ts` first for all CLI-related settings.

---

### Final State After Task 2

**Database:** Local PostgreSQL 15 (`inventory_dev` on localhost:5432)

**Tables created (6):**
- `users` — with default owner account (`owner@inventory.local`, password: `changeme123`, must change on first login)
- `categories` — 10 restaurant inventory categories
- `items` — empty, ready for data entry
- `transactions` — empty
- `notifications` — empty
- `system_settings` — 5 default settings (session timeout, edit window, etc.)

**Files modified:**
- `prisma/schema.prisma` — unchanged (schema was already complete from Task 1)
- `prisma/seed.ts` — new seed script
- `prisma/migrations/20260217020958_init/` — initial migration SQL
- `prisma.config.ts` — added seed command
- `src/lib/db.ts` — updated to use `@prisma/adapter-pg` (Prisma 7 requirement)
- `package.json` — added `@prisma/adapter-pg`, `pg`, `tsx` dependencies
- `.env` — set local DATABASE_URL

**Build status:** Passing (`npm run build` succeeds)
**Next:** Task 3 (Two-tier authentication — JWT, PIN/password login).

---

## Week 1, Task 3: Two-Tier Authentication

**Date:** 2026-02-17
**Scope:** JWT auth with HTTP-only cookies, owner (password) and staff (PIN) login flows, force-change-password, middleware route protection

### Subtasks Completed

1. Create shared auth types (`SessionUser`, `UserRole`, `AuthType`)
2. Create Zod validation schemas for all auth forms (login, change-password, change-pin)
3. Implement JWT helpers using `jose` (sign, verify, cookie management) with 90-minute sliding expiry
4. Build 6 API routes: lookup, login, logout, session, change-password, change-pin
5. Create Edge Runtime middleware for route protection and JWT sliding window refresh
6. Install shadcn/ui components (button, input, label, card)
7. Build auth UI: two-step login flow, change-password form, change-pin form
8. Verify production build passes

---

### Challenge 9: Zod v4 changes `ZodError.errors` to `ZodError.issues`

**Problem:** When accessing validation errors from `safeParse()`, using `parsed.error.errors[0]?.message` (the Zod v3 pattern) caused a TypeScript compilation error:

```
Property 'errors' does not exist on type 'ZodError<...>'
```

**Resolution:** Zod v4 renamed the accessor from `.errors` to `.issues`:

```typescript
// Zod v3
const msg = parsed.error.errors[0]?.message;

// Zod v4
const msg = parsed.error.issues[0]?.message;
```

**Lesson:** Zod v4 (4.x) has breaking API changes from v3. The `ZodError` shape changed — `errors` became `issues`. When using Zod v4, always check the current API rather than relying on v3 patterns from tutorials and StackOverflow.

---

### Architecture Decisions

1. **Single `LoginFlow` client component** with internal state machine (email → credential) instead of separate routes. Simpler UX with no URL transitions between steps.

2. **Separate `/api/auth/lookup` endpoint** for Step 1 email check. Keeps the login route single-purpose and lets the UI determine PIN vs password input before submitting credentials.

3. **`mustChangePassword` stored in JWT payload** so middleware can enforce force-change redirects without any database queries. Trade-off: if an admin clears the flag in the DB, the user's existing JWT still carries the old value until they re-authenticate.

4. **Sliding window refresh in middleware** — every authenticated request re-signs the JWT with a fresh 90-minute expiry. This means the session only expires after 90 minutes of *inactivity*, not 90 minutes from login.

5. **Edge Runtime constraint** — Middleware runs in Edge Runtime, so only `jose` is used there (no Prisma, no bcryptjs). JWT verification and re-signing work fine in Edge. All database operations happen in API Route Handlers (Node.js runtime).

---

### Final State After Task 3

**New files (17):**

| File | Purpose |
|------|---------|
| `src/types/auth.ts` | `SessionUser`, `UserRole`, `AuthType` types |
| `src/lib/validations/auth.ts` | Zod schemas for all auth forms |
| `src/lib/auth.ts` | JWT sign/verify, cookie helpers (server-only) |
| `src/app/api/auth/lookup/route.ts` | Email lookup → returns authType |
| `src/app/api/auth/login/route.ts` | Login with bcrypt verification |
| `src/app/api/auth/logout/route.ts` | Clear auth cookie |
| `src/app/api/auth/session/route.ts` | Get session + sliding refresh |
| `src/app/api/auth/change-password/route.ts` | Change password (owners) |
| `src/app/api/auth/change-pin/route.ts` | Change PIN (staff) |
| `middleware.ts` | Route protection + JWT sliding window |
| `src/app/(auth)/layout.tsx` | Centered auth layout |
| `src/app/(auth)/login/page.tsx` | Login page (renders LoginFlow) |
| `src/components/auth/login-flow.tsx` | Two-step login client component |
| `src/app/(auth)/change-password/page.tsx` | Change password page |
| `src/components/auth/change-password-form.tsx` | Change password form |
| `src/app/(auth)/change-pin/page.tsx` | Change PIN page |
| `src/components/auth/change-pin-form.tsx` | Change PIN form |

**shadcn/ui components added:** Button, Input, Label, Card

**Auth flow:**
1. User visits any protected route → middleware redirects to `/login`
2. Email entered → `/api/auth/lookup` returns `authType` (password or pin)
3. Credential entered → `/api/auth/login` verifies, sets JWT cookie
4. If `mustChangePassword` → redirect to `/change-password` or `/change-pin`
5. After change → new JWT issued with `mustChangePassword: false` → redirect to `/dashboard`
6. Every request refreshes JWT expiry (90-minute sliding window)

**Build status:** Passing (`npm run build` succeeds)
**Next:** Task 4 (App shell — sidebar, bottom nav, session timeout warning).

---

## Week 1, Task 4: App Shell — Sidebar, Bottom Nav, Session Timeout

**Date:** 2026-02-18
**Scope:** Main layout wrapper for all authenticated pages — desktop sidebar, mobile bottom tabs, top header, auth/session providers, TanStack Query setup

### Subtasks Completed

1. Install additional shadcn/ui components (Sheet, Avatar, Badge, Dialog, Separator, Tooltip)
2. Create AuthProvider with `useAuth()` hook (fetches session from `/api/auth/session`)
3. Create QueryProvider for TanStack Query with sensible defaults
4. Create SessionTimeoutProvider with 90-minute inactivity tracking and 5-minute warning
5. Build desktop sidebar (collapsible 240px/64px) with role-based navigation
6. Build mobile bottom tab bar (5 tabs) with "More" slide-up sheet menu
7. Build mobile top header with logo, notification bell placeholder, and user avatar
8. Build AppShell wrapper combining all layout components with loading state
9. Create centralized navigation config (`src/lib/navigation.ts`)
10. Create `(main)/layout.tsx` wiring providers → AppShell → children
11. Create placeholder dashboard page and root redirect

---

### Architecture Decisions

1. **Context split: AuthContext vs SessionTimeoutContext** — Separated into two providers to keep concerns isolated. Auth handles user state and logout; session timeout handles inactivity tracking and warning UI. This avoids unnecessary re-renders — the countdown timer updates every second but only the timeout dialog subscribes to it.

2. **Server Component layout wrapping Client Component providers** — `(main)/layout.tsx` is a Server Component that imports `AuthProvider`, `SessionTimeoutProvider`, and `AppShell` (all `"use client"`). Next.js handles the Server → Client boundary correctly: the layout renders on the server with client component placeholders, then hydrates on the client. This is the recommended App Router pattern.

3. **QueryProvider in root layout, AuthProvider in (main) layout** — TanStack Query is useful globally (even auth pages might need it later), so it wraps at the root level. AuthProvider only wraps `(main)` pages since auth screens don't need user context — they *create* it.

4. **Centralized navigation config** — All nav items (labels, routes, icons, role restrictions) live in `src/lib/navigation.ts`. Both the sidebar and bottom tab bar consume from the same source of truth, preventing drift. The "More" menu items are defined inline in the BottomTabBar since they're mobile-specific.

5. **Client-side session timeout is UX-only** — The real session expiry is enforced server-side by the JWT expiration + middleware sliding window. The client-side `SessionTimeoutProvider` tracks mouse/keyboard/scroll/touch events and shows a warning dialog — it's a courtesy UX feature, not a security boundary. If the client timer and server JWT drift apart, the middleware is authoritative.

6. **Collapsed sidebar state is local** — Using `useState` rather than persisting to localStorage. The sidebar collapse preference resets on page reload. This keeps the implementation simple and avoids hydration mismatches. Can be upgraded to persistent storage later if users request it.

---

### Final State After Task 4

**New files (20):**

| File | Purpose |
|------|---------|
| `src/providers/auth-provider.tsx` | AuthContext provider — fetches session, exposes user/role/logout/refresh |
| `src/providers/query-provider.tsx` | TanStack Query client with 30s staleTime default |
| `src/providers/session-timeout-provider.tsx` | 90-min inactivity tracker, 5-min warning countdown |
| `src/hooks/use-auth.ts` | AuthContext definition + `useAuth()` hook |
| `src/hooks/use-session-timeout.ts` | SessionTimeoutContext + `useSessionTimeout()` hook |
| `src/components/layout/app-shell.tsx` | Main wrapper: sidebar + header + content + bottom tabs + loading spinner |
| `src/components/layout/sidebar.tsx` | Desktop sidebar (collapsible), role-based nav, tooltips when collapsed |
| `src/components/layout/top-header.tsx` | Mobile header with logo, bell icon, avatar |
| `src/components/layout/bottom-tab-bar.tsx` | Mobile bottom tabs (4 + More), sheet menu with owner-only items |
| `src/components/layout/page-header.tsx` | Reusable page title + description + action slot |
| `src/components/auth/session-timeout-dialog.tsx` | Countdown dialog with Stay Signed In / Sign Out |
| `src/lib/navigation.ts` | Nav item definitions (main, admin, bottom, settings) |
| `src/app/(main)/layout.tsx` | Wraps AuthProvider → SessionTimeoutProvider → AppShell |
| `src/app/(main)/dashboard/page.tsx` | Placeholder dashboard page |
| `src/components/ui/sheet.tsx` | shadcn/ui Sheet (slide-up panel) |
| `src/components/ui/avatar.tsx` | shadcn/ui Avatar |
| `src/components/ui/badge.tsx` | shadcn/ui Badge |
| `src/components/ui/dialog.tsx` | shadcn/ui Dialog |
| `src/components/ui/separator.tsx` | shadcn/ui Separator |
| `src/components/ui/tooltip.tsx` | shadcn/ui Tooltip |

**Modified files (2):**

| File | Change |
|------|--------|
| `src/app/layout.tsx` | Added `QueryProvider` wrapper around `{children}` |
| `src/app/page.tsx` | Replaced placeholder with `redirect("/dashboard")` |

**Deleted files (7):** `.gitkeep` placeholders in `(auth)`, `(main)`, `api`, `layout`, `shared`, `hooks`, `providers`, `types` — replaced by real files.

**Component hierarchy:**
```
RootLayout (Server)
  └── QueryProvider (Client)
        ├── (auth)/layout.tsx → Login, Change Password/PIN
        └── (main)/layout.tsx (Server)
              └── AuthProvider (Client)
                    └── SessionTimeoutProvider (Client)
                          └── AppShell (Client)
                                ├── Sidebar (desktop, >= 1024px)
                                ├── TopHeader (mobile, < 1024px)
                                ├── <main>{children}</main>
                                ├── BottomTabBar (mobile, < 1024px)
                                └── SessionTimeoutDialog
```

**Build status:** Passing (`npm run build` succeeds)
**Next:** Week 2 — Item CRUD (Task 3), Category Management (Task 4), Dashboard (Task 2).

---

## Week 2, Task 5: Item Management (CRUD, Price Updates, Activate/Deactivate)

**Date:** 2026-02-20
**Scope:** Full item management feature — API routes, TanStack Query hooks, React Hook Form, DataTable UI, and three pages (list, create, edit)

### Subtasks Completed

1. Install additional shadcn/ui components (table, select, switch, form, alert, sonner, textarea)
2. Create Zod validation schemas (`createItemSchema`, `updateItemSchema`, `updatePriceSchema`) in `src/lib/validations/items.ts`
3. Create shared TypeScript types (`Item`, `Category`, `ItemWithCategory`) in `src/types/items.ts`
4. Build 8 API routes: `GET/POST /api/items`, `GET/PUT /api/items/[id]`, `PUT /api/items/[id]/price`, `PUT /api/items/[id]/activate`, `PUT /api/items/[id]/deactivate`, `GET /api/categories`
5. Create TanStack Query hooks for all item and category operations (`src/hooks/use-items.ts`, `src/hooks/use-categories.ts`)
6. Build `ItemForm` component (React Hook Form + Zod, 13 fields, shared for create and edit)
7. Build `ItemsTable` component (shadcn/ui Table, stock status badges, business badges, inline actions)
8. Build `UpdatePriceModal` component (Dialog with info alert about historical price preservation)
9. Build three pages: `/items` (list with search/filter/inactive toggle), `/items/new`, `/items/[id]/edit`
10. Wire Sonner `<Toaster />` to root layout for app-wide toast notifications
11. Verify production build passes

---

### Challenge 10: TypeScript contravariance error when `onSubmit` prop uses a union type

**Problem:** `ItemForm` was typed with `onSubmit: (data: CreateItemInput | UpdateItemInput) => Promise<void>`. When the edit page passed `handleSubmit: (data: UpdateItemInput) => Promise<void>`, TypeScript rejected it:

```
Type '(data: UpdateItemInput) => Promise<void>' is not assignable to type
'(data: CreateItemInput | UpdateItemInput) => Promise<void>'
```

This is a function parameter contravariance issue. A function that only accepts `UpdateItemInput` can't satisfy a signature that may pass `CreateItemInput`, because `CreateItemInput` is missing `isActive`.

**Resolution:** Unified both create and edit to use `UpdateItemInput` throughout the form. The form always sends `isActive` (defaulting to `true` on create). In the create page, `isActive` is stripped before calling the create mutation:

```typescript
async function handleSubmit(data: UpdateItemInput) {
  const { isActive: _isActive, ...createData } = data;
  await createItem.mutateAsync(createData);
}
```

The API route for `POST /api/items` accepts `CreateItemInput` (no `isActive`), so the field is simply not sent.

**Lesson:** When a form component is shared between create and edit, use the edit schema (superset) for both. Strip extra fields in the create handler rather than trying to maintain two parallel types flowing through the same component.

---

### Challenge 11: `zodResolver` type mismatch with `z.coerce.number()` and `z.boolean().default()`

**Problem:** `useForm<UpdateItemInput>({ resolver: zodResolver(updateItemSchema) })` failed with a TypeScript error:

```
Type 'Resolver<{ currentUnitCostPhp: unknown; allowsDecimal?: boolean | undefined; ... }>'
is not assignable to type 'Resolver<{ currentUnitCostPhp: number; allowsDecimal: boolean; ... }>'
```

The root cause is how Zod v4 infers INPUT vs OUTPUT types:
- `z.coerce.number()` accepts any input — so its INPUT type is `unknown`, but its OUTPUT type is `number`
- `z.boolean().default(false)` makes the field optional at input — INPUT type is `boolean | undefined`, OUTPUT type is `boolean`

`zodResolver` uses the schema's INPUT types when typing the resolver, but `z.infer<typeof schema>` (used for `UpdateItemInput`) gives OUTPUT types. The mismatch causes the error.

**Resolution:** Two changes:
1. Removed `.default()` calls from the schema entirely — defaults are now handled in the form's `defaultValues` instead
2. Cast the resolver: `zodResolver(updateItemSchema) as Resolver<UpdateItemInput>`

```typescript
const form = useForm<UpdateItemInput>({
  resolver: zodResolver(updateItemSchema) as Resolver<UpdateItemInput>,
  defaultValues: {
    allowsDecimal: item?.allowsDecimal ?? false,   // default here, not in schema
    tracksExpiration: item?.tracksExpiration ?? false,
    reorderLevel: item?.reorderLevel ?? 0,
    isActive: item?.isActive ?? true,
    // ...
  },
});
```

**Lesson:** When using `zodResolver` with schemas that include `z.coerce` or `.default()`, there will be a type mismatch between the schema's INPUT type (what the resolver infers) and the OUTPUT type (what `z.infer` gives). The pragmatic fix is to cast the resolver and move defaults to `defaultValues`. Alternatively, use `z.input<typeof schema>` as the form's generic type for full correctness — but this requires a third generic on `useForm` for the transformed output type, which adds complexity.

---

### Challenge 12: Zod v4 renamed `invalid_type_error` to `error` in number constructor

**Problem:** Using the Zod v3/v4-alpha pattern for custom error messages on number fields:

```typescript
z.coerce.number({ invalid_type_error: "Cost must be a number" })
```

Failed with:

```
Type error: Object literal may only specify known properties,
and 'invalid_type_error' does not exist in type '{ error?: string | ... }'
```

**Resolution:** Zod v4 unified error customisation — replace `invalid_type_error` with `error`:

```typescript
z.coerce.number({ error: "Cost must be a number" })
```

**Lesson:** Another Zod v4 breaking change from v3. The per-issue error keys (`invalid_type_error`, `required_error`) were replaced with a single `error` key (or a full `ZodErrorMap` function). Always check the Zod v4 changelog when migrating schemas written against v3 docs.

---

### Architecture Decisions

1. **Single `ItemForm` for both create and edit, driven by an `item?` prop** — When `item` is provided, the form pre-populates and shows the `isActive` toggle. When absent, `isActive` defaults to `true` and the toggle is hidden. This avoids maintaining two near-identical forms and ensures field validation stays in sync between create and edit.

2. **`updateItemSchema` used for both modes** — The update schema is a superset of the create schema (adds `isActive`). Using it for both keeps a single Zod schema powering the form. The create API route uses `createItemSchema` for its own validation — so even if `isActive` slips through the form, the API rejects it.

3. **Activate/deactivate as separate API endpoints instead of a general PATCH** — `PUT /api/items/[id]/activate` and `PUT /api/items/[id]/deactivate` are more explicit than `PATCH /api/items/[id] { isActive: false }`. They make intent clear in logs, and can have independent permission logic later (e.g., if we wanted staff to reactivate but not deactivate).

4. **Price update as a dedicated endpoint** — `PUT /api/items/[id]/price` is separate from the general item update. This matches the UI spec (separate modal) and makes the business rule explicit: changing a price is a distinct action with its own audit implication (prices are snapshotted at transaction time, so the change only affects future transactions).

5. **Client-side debounced search, server-side filtering** — The search input debounces 300ms before updating the TanStack Query key, which triggers a new `GET /api/items?search=...` request. Filtering happens in PostgreSQL (`contains` + `mode: insensitive`), not in JS. This keeps the response small and works correctly even with large item counts.

6. **Owner-only redirect via `useAuth()` in client components** — Rather than server-side protection (which would require reading the cookie in a Server Component), the three item pages use `useAuth()` to check `isOwner` and redirect via `router.replace("/dashboard")` if false. The middleware already blocks unauthenticated users; this check handles the role layer on the client.

---

### Final State After Task 5

**New files (24):**

| File | Purpose |
|------|---------|
| `src/lib/validations/items.ts` | `createItemSchema`, `updateItemSchema`, `updatePriceSchema` + inferred types |
| `src/types/items.ts` | `Item`, `Category`, `ItemWithCategory` TypeScript types |
| `src/app/api/categories/route.ts` | GET — list all categories ordered by `displayOrder` |
| `src/app/api/items/route.ts` | GET (search/filter/showInactive) + POST create (owner only) |
| `src/app/api/items/[id]/route.ts` | GET single + PUT update (owner only) |
| `src/app/api/items/[id]/price/route.ts` | PUT — price-only update (owner only) |
| `src/app/api/items/[id]/activate/route.ts` | PUT — set `isActive: true` (owner only) |
| `src/app/api/items/[id]/deactivate/route.ts` | PUT — set `isActive: false` (owner only) |
| `src/hooks/use-categories.ts` | `useCategories()` — 10-min stale time |
| `src/hooks/use-items.ts` | `useItems`, `useItem`, `useCreateItem`, `useUpdateItem`, `useUpdateItemPrice`, `useDeactivateItem`, `useActivateItem` |
| `src/components/items/item-form.tsx` | React Hook Form + Zod, 13 fields, create/edit shared |
| `src/components/items/items-table.tsx` | shadcn Table with stock/status/business badges and inline actions |
| `src/components/items/update-price-modal.tsx` | Dialog — shows current price, new price input, historical price alert |
| `src/app/(main)/items/page.tsx` | Item list — search, category filter, show-inactive toggle, item count |
| `src/app/(main)/items/new/page.tsx` | Create item page |
| `src/app/(main)/items/[id]/edit/page.tsx` | Edit item page — pre-populated from `useItem(id)` |
| `src/components/ui/table.tsx` | shadcn/ui Table |
| `src/components/ui/select.tsx` | shadcn/ui Select |
| `src/components/ui/switch.tsx` | shadcn/ui Switch |
| `src/components/ui/form.tsx` | shadcn/ui Form (React Hook Form integration) |
| `src/components/ui/alert.tsx` | shadcn/ui Alert |
| `src/components/ui/sonner.tsx` | shadcn/ui Sonner toast wrapper |
| `src/components/ui/textarea.tsx` | shadcn/ui Textarea |

**Modified files (1):**

| File | Change |
|------|--------|
| `src/app/layout.tsx` | Added `<Toaster richColors position="top-right" />` from Sonner |

**Build status:** Passing (`npm run build` succeeds)
**Next:** Task 6 — Dashboard (stock summary bar, item card grid, expiring soon section, inactive items section).

---

## Week 2, Task 6: Dashboard — Stock Overview

**Date:** 2026-02-20
**Scope:** Full dashboard page replacing the placeholder — stock summary stat cards, search/category filters, responsive item card grid, expiring soon collapsible, inactive items collapsible

### Subtasks Completed

1. Install additional shadcn/ui components (collapsible, progress, skeleton)
2. Create `GET /api/items/expiring` endpoint — reads `expiry_alert_days` from SystemSettings, returns items with upcoming/past transaction expiry dates
3. Create `useExpiringItems()` TanStack Query hook (2-minute stale time)
4. Extract `BusinessBadge` from `items-table.tsx` into `src/components/shared/business-badge.tsx`
5. Add `ExpiringItem` interface to `src/types/items.ts`
6. Build `StockSummaryBar` — 4 stat cards (Total Items, Low Stock, Expiring, Total Value) in 2→4 col responsive grid
7. Build `ItemCard` — shadcn Card with business/stock badges, stock quantity + cost, total value, reorder progress bar, expiry warning
8. Build `ExpiringSoonSection` — collapsible with green checkmark empty state; expired items show "Submit Adjustment" link
9. Build `InactiveItemsSection` — collapsible (hidden when empty); owners get Reactivate button, staff see read-only list
10. Rewrite `dashboard/page.tsx` from Server Component placeholder to full `"use client"` page with debounced search, category filter, 8-card skeleton loader, and derived stats
11. Update `items-table.tsx` to import `BusinessBadge` from shared location
12. Verify production build passes

---

### Challenge 13: ESLint rejects optional chain + non-null assertion (`?.!`)

**Problem:** The expiring items route initially mapped over items using:

```typescript
const earliest = item.transactions[0]?.expirationDate!;
```

Next.js's build step runs ESLint with `@typescript-eslint/no-non-null-asserted-optional-chain` enabled, which rejects this pattern. The rule exists because `?.` can return `undefined` by design — the `!` assertion silently lies to TypeScript about that.

**Resolution:** Switched from `.map()` to `.flatMap()` with an explicit guard:

```typescript
const result = items.flatMap((item) => {
  const expirationDate = item.transactions[0]?.expirationDate;
  if (!expirationDate) return [];
  // expirationDate is now narrowed to Date — no assertion needed
  ...
});
```

`flatMap` returning `[]` for the guard case keeps the result type clean (`ExpiringItem[]` not `(ExpiringItem | undefined)[]`) and the ESLint rule is satisfied.

**Lesson:** Avoid `?.!` — it combines "might be undefined" with "I promise it's not" in a way that's always wrong. The correct pattern is to explicitly guard with `if (!value) return` (or `return []` in flatMap), which narrows the type safely. If the data model guarantees the value exists (because the query filtered it), trust the guard — don't paper over it with `!`.

---

### Architecture Decisions

1. **`useItems({ showInactive: true })` then client-side split** — The dashboard fetches all items (active + inactive) in a single query and splits them in the component with `.filter()`. This avoids two separate API calls (one for active, one for inactive) that would hit the DB twice and complicate query key invalidation. Since items rarely number more than a few hundred, the in-memory split is negligible.

2. **Expiring items as a separate query, not a derived filter** — Expiry data depends on `Transaction.expirationDate`, which doesn't exist on `Item` itself. A separate `GET /api/items/expiring` endpoint does the join and returns only what's needed. The dashboard combines the two datasets client-side via a `Map<itemId, earliestExpiry>` — O(n) lookup per card render.

3. **`expiryMap` passed down as a lookup, not as a prop on each item** — `ItemCard` receives `earliestExpiry?: string | null` rather than a full `ExpiringItem` object. This keeps the card interface simple and decoupled from the expiry query's shape. The mapping (`expiryMap.get(item.id) ?? null`) happens in the parent, so the card doesn't need to know about the expiring-items API at all.

4. **Collapsible sections default open/closed intentionally** — `ExpiringSoonSection` defaults `open: true` (alerts should be immediately visible) and `InactiveItemsSection` defaults `open: false` (low priority, just reference data). These can be toggled but reset on page reload — same rationale as sidebar collapse state.

5. **`InactiveItemsSection` renders `null` when empty** — Rather than showing an empty collapsed section, the component returns `null` entirely when `items.length === 0`. This keeps the page clean for the common case where all items are active.

6. **8-card skeleton grid matches the item card structure** — The skeleton intentionally mirrors the card's layout (badge row, name row, divider, stat rows, progress bar) so the loading state feels like a content placeholder rather than a generic spinner. Same responsive grid columns as the real grid.

7. **`BusinessBadge` extracted to `src/components/shared/`** — The badge was previously a local function inside `items-table.tsx`. Moving it to `shared/` eliminates duplication between the table and item cards, and makes it available to any future component (transaction rows, reports, etc.) without copy-pasting.

8. **Total Value computed client-side from `qty × currentUnitCostPhp`** — Not stored in the DB (the schema comment confirms this: "stock_value_php is computed at query time"). The stat card does this in a `.reduce()` on the already-fetched `activeItems` array — no extra API call needed.

---

### Final State After Task 6

**New files (10):**

| File | Purpose |
|------|---------|
| `src/app/api/items/expiring/route.ts` | GET — items with expiring/expired transaction dates |
| `src/hooks/use-expiring-items.ts` | `useExpiringItems()` — 2-min stale time |
| `src/components/shared/business-badge.tsx` | Shared Brand A (red) / Brand B (green) brand badge |
| `src/components/dashboard/stock-summary-bar.tsx` | 4 stat cards: Total Items, Low Stock, Expiring, Total Value |
| `src/components/dashboard/item-card.tsx` | Card: brand badge, stock status, value, reorder progress bar, expiry warning |
| `src/components/dashboard/expiring-soon-section.tsx` | Collapsible: expired/expiring items with "Submit Adjustment" link for expired |
| `src/components/dashboard/inactive-items-section.tsx` | Collapsible: inactive items, owner Reactivate button |
| `src/components/ui/collapsible.tsx` | shadcn/ui Collapsible |
| `src/components/ui/progress.tsx` | shadcn/ui Progress |
| `src/components/ui/skeleton.tsx` | shadcn/ui Skeleton |

**Modified files (3):**

| File | Change |
|------|--------|
| `src/types/items.ts` | Added `ExpiringItem` interface |
| `src/app/(main)/dashboard/page.tsx` | Full rewrite — filters, summary bar, skeleton grid, card grid, collapsible sections |
| `src/components/items/items-table.tsx` | Removed local `BusinessBadge`; imports from `@/components/shared/business-badge` |

**Build status:** Passing (`npm run build` succeeds)
**Next:** Task 7 — Category Management admin screen (close out Week 2), then Week 3 transactions.

---

## Week 2, Task 7: Category Management Admin Screen

**Date:** 2026-02-21
**Scope:** Owner-only admin screen at `/admin/categories` — list with item counts, add, rename, reorder (up/down), and delete with conflict protection

### Subtasks Completed

1. Install shadcn/ui AlertDialog component
2. Create Zod validation schemas (`createCategorySchema`, `updateCategorySchema`, `reorderCategorySchema`) in `src/lib/validations/categories.ts`
3. Add `CategoryWithCount` interface to `src/types/items.ts`
4. Update `GET /api/categories` to support `?includeCount=true` param; add `POST /api/categories` (owner only, unique name check, auto `displayOrder`)
5. Create `PUT /api/categories/[id]` (rename, unique name check) and `DELETE /api/categories/[id]` (blocked if category has any items)
6. Create `PUT /api/categories/[id]/reorder` — swaps `displayOrder` with the adjacent category in a Prisma transaction
7. Extend `src/hooks/use-categories.ts` with `useAdminCategories`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory`, `useReorderCategory`
8. Build `src/app/(main)/admin/categories/page.tsx` — full single-screen UI with owner guard, add form, inline row editing, hover-reveal delete button, and AlertDialog confirmation
9. Verify production build passes

---

### Architecture Decisions

1. **`GET /api/categories?includeCount=true` vs. a separate endpoint** — Added an opt-in `includeCount` query param to the existing categories endpoint rather than creating a separate admin endpoint. The item-form dropdown (`useCategories`) continues to get the lightweight response; the admin page (`useAdminCategories`) opts into counts. No code duplication, no extra route file.

2. **Reorder via swap, not full re-index** — `PUT /api/categories/[id]/reorder` finds the adjacent category and swaps their `displayOrder` values in a Prisma `$transaction`. This avoids updating every category's order when one moves, and keeps the operation atomic. The alternative (storing fractional order values or shifting all rows) would be more complex for no real benefit at this scale.

3. **Delete blocked if ANY items exist (active or inactive)** — The spec says "cannot delete categories with active items," but blocking only on active items would allow deletions that violate the PostgreSQL foreign key constraint (inactive items still reference the category). Blocking on total item count is safer and the error message guides the owner to reassign items first.

4. **Inline edit within the row, delete button revealed on hover** — Keeps the list visually clean when scanning many categories. The delete trash icon appears on `group-hover` via Tailwind, reducing accidental clicks. On mobile (no hover state), it's always visible.

5. **AlertDialog adapts based on item count** — If `_count.items > 0`, the dialog shows a "cannot delete" informational message with only a Close button. If 0 items, it shows a confirmation dialog with a destructive Delete action. One component handles both states with a `hasItems` flag.

6. **`staleTime: 0` for `useAdminCategories`** — Unlike the item-form dropdown (10-minute stale time), the admin page always fetches fresh data. This ensures item counts and order are always accurate after mutations. The cost is minimal since this page is rarely visited.

---

### Final State After Task 7

**New files (5):**

| File | Purpose |
|------|---------|
| `src/lib/validations/categories.ts` | `createCategorySchema`, `updateCategorySchema`, `reorderCategorySchema` + inferred types |
| `src/app/api/categories/[id]/route.ts` | PUT (rename, owner only) + DELETE (blocked if has items, owner only) |
| `src/app/api/categories/[id]/reorder/route.ts` | PUT — swap `displayOrder` with adjacent category (owner only) |
| `src/app/(main)/admin/categories/page.tsx` | Full category management page — add, inline edit, reorder, delete |
| `src/components/ui/alert-dialog.tsx` | shadcn/ui AlertDialog |

**Modified files (3):**

| File | Change |
|------|--------|
| `src/app/api/categories/route.ts` | Added `?includeCount=true` support + `POST` create endpoint |
| `src/types/items.ts` | Added `CategoryWithCount` interface |
| `src/hooks/use-categories.ts` | Added `useAdminCategories`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory`, `useReorderCategory` |

**Build status:** Passing (`npm run build` succeeds)
**Week 2 status:** Complete ✓
**Next:** Week 3 — Task 8: Transaction entry (new transaction form, confirmation modal, success screen, 5-minute edit window).

---

## Testing Session: Environment & Middleware Bug Fixes

**Date:** 2026-02-21
**Scope:** First live test of the app revealed two silent configuration bugs that prevented authentication from working entirely

---

### Challenge 14: `JWT_SECRET` missing from `.env`

**Problem:** The `.env` file only contained `DATABASE_URL`. `JWT_SECRET` was never added after initial setup. Without it:
- `getSecret()` in both `src/lib/auth.ts` and `src/middleware.ts` throws at runtime
- Token signing (`signToken`) and verification (`verifyToken`) both fail
- The login route cannot issue a JWT — login would never work

The app appeared to load (the dashboard rendered) because the middleware wasn't running (see Challenge 15), and the dashboard page itself doesn't require a valid session to render its HTML shell. The `AuthProvider` session fetch returned 401 silently, leaving `user = null` and `isOwner = false`.

**Resolution:** Generated a secure secret with `openssl rand -base64 32` and added it to `.env`:

```
JWT_SECRET="..."
```

**Lesson:** Environment variables that are required for core functionality (auth, payments, etc.) should be verified to exist as part of the initial setup checklist — not discovered during the first live test. The `.env.example` file correctly listed `JWT_SECRET` as required, but it was never actually set. A startup check that throws early with a clear error message is better than a silent runtime failure.

---

### Challenge 15: `middleware.ts` in the wrong location — silently ignored by Next.js

**Problem:** `middleware.ts` was placed in the project root (`/middleware.ts`). With a `src/` directory structure, Next.js **silently ignores** middleware in the project root — no error, no warning, no indication the file is being skipped. Every request reached the dashboard without authentication.

Confirmed by adding a `console.log` to the middleware function — it never appeared in the server output, despite requests hitting `/dashboard` with `200` responses.

The build output was the final clue: without the correct placement, the build showed no middleware entry. After moving to `src/middleware.ts`, the build correctly showed:

```
ƒ Middleware   33.5 kB
```

**Resolution:** Moved `middleware.ts` from the project root into `src/`:

```
middleware.ts  →  src/middleware.ts
```

**Lesson:** Next.js is silent when it can't find middleware — it doesn't warn you that authentication is completely bypassed. When using a `src/` directory, middleware **must** live at `src/middleware.ts`. Always verify middleware is active by checking the build output for the `ƒ Middleware` entry, or by confirming unauthenticated requests are redirected to login before shipping.

---

## Week 3, Task 8: Transaction Entry

**Date:** 2026-02-23
**Scope:** Full transaction entry feature — new transaction form, confirmation modal, success screen with 5-minute edit window, and edit transaction page

### Subtasks Completed

1. Install additional shadcn/ui components (popover, command, calendar, radio-group)
2. Create Zod validation schemas (`createTransactionSchema`, `editTransactionSchema`) in `src/lib/validations/transactions.ts`
3. Create shared TypeScript types (`Transaction`, `TransactionWithDetails`) in `src/types/transactions.ts`
4. Build 4 API routes: `GET/POST /api/transactions`, `GET/PUT /api/transactions/[id]`
5. Create TanStack Query hooks (`useTransactions`, `useTransaction`, `useCreateTransaction`, `useEditTransaction`) in `src/hooks/use-transactions.ts`
6. Build `TransactionForm` component — item combobox (Command + Popover grouped by category), quantity stepper, brand radio with last-used hint, type radio, conditional expiration date picker, notes
7. Build `ConfirmationModal` — full-width brand color banner, item/action/expiry/new-stock summary, negative stock warning, expiry-within-threshold warning
8. Build `SuccessScreen` — brand card summary, 5-minute countdown edit button, "Log Another" + "Back to Dashboard" actions
9. Build `NewTransactionPage` — state machine (form → confirming → success) with mutation wiring
10. Build `EditTransactionPage` — pre-populated form, countdown banner, read-only item/type fields, edit window expiry guard
11. Verify production build passes

---

### Architecture Decisions

1. **State machine in the page, not in a reducer** — `NewTransactionPage` uses a simple `useState<"form" | "confirming" | "success">` to switch between the three screens. The form and modal share `pendingData` + `pendingItem` state, and the success screen gets the `submittedTransaction` from the mutation result. No `useReducer` or external state needed at this complexity.

2. **Item combobox groups results by category** — The Command component groups items with `CommandGroup` headers per category. Categories are derived from the fetched items array using a `Map<string, ItemWithCategory[]>` built inline. This gives the same category ordering as the items API (sorted by `displayOrder`) without a separate API call.

3. **Last-used brand stored in `localStorage`, never pre-selected** — The spec requires a "Last used: X" hint with no pre-selection. `localStorage` is read on mount via `useEffect` (safe for SSR since the form is a client component). The brand is written to `localStorage` on successful form submission. This is a pure UX hint — the user must always explicitly choose a brand.

4. **`expirationDate` field is conditionally shown and required** — The expiry picker renders only when `selectedItem.tracksExpiration === true AND transactionType === "add"`. Validation happens both client-side (the field is required when visible) and server-side (the API enforces it too). For all other cases, the field is excluded from the submitted payload.

5. **Edit window enforced on both client and server** — The edit page calculates `secondsLeft` from `transaction.timestamp` on mount and shows a countdown banner. If the window is already expired when the page loads, it renders a "window expired" message instead of the form. The server independently re-checks the 5-minute window on `PUT /api/transactions/[id]`. Client-side is UX; server-side is authoritative.

6. **`db.$transaction([...])` for atomic stock updates** — Both the create and edit API routes use Prisma's `$transaction` to run the `transaction.create/update` and `item.update` atomically. This prevents a race condition where the transaction record is written but the stock update fails (or vice versa).

7. **Negative stock creates owner notifications** — When `newStock < 0`, the POST route fetches all active owners and calls `db.notification.createMany`. This is a fire-and-forget within the same request — the transaction is already committed by the time the notifications are created. (Notifications are informational; their failure wouldn't roll back the stock change anyway.)

8. **Edit recalculates stock delta, not absolute** — The PUT edit route computes `stockDiff = newQuantityChange - oldQuantityChange` and applies it to the item's *current* `quantityInStock`. This correctly handles the case where other transactions happened between the original log and the edit — it doesn't reset stock to an old calculation, it adjusts by the difference.

---

### Final State After Task 8

**New files (14):**

| File | Purpose |
|------|---------|
| `src/lib/validations/transactions.ts` | `createTransactionSchema`, `editTransactionSchema` + inferred types, `BUSINESS_ENTITIES` constant |
| `src/types/transactions.ts` | `Transaction`, `TransactionWithDetails`, `TransactionType`, `BusinessEntity` types |
| `src/app/api/transactions/route.ts` | GET (list with filters) + POST create (atomic stock update, negative stock notifications) |
| `src/app/api/transactions/[id]/route.ts` | GET single + PUT edit (5-min window check, delta stock recalculation) |
| `src/hooks/use-transactions.ts` | `useTransactions`, `useTransaction`, `useCreateTransaction`, `useEditTransaction` |
| `src/components/transactions/transaction-form.tsx` | Full form with item combobox, stepper, brand radio, type radio, conditional date picker |
| `src/components/transactions/confirmation-modal.tsx` | Brand banner modal with warnings for negative stock and near-expiry batches |
| `src/components/transactions/success-screen.tsx` | Success card with 5-minute countdown edit button and navigation actions |
| `src/app/(main)/transactions/new/page.tsx` | State machine page: form → confirming → success |
| `src/app/(main)/transactions/[id]/edit/page.tsx` | Edit form with read-only fields, countdown banner, expiry window guard |
| `src/components/ui/popover.tsx` | shadcn/ui Popover |
| `src/components/ui/command.tsx` | shadcn/ui Command (combobox) |
| `src/components/ui/calendar.tsx` | shadcn/ui Calendar |
| `src/components/ui/radio-group.tsx` | shadcn/ui RadioGroup |

**Build status:** Passing (`npm run build` succeeds)
**Next:** Task 9 — Transaction History screen (`/transactions` list with filters, edit badge, adjustment status).

---

## Week 3, Task 9: Transaction History

**Date:** 2026-02-23
**Scope:** Transaction history page at `/transactions` — filterable list of all stock movements with color-coded cards, edit indicators, and adjustment status

### Subtasks Completed

1. Extend `GET /api/transactions` to support `search` (item name), `from`, and `to` (date range) query params
2. Extend `useTransactions` hook to accept and forward the new filter fields
3. Add `rejectionReason` to `TransactionWithDetails` type in `src/types/transactions.ts`
4. Extract `useDebounce` into a shared hook (`src/hooks/use-debounce.ts`); refactor dashboard to use it instead of inline `useRef`/`useEffect`
5. Build `TransactionCard` component — type badge, brand badge, quantity change, stock after, expiry date (color-coded), notes preview, rejection reason, logged-by + relative timestamp, context-aware edit button
6. Build `/transactions` history page — debounced search, brand/type selects, from/to date pickers, clear filters button, skeleton loading, empty state, result count
7. Verify production build passes, commit and push

---

### Architecture Decisions

1. **Date range filtered on the server, not client** — `from` and `to` are passed as ISO date strings and converted to `Date` objects in the API route. The `to` date is extended to `23:59:59.999` so the entire day is included (a `to` of "2026-02-23" catches transactions up to end of that day, not just midnight). Filtering server-side keeps the response payload small — no point returning 1,000 transactions to filter 50 in the browser.

2. **`useDebounce` extracted as a shared hook** — The dashboard was already doing debounce inline with `useRef`/`useEffect`. Rather than duplicating that pattern in the history page, it was lifted into `src/hooks/use-debounce.ts`. The dashboard was refactored to use it too — same behaviour, 8 fewer lines of boilerplate per usage site.

3. **Edit button on the card, not on a separate actions menu** — The card shows an inline Edit button only when both conditions are true: the transaction is within the 5-minute window AND `loggedByUserId === currentUserId`. This is determined entirely client-side from the transaction timestamp and the auth context — no extra API call. The server re-validates on the PUT request.

4. **Expiry color coding uses three thresholds** — Green (> `expiryAlertDays` days remaining), amber (≤ `expiryAlertDays` and > 0), red (past expiry). The threshold defaults to 7 days, matching the `expiry_alert_days` system setting seed value. Only shown on `add` transactions since consume transactions don't carry an expiry date.

5. **`limit: 100` with a count indicator** — The history page fetches up to 100 transactions. If exactly 100 are returned, a "(showing latest 100)" note appears beneath the count. This is an honest cap that avoids infinite scroll complexity at this stage; pagination can be added later if needed.

6. **"Clear filters" button is conditionally rendered** — It only appears when at least one filter is active, keeping the UI clean for the default (unfiltered) state. The check is a simple derived boolean from all five filter states.

---

### Final State After Task 9

**New files (3):**

| File | Purpose |
|------|---------|
| `src/hooks/use-debounce.ts` | Generic `useDebounce<T>(value, delay)` hook — replaces inline debounce patterns |
| `src/components/transactions/transaction-card.tsx` | Transaction card: type/brand badges, quantity, stock after, expiry (color-coded), notes, edit button, rejection reason, footer |
| `src/app/(main)/transactions/page.tsx` | History page: search, brand/type/date filters, skeleton, card list, empty state |

**Modified files (4):**

| File | Change |
|------|--------|
| `src/app/api/transactions/route.ts` | Added `search`, `from`, `to` filter params with server-side Prisma filtering |
| `src/hooks/use-transactions.ts` | Added `search`, `from`, `to` to filter interface and URLSearchParams construction |
| `src/types/transactions.ts` | Added `rejectionReason: string | null` to `Transaction` interface |
| `src/app/(main)/dashboard/page.tsx` | Replaced inline debounce with `useDebounce` hook; removed `useRef`/`useEffect` |

**Build status:** Passing (`npm run build` succeeds)
**Week 3 status:** Complete ✓
**Next:** Week 4 — Adjustment workflow (submit adjustment → owner review → approve/reject).

---

## Week 4, Task 10: Adjustment Submission Form

**Date:** 2026-02-24
**Scope:** Adjustment submission form at `/adjustments/new` — item selector, direction toggle, quantity stepper, brand radio, reason select, required notes, query param pre-population from dashboard expiring items links, owner notifications on submit

### Subtasks Completed

1. Create Zod validation schema (`createAdjustmentSchema`) in `src/lib/validations/adjustments.ts` with `ADJUSTMENT_REASONS` constant
2. Create shared TypeScript types (`AdjustmentWithDetails`, `AdjustmentStatus`, `AdjustmentReason`) in `src/types/adjustments.ts`
3. Extend `TransactionWithDetails` in `src/types/transactions.ts` to include `adjustmentReason` and `adjustmentNotes` optional fields
4. Build `POST /api/adjustments` route — creates pending adjustment (type `"adjust_pending"`), no stock change at submission, notifies all active owners
5. Create `useCreateAdjustment` TanStack Query hook in `src/hooks/use-adjustments.ts`
6. Build `AdjustmentForm` component — item combobox (same pattern as transaction form), Remove/Add direction toggle, quantity stepper, brand radio with last-used hint, reason select, required notes textarea, query param pre-population for `itemId` and `reason`
7. Update `TransactionCard` — fix `canEdit` guard to exclude all adjustment types (`startsWith("adjust_")`), add adjustment notes + reason display block
8. Build `/adjustments/new` page — Suspense wrapper for `useSearchParams`, pre-populates from `?itemId=&reason=` query params, success toast → redirect to `/transactions`
9. Verify production build passes

---

### Architecture Decisions

1. **`"adjust_pending"` as the stored `transactionType`** — Rather than a single `"adjustment"` type with a separate status field, adjustments use distinct type strings (`adjust_pending`, `adjust_approved`, `adjust_rejected`). This makes the pending queue query trivial (`WHERE transactionType = 'adjust_pending'`), keeps type-encoded status visible in the transaction history without a join, and the `TransactionCard` already handled all three variants. The alternative (single type + approval field derivation) would require a computed status on every query.

2. **Stock is NOT changed at submission** — The pending adjustment stores the projected stock in `stockAfterTransaction` (current + quantityChange) as a preview, but the item's `quantityInStock` is untouched. Stock is only applied when an owner approves (Task 11). This prevents ghost stock changes from unapproved adjustments corrupting live inventory.

3. **Direction toggle (Remove/Add) instead of signed number input** — The form uses a "Remove Stock / Add Stock" toggle with a positive quantity input rather than asking users to enter negative numbers. The sign is applied programmatically before submission. This is safer (no accidental sign confusion) and matches the mental model: "I want to remove 5 units because they expired."

4. **Owner notifications fire on submission** — All active owners receive an `adjustment_pending` notification with the submitter's name, reason, item, and quantity delta. This is fire-and-forget within the POST handler — notification failure doesn't roll back the adjustment. Notifications are informational; the adjustment record is the authoritative state.

5. **Suspense boundary for `useSearchParams()`** — The page splits into a Suspense-wrapped inner component (`NewAdjustmentContent`) and a shell page (`NewAdjustmentPage`). Next.js 14 requires this for pages using `useSearchParams()` to avoid opting out of static rendering at the root level. The Suspense fallback is minimal since data load is fast.

6. **Query param pre-population via `useEffect` on items load** — `initialItemId` pre-selection waits for the items array to load before searching for a match. This avoids a race condition where the combobox tries to select an item before the list is fetched. The effect re-runs whenever `items` changes, so pre-population works even if items load slowly.

---

### Final State After Task 10

**New files (5):**

| File | Purpose |
|------|---------|
| `src/lib/validations/adjustments.ts` | `createAdjustmentSchema`, `ADJUSTMENT_REASONS`, `AdjustmentReason` type |
| `src/types/adjustments.ts` | `AdjustmentWithDetails`, `AdjustmentStatus` types |
| `src/app/api/adjustments/route.ts` | POST — create pending adjustment, fire owner notifications |
| `src/hooks/use-adjustments.ts` | `useCreateAdjustment` mutation hook |
| `src/components/adjustments/adjustment-form.tsx` | Full adjustment form with direction toggle, item combobox, brand radio, reason select, required notes |
| `src/app/(main)/adjustments/new/page.tsx` | Page with Suspense + query param pre-population |

**Modified files (2):**

| File | Change |
|------|--------|
| `src/types/transactions.ts` | Added `adjustmentReason: string \| null` and `adjustmentNotes: string \| null` to `TransactionWithDetails` |
| `src/components/transactions/transaction-card.tsx` | Fixed `canEdit` to exclude all adjustment types; added adjustment notes + reason display block |

**Build status:** Passing (`npm run build` succeeds)
**Next:** Task 11 — Pending adjustments queue (`/adjustments/pending`) + approve/reject workflow.

---

## Week 4, Task 11: Pending Adjustments Queue + Approve/Reject Workflow

**Date:** 2026-02-24
**Scope:** Owner-only pending adjustments queue at `/adjustments/pending` — list of pending adjustment cards, approve workflow (atomic stock update), reject workflow (optional reason, modal), in-app notifications to submitter on both outcomes

### Subtasks Completed

1. Create `GET /api/adjustments/pending` route — owner-only, returns all `adjust_pending` transactions ordered oldest-first with item, submitter, and approver includes
2. Create `POST /api/adjustments/[id]/approve` route — validates pending status, atomically updates transaction to `adjust_approved` and applies stock change to item via Prisma `$transaction`, records `approvedByUserId` + `approvalTimestamp`, sends `adjustment_approved` notification to submitter
3. Create `POST /api/adjustments/[id]/reject` route — validates pending status, flips to `adjust_rejected`, records optional `rejectionReason`, records approver + timestamp, sends `adjustment_rejected` notification to submitter; stock unchanged
4. Extend `src/hooks/use-adjustments.ts` with `usePendingAdjustments` (query), `useApproveAdjustment` (mutation), `useRejectAdjustment` (mutation); all mutations invalidate `adjustments`, `transactions`, and (approve only) `items` query caches
5. Build `AdjustmentCard` component — brand badge (red/green), reason badge (color-coded by type), signed quantity, stock before → after preview (red if negative), submitter name + relative timestamp, notes block, Approve/Reject buttons
6. Build `RejectReasonModal` component — Dialog with read-only adjustment summary, optional rejection reason textarea, destructive confirm button
7. Build `/adjustments/pending` page — redirects non-owners to dashboard, skeleton loaders while fetching, checkmark empty state when queue is clear, wires card actions to approve/reject mutations with toast feedback

---

### Bugs Hit and Fixed

**1. Duplicate GET handler in wrong route file**

Initially added the pending list `GET` handler directly to `/api/adjustments/route.ts`, but the hook was calling `/api/adjustments/pending`. Next.js route files are path-based — the handler needed to live at `/api/adjustments/pending/route.ts`. Moved it to its own file and removed the duplicate from the main route.

**Lesson:** In Next.js App Router, every distinct URL path needs its own `route.ts` file. There's no express-style path-matching within a single file; the directory structure *is* the routing.

---

**2. Unused variable causing ESLint build failure**

Destructured `user` from `useAuth()` in the pending page but never referenced it (the redirect logic only needed `isOwner`). The `@typescript-eslint/no-unused-vars` rule treated this as a hard error and failed the build. Removed the unused destructure.

**Lesson:** Next.js production builds run ESLint as part of the type check phase — lint errors are build errors, not just warnings. Keep destructures tight.

---

**3. Upstream tracking lost after `git filter-repo`**

Earlier in the session the `git filter-repo` history rewrite (to purge a committed PDF) automatically removed the `origin` remote and upstream branch tracking — this is documented behaviour by the tool to prevent accidental force-pushes to the wrong remote. After re-adding the remote (`git remote add origin ...`) to push the history rewrite, the upstream tracking wasn't restored. The next `git push` failed with "no upstream branch". Fixed with `git push --set-upstream origin main`.

**Lesson:** After any `git filter-repo` run, always re-add the remote *and* set the upstream with `--set-upstream` on the next push. The tool intentionally nukes the remote config as a safety measure.

---

### Architecture Decisions

1. **Prisma `$transaction` for approve** — Approving an adjustment touches two records: the transaction row (type, approver, timestamp) and the item row (stock). Using Prisma's interactive transaction (`$transaction([...])`) ensures both writes succeed or both roll back. A partial update — transaction marked approved but stock not updated — would silently corrupt inventory.

2. **409 on non-pending adjustments** — Both approve and reject routes check that `transactionType === "adjust_pending"` before proceeding and return `409 Conflict` if not. This guards against double-submits (e.g. two owners acting on the same card simultaneously) without needing optimistic locking.

3. **`stockAfterTransaction` recalculated on approve** — The pending adjustment stored a *projected* `stockAfterTransaction` at submission time. On approval, the route recalculates it from the item's current live stock (`currentStock + quantityChange`) before writing. This means if another transaction moved stock between submission and approval, the approved record reflects the correct final state rather than a stale projection.

4. **Rejection reason is optional** — The spec calls for an optional rejection reason. The modal always shows the textarea but doesn't require it. If left blank, `rejectionReason` is stored as `null`. The notification message omits the reason clause when `null`. This avoids forcing owners to type a reason for obvious cases while still capturing it when useful.

5. **Non-owner redirect on the client** — The pending page redirects non-owners to `/dashboard` via `useEffect` + `router.replace`. The API routes independently enforce `role === 'owner'` — so the redirect is a UX courtesy, not a security boundary. The real guard is the API.

---

### Final State After Task 11

**New files (6):**

| File | Purpose |
|------|---------|
| `src/app/api/adjustments/pending/route.ts` | GET — list pending adjustments (owner only) |
| `src/app/api/adjustments/[id]/approve/route.ts` | POST — approve adjustment, apply stock change atomically |
| `src/app/api/adjustments/[id]/reject/route.ts` | POST — reject adjustment, record optional reason |
| `src/components/adjustments/adjustment-card.tsx` | Card UI for a single pending adjustment with approve/reject actions |
| `src/components/adjustments/reject-reason-modal.tsx` | Dialog for capturing rejection reason |
| `src/app/(main)/adjustments/pending/page.tsx` | Owner-only pending queue page |

**Modified files (1):**

| File | Change |
|------|--------|
| `src/hooks/use-adjustments.ts` | Added `usePendingAdjustments`, `useApproveAdjustment`, `useRejectAdjustment` |

**Build status:** Passing (`npm run build` succeeds)
**Week 4 status:** In progress
**Next:** Task 12 — Reports (cost allocation, consumption summary)

---

## Week 4, Task 12: Reports (Consumption, Low Stock, Cost Allocation)

**Date:** 2026-02-25
**Scope:** Three owner/all-user report screens at `/reports/consumption`, `/reports/low-stock`, and `/reports/cost-allocation` — date range filtering, Recharts visualizations, CSV export, role-gated access

### Subtasks Completed

1. Create `GET /api/reports/consumption` route — owner only, filters: dateFrom, dateTo, businessEntity, categoryId; aggregates `consume` transactions by business, category, date, and item; returns byBusiness, byCategory, byDate, rows
2. Create `GET /api/reports/cost-allocation` route — owner only, filters: dateFrom, dateTo; aggregates `consume` transactions into Brand A/Brand B totals per category; returns summary + byCategory breakdown
3. Create `GET /api/reports/low-stock` route — all users; classifies all active items as critical/low/healthy by stock vs. reorder level; reuses expiring-items logic from `/api/items/expiring`; returns lowStock + expiringItems payloads
4. Build `src/hooks/use-reports.ts` with `useConsumptionReport`, `useCostAllocationReport`, `useLowStockReport` — 2-minute staleTime, filter-aware query keys
5. Build shared report components: `ReportsNav` (tab bar linking between reports, visibility gated by role), `DateRangeSelector` (preset buttons + custom date inputs), `ExportButton` (client-side CSV generation + download trigger)
6. Build chart components: `ConsumptionChart` (bar by brand, pie by category, line trend over time using Recharts), `CostAllocationChart` (grouped bar chart by category, Brand A red / Brand B green)
7. Build data table components: `LowStockTable` (severity-sorted, red/yellow/green badges), `ExpiringItemsTable` (expired/expiring-soon badges with days-remaining column)
8. Build `/reports/page.tsx` — smart redirect: owners → `/reports/consumption`, staff → `/reports/low-stock`
9. Build `/reports/consumption/page.tsx` — owner-only, brand + category filters, summary cards, charts, detail table, CSV export
10. Build `/reports/low-stock/page.tsx` — all users, two inner tabs (Low Stock / Expiring Items), summary cards, export for both tabs
11. Build `/reports/cost-allocation/page.tsx` — owner-only, summary cards, grouped bar chart, category breakdown table, CSV export

---

### Bugs Hit and Fixed

**1. ExportButton `Row` type incompatible with typed report interfaces**

Initially declared `Row = Record<string, string | number | null | undefined>` then updated to `Record<string, unknown>`. Neither was assignable from named interfaces like `ConsumptionRow` because TypeScript requires an explicit index signature on the source type to satisfy `Record<K, V>`. Fixed by using `any` for the internal row type — the export function is intentionally generic and converts all values to strings via `String()`, so `any` is appropriate here.

**Lesson:** Named interfaces without an explicit `[key: string]: unknown` index signature cannot be widened to `Record<string, unknown>` in TypeScript. For generic utility components (like a CSV exporter) that accept any shape, `any[]` or a `{ [key: string]: unknown }[]` prop type is the right choice. Don't fight structural typing — align the abstraction with the usage.

---

**2. Recharts v3 Tooltip formatter type — `value` is `number | undefined`**

In Recharts 3.x the `Tooltip` formatter receives `value: number | undefined` (the value might be absent for sparse data). Declaring `(v: number) => fmt(v)` was a type error. Fixed by:
- Making the `fmt` helper accept `number | undefined` and return empty string for undefined
- Passing `fmt` directly as the formatter instead of wrapping it in a lambda (avoids re-declaring the parameter type)

**Lesson:** Recharts v3 made several types more strict / nullable compared to v2. When upgrading or first using v3, check that formatter, labelFormatter, and custom tick callbacks all handle `undefined` values.

---

**3. Recharts `Pie` label — `percent` is `number | undefined`**

Similar to the formatter issue: the Pie label render prop receives `{ name, percent }` where `percent` can be `undefined` in v3. Used `(percent ?? 0)` to guard the arithmetic.

---

### Architecture Decisions

1. **Client-side CSV generation** — The spec mentions `GET /api/reports/export`, but since the report data is already fetched and held in TanStack Query cache, generating the CSV on the client (using `Blob` + `URL.createObjectURL`) is simpler, faster, and avoids duplicating aggregation logic server-side. The `ExportButton` component accepts `rows` + `headers` and handles the download entirely in the browser.

2. **Report API aggregates in JavaScript, not SQL** — All three report APIs fetch the raw transactions/items from Prisma and then aggregate using JavaScript Maps. For a two-brand restaurant with ~95 items this is fine (hundreds to low thousands of rows per query). SQL `GROUP BY` would be more efficient at scale but harder to read and maintain.

3. **`/reports` as a smart redirect** — Rather than a tabbed landing page, `/reports` immediately redirects to the first accessible report for the user. Owners land on Consumption (the richest report), staff land on Low Stock (their only accessible report). Direct URLs like `/reports/consumption` still work for bookmarking.

4. **Low stock: all items shown, not just problematic ones** — The API returns all active items with severity labels including "healthy". The page shows all of them so staff can see the full picture, not just alerts. Severity order (critical → low → healthy) ensures the most urgent items appear first without needing a separate filter.

5. **Expiring items in low-stock report** — Reused the same query logic as `/api/items/expiring` rather than extracting a shared helper. The route is self-contained and easier to trace. If this pattern repeats a third time, extract to a shared function.

---

### Final State After Task 12

**New files (16):**

| File | Purpose |
|------|---------|
| `src/types/reports.ts` | TypeScript interfaces for all report data shapes |
| `src/app/api/reports/consumption/route.ts` | GET — consumption report aggregation (owner only) |
| `src/app/api/reports/cost-allocation/route.ts` | GET — cost allocation by brand and category (owner only) |
| `src/app/api/reports/low-stock/route.ts` | GET — low stock + expiring items (all users) |
| `src/hooks/use-reports.ts` | TanStack Query hooks for all three reports |
| `src/components/reports/reports-nav.tsx` | Shared tab bar linking between report pages |
| `src/components/reports/date-range-selector.tsx` | Preset buttons + custom date range picker |
| `src/components/reports/export-button.tsx` | Client-side CSV generation + download |
| `src/components/reports/consumption-chart.tsx` | Bar (by brand) + Pie (by category) + Line (trend) charts |
| `src/components/reports/cost-allocation-chart.tsx` | Grouped bar chart by category |
| `src/components/reports/low-stock-table.tsx` | Table with critical/low/healthy severity badges |
| `src/components/reports/expiring-items-table.tsx` | Table with expired/expiring-soon badges |
| `src/app/(main)/reports/page.tsx` | Smart redirect by role |
| `src/app/(main)/reports/consumption/page.tsx` | Consumption report page (owner only) |
| `src/app/(main)/reports/low-stock/page.tsx` | Low stock + expiring tabs (all users) |
| `src/app/(main)/reports/cost-allocation/page.tsx` | Cost allocation page (owner only) |

**Build status:** Passing (`npm run build` succeeds)
**Week 4 status:** Complete
**Next:** Week 5 — In-app notifications, user management, settings

---

## Week 5, Task 13: In-App Notifications

**Date:** 2026-02-26
**Scope:** Full read-side for notifications — API routes, TanStack Query hooks, bell icon with badge, sliding panel with per-type icons and mark-as-read. The write side (creating notifications on triggers) was already implemented in Tasks 10–11.

### Subtasks Completed

1. Create `GET /api/notifications` route — returns the current user's 50 most recent notifications + unread count
2. Create `GET /api/notifications/count` route — lightweight unread count for polling (15s interval)
3. Create `PUT /api/notifications/[id]/read` route — marks a single notification as read, ownership-checked
4. Create `POST /api/notifications/read-all` route — bulk-marks all unread notifications as read for the current user
5. Add `src/types/notifications.ts` — `Notification` interface and `NotificationType` union (`low_stock`, `expiring_soon`, `expired`, `adjustment_pending`, `adjustment_approved`, `adjustment_rejected`)
6. Build `src/hooks/use-notifications.ts` — `useNotifications` (staleTime: 0), `useUnreadCount` (15s staleTime + refetchInterval), `useMarkRead`, `useMarkAllRead`
7. Build `src/components/notifications/notification-item.tsx` — single row with per-type icon (colored), unread dot, relative timestamp, "Mark read" button
8. Build `src/components/notifications/notification-panel.tsx` — scrollable list, "Mark all read" header button, loading skeletons, "You're all caught up" empty state
9. Build `src/components/notifications/notification-bell.tsx` — bell button with red badge (capped at 99+), opens a right-side Sheet containing the panel
10. Wire `NotificationBell` into `TopHeader` (mobile) replacing the static placeholder, and into `Sidebar` (desktop — expanded header area and collapsed nav section)

---

### Bugs Hit and Fixed

**None** — the Notification model and all write-side triggers were already in place from earlier tasks, so this was a clean build.

---

### Architecture Decisions

1. **Notification writes were already done** — Tasks 10 and 11 had already wired `db.notification.createMany` calls into the adjustment and transaction routes. Task 13 only needed the read side: fetch, count, mark-read endpoints + UI.

2. **Sheet for the notification panel** — Used shadcn/ui `Sheet` (slides from right) for both mobile and desktop rather than a Popover/Dropdown. A Sheet gives more vertical space for a list of notifications, handles scrolling naturally, and works consistently across breakpoints without needing conditional rendering logic.

3. **Polling unread count separately from the full list** — `useUnreadCount` polls the lightweight `/api/notifications/count` every 15 seconds. The full list (`useNotifications`) only fetches when the panel opens (staleTime: 0, no polling). This minimises bandwidth — the badge updates frequently without re-fetching all notification content.

4. **Top 50 limit on list fetch** — The API returns at most 50 notifications ordered by newest first. This keeps the payload small and the panel usable without pagination. Older notifications can be addressed in a future full notifications page if needed.

---

### Final State After Task 13

**New files (9):**

| File | Purpose |
|------|---------|
| `src/types/notifications.ts` | `Notification` interface + `NotificationType` union |
| `src/app/api/notifications/route.ts` | GET — fetch user's notifications + unread count |
| `src/app/api/notifications/count/route.ts` | GET — lightweight unread count |
| `src/app/api/notifications/[id]/read/route.ts` | PUT — mark single notification as read |
| `src/app/api/notifications/read-all/route.ts` | POST — mark all as read |
| `src/hooks/use-notifications.ts` | TanStack Query hooks for all notification operations |
| `src/components/notifications/notification-item.tsx` | Single notification row component |
| `src/components/notifications/notification-panel.tsx` | Full notification list with empty/loading states |
| `src/components/notifications/notification-bell.tsx` | Bell button with badge + Sheet trigger |

**Modified files (2):**

| File | Change |
|------|--------|
| `src/components/layout/top-header.tsx` | Replaced static bell placeholder with `NotificationBell` |
| `src/components/layout/sidebar.tsx` | Added `NotificationBell` to expanded and collapsed sidebar states |

**Build status:** Passing (`npm run build` succeeds)
**Week 5 status:** In progress (2/8 tasks done)
**Next:** Task 14 — Daily expiration cron job

---

## Week 5, Task 14: Daily Expiration Cron Job

**Date:** 2026-02-26
**Scope:** Vercel Cron job running daily at 6 AM UTC — scans all tracked items with expiring/expired stock and creates in-app notifications for all active users, with 24-hour deduplication.

### Subtasks Completed

1. Create `src/app/api/cron/expiration-check/route.ts` — GET handler protected by `CRON_SECRET` bearer token; reads `expiry_alert_days` from system settings; queries active, expiration-tracking items with stock > 0 and batches within threshold; fetches all active users; deduplicates against existing notifications in the last 24h; bulk-creates missing notifications via `createMany`; returns `{ checked, created }` for observability
2. Create `vercel.json` — registers the cron at `0 6 * * *` (6 AM UTC daily) pointing to `/api/cron/expiration-check`

---

### Architecture Decisions

1. **`CRON_SECRET` bearer token** — Vercel automatically attaches `Authorization: Bearer <CRON_SECRET>` when invoking cron routes. The route validates this header before doing any DB work. Without the env var set, the route always returns 401 — safe by default.

2. **Deduplication via in-memory Set** — Rather than issuing one `findUnique` per user+item+type combo, the route fetches all `expiring_soon`/`expired` notifications from the last 24h in a single query, builds a `Set<"userId:itemId:type">`, then filters proposed notifications against it. One extra query avoids O(users × items) round trips.

3. **`quantityInStock > 0` filter** — Only items with stock remaining trigger notifications. Writing off all stock of an expired item (via an approved adjustment) will stop the cron from generating new alerts for it the next day.

4. **Notifications go to all active users** — Per the spec: "In-app all users" for stock alerts. Both staff and owners see expiry notifications so the whole team is aware.

5. **`console.error` on catch** — Unlike other API routes that silently return 500, the cron logs the error server-side. Since no user is waiting on a response, observability matters more than a clean error message.

---

### Final State After Task 14

**New files (2):**

| File | Purpose |
|------|---------|
| `src/app/api/cron/expiration-check/route.ts` | Daily cron handler — expiry check + notification creation |
| `vercel.json` | Vercel Cron schedule (6 AM UTC daily) |

**Deployment note:** Add `CRON_SECRET=<random-string>` to `.env.local` and to the Vercel project's environment variables before deploying. Without it, the route returns 401 on every invocation.

**Build status:** Passing (`npm run build` succeeds)
**Week 5 status:** In progress (2/8 complete — Tasks 13 and 14 done)
**Next:** Task 15 — User Management (`/admin/users`)

---

## Week 5, Task 15: User Management (`/admin/users`)

**Date:** 2026-02-27
**Scope:** Owner-only user management — list, create, edit, deactivate, and reset PIN/password for staff and owner accounts.

### Subtasks Completed

1. Zod validation schemas (`createUserSchema`, `updateUserSchema`, `resetCredentialSchema`) in `src/lib/validations/users.ts`
2. `User` type in `src/types/users.ts`
3. API routes:
   - `GET/POST /api/users` — list all users (owner only), create new user
   - `GET/PATCH /api/users/[id]` — get single user, update name/email/active status
   - `POST /api/users/[id]/reset-credential` — owner resets a user's PIN or password, forces `mustChangePassword: true`
4. TanStack Query hooks in `src/hooks/use-users.ts` (`useUsers`, `useUser`, `useCreateUser`, `useUpdateUser`, `useResetCredential`)
5. `CreateUserForm` and `EditUserForm` components in `src/components/users/user-form.tsx`
6. User list page (`/admin/users`) with table, reset credential modal, and activate/deactivate confirmation dialog
7. New user page (`/admin/users/new`)
8. Edit user page (`/admin/users/[id]/edit`)

### Challenge 1: `z.enum` options API in Zod v4

**Problem:** Used `z.enum(["owner", "staff"], { required_error: "Role is required" })` which worked in Zod v3 but fails in v4 — the second parameter to `z.enum` only accepts `string | { error?: ... }`, not `{ required_error }`.

**Resolution:** Removed the options object entirely (`z.enum(["owner", "staff"])`). The select always has a value in the form, so the required error is never needed.

**Lesson:** When upgrading Zod or working on a project with a newer version, check the enum API. The error customisation params changed between v3 and v4.

### Key Design Decisions

- **Role is immutable after creation.** Changing role would also require changing `authType` (staff uses PIN, owner uses password) and the credential hash. Too complex for MVP — the form shows role as read-only on the edit screen.
- **Self-lockout prevention.** The PATCH route and edit form both prevent an owner from deactivating their own account.
- **mustChangePassword always set on create/reset.** Every new user and every credential reset sets `mustChangePassword: true`, so users are always forced to set their own credential on first use.
- **`formatDistanceToNow` from `date-fns`** for friendly "last login" display (already in project dependencies).

### Final State After Task 15

New files created:
- `src/lib/validations/users.ts`
- `src/types/users.ts`
- `src/app/api/users/route.ts`
- `src/app/api/users/[id]/route.ts`
- `src/app/api/users/[id]/reset-credential/route.ts`
- `src/hooks/use-users.ts`
- `src/components/users/user-form.tsx`
- `src/app/(main)/admin/users/page.tsx`
- `src/app/(main)/admin/users/new/page.tsx`
- `src/app/(main)/admin/users/[id]/edit/page.tsx`

**Build status:** Passing (`npm run build` succeeds)
**Week 5 status:** In progress (3/8 complete — Tasks 13, 14, 15 done)
**Next:** Task 16 — Settings page (`/settings`)

---

## Week 6, Task 16: Settings Page (`/settings`)

**Date:** 2026-02-27
**Scope:** Owner-only system settings page and account settings section (change password / change PIN) accessible to all authenticated users

### Subtasks Completed

1. Create `SystemSettings` type in `src/types/settings.ts`
2. Build `GET /api/settings` and `PUT /api/settings` API routes — GET returns current settings with defaults for missing rows; PUT is owner-only, validates ranges via `updateSettingsSchema`, upserts changed keys
3. Create `useSettings` and `useUpdateSettings` TanStack Query hooks in `src/hooks/use-settings.ts`
4. Build `src/app/(main)/settings/page.tsx` — single-page settings UI with three sections:
   - **Account** — Change password (owners) or Change PIN (staff) via inline dialogs; reads `authType` from session
   - **System Settings** — Owner-only number inputs for session timeout, edit window, expiry alert days, and low-stock threshold percent; boolean toggle for require-adjustment-notes
   - **About** — App version, brand colors reference, tech stack attribution

---

### Architecture Decisions

1. **Settings as a single page, not tabbed routes** — All settings fit comfortably on one scroll. Avoiding sub-routes keeps navigation simple and avoids URL complexity for a rarely-visited admin page.

2. **`upsert` per key rather than replace-all** — The PUT handler upserts only the keys present in the request body. This lets the client send partial updates (e.g., only `edit_window_minutes`) without needing to send all five keys and without risk of accidentally nulling other settings.

3. **Defaults live in the API, not the DB** — `loadSettings()` applies hardcoded defaults when a key is missing from the database. This means the DB starts empty (no seed required for settings) and the app still behaves correctly. Default values are the single source of truth in the API code.

4. **Change password / PIN via existing auth endpoints** — The settings page reuses `POST /api/auth/change-password` and `POST /api/auth/change-pin` rather than adding new routes. This avoids duplicate validation logic and keeps credential-change behaviour consistent with the dedicated auth screens.

5. **System settings section hidden from staff** — The entire system settings card is conditionally rendered based on `isOwner`. Staff only see the Account section. The API enforces the same restriction independently.

---

### Final State After Task 16

**New files (4):**

| File | Purpose |
|------|---------|
| `src/types/settings.ts` | `SystemSettings` interface |
| `src/app/api/settings/route.ts` | GET (authenticated) + PUT (owner only) system settings |
| `src/hooks/use-settings.ts` | `useSettings` query + `useUpdateSettings` mutation |
| `src/app/(main)/settings/page.tsx` | Full settings page — account, system settings, about sections |

**Build status:** Passing (`npm run build` succeeds)
**Week 6 status:** In progress (Task 16 done)
**Next:** Task 17 — Web manifest, testing infrastructure, session timeout warning

---

## Week 6, Task 17: Web Manifest + Testing Infrastructure

**Date:** 2026-02-28
**Scope:** PWA "Add to Home Screen" manifest, complete testing infrastructure (vitest unit + integration, Playwright E2E smoke tests), and business logic extraction

### Subtasks Completed

1. Create `src/app/manifest.ts` — Next.js `MetadataRoute.Manifest` export (name, short name, start URL, standalone display, theme color, SVG icon)
2. Create `public/icon.svg` — red rounded-square SVG icon with white "I" lettermark
3. Update `src/app/layout.tsx` — add `appleWebApp` metadata and a `viewport` export with `themeColor` (per Next.js 14's correct API)
4. Install `vitest`, `@vitejs/plugin-react`, and `@playwright/test` as dev dependencies; download Chromium browser binary
5. Create `vitest.config.ts` — Node environment, `@` path alias, covers `tests/unit/**` and `tests/integration/**`
6. Create `playwright.config.ts` — E2E test dir, `baseURL: http://localhost:3000`, auto-starts dev server
7. Add 4 test scripts to `package.json`: `test`, `test:watch`, `test:integration`, `test:e2e`
8. Create `tests/setup.ts` — stubs `next/headers` so server-only imports don't throw in the Node test environment
9. Create `src/lib/business-logic.ts` — 4 pure functions extracted from API route logic: `calculateNewStock`, `isWithinEditWindow`, `getExpiryStatus`, `validateQuantityDecimal`
10. Create `tests/unit/business-logic.test.ts` — 10 test cases covering all four functions
11. Create `tests/unit/validations.test.ts` — 17 `safeParse` test cases across 5 Zod schemas
12. Create `tests/integration/transactions.test.ts` — 7 tests for POST and PUT transaction routes (mocked Prisma + auth)
13. Create `tests/integration/settings.test.ts` — 4 tests for GET and PUT settings routes
14. Create `tests/e2e/auth.spec.ts` — 2 Playwright smoke tests (unauthenticated redirect, login page renders)

---

### Challenge: Next.js 14 `themeColor` belongs in `viewport` export, not `metadata`

**Problem:** Adding `themeColor` to the `metadata` export (as documented in older Next.js guides) causes `⚠ Unsupported metadata themeColor` build warnings on every page.

**Resolution:** In Next.js 14, theme color is set via a separate named export:

```ts
import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#DC2626",
};
```

**Lesson:** Next.js 13.4+ separates viewport-related metadata (`themeColor`, `colorScheme`, `width`, `initialScale`) into a dedicated `viewport` export. The `metadata` export is for `<meta>` content tags, not viewport tags. Check the Next.js docs when adding PWA-related metadata — the separation is intentional to support per-page viewport overrides independently of page metadata.

---

### Challenge: Manifest `purpose` only accepts single string values in Next.js 14

**Problem:** The PWA spec allows space-separated `purpose` values on manifest icons (e.g., `"any maskable"`), but Next.js 14's TypeScript types for `MetadataRoute.Manifest` only accept a single string literal (`"any" | "maskable" | "monochrome" | ...`). Using `"any maskable"` caused a type error at build time.

**Resolution:** Used `"maskable"` alone — the more useful value for "Add to Home Screen" adaptive icons.

**Lesson:** Next.js enforces stricter types than the raw Web App Manifest spec. When in doubt, use a single purpose value and refer to the `MetadataRoute.Manifest` TypeScript type rather than the raw spec.

---

### Challenge: `next/headers` throws in vitest Node environment

**Problem:** Importing API route handlers in integration tests triggers the `next/headers` import (via `auth.ts`), which throws in a plain Node environment because it relies on Next.js request context.

**Resolution:** Two-layer approach:
1. `tests/setup.ts` stubs `next/headers` globally with `vi.mock`
2. Integration tests mock `@/lib/auth` entirely (`vi.mock("@/lib/auth", ...)`) so `getSessionFromCookie` never actually calls `cookies()`. The `next/headers` stub is a defensive fallback.

**Lesson:** When testing Next.js server-side code in vitest, mock at the module boundary (`@/lib/auth`, `@/lib/db`) rather than trying to replicate the Next.js request context. The `next/headers` stub in setup.ts handles any modules that import it transitively.

---

### Architecture Decisions

1. **Business logic extracted to `src/lib/business-logic.ts`** — Four pure functions (`calculateNewStock`, `isWithinEditWindow`, `getExpiryStatus`, `validateQuantityDecimal`) were identified in the transaction and cron route handlers. Extracting them makes them independently testable without any mocking, and documents the core inventory rules in one place. The API routes were not modified — the extracted functions can be adopted incrementally.

2. **Unit + integration with vitest, E2E smoke only with Playwright** — Full E2E coverage at this stage would require test fixtures, database seeding, and authentication flows — significant setup for an MVP. Instead: vitest covers business logic and API contract testing (fast, no network), and Playwright covers the two most critical infrastructure checks (auth redirect and login page renders). A full E2E suite can be added before v1 launch.

3. **Integration test mock strategy: mock at the module boundary** — `vi.mock("@/lib/db")` and `vi.mock("@/lib/auth")` replace entire modules before any import runs. This is cleaner than spying on individual methods and avoids the `PrismaClient` constructor (which needs a DB URL). The `db.$transaction` mock returns the expected `[result, ...]` array directly, matching the destructuring in the actual route handlers.

4. **Vitest `environment: "node"`** — No jsdom needed since the tests cover API route handlers (pure Node.js), Zod schemas, and pure functions. `"node"` is faster and avoids browser-simulation overhead.

---

### Final State After Task 17

**New files (13):**

| File | Purpose |
|------|---------|
| `src/app/manifest.ts` | Next.js PWA manifest route |
| `public/icon.svg` | App icon — red rounded square, white "I" |
| `vitest.config.ts` | Vitest configuration (node env, path alias, test globs) |
| `playwright.config.ts` | Playwright configuration (testDir, baseURL, webServer) |
| `tests/setup.ts` | Global test setup — stubs `next/headers` |
| `src/lib/business-logic.ts` | Pure business logic functions |
| `tests/unit/business-logic.test.ts` | 10 unit tests for business logic |
| `tests/unit/validations.test.ts` | 17 unit tests for Zod validation schemas |
| `tests/integration/transactions.test.ts` | 7 integration tests for transaction API routes |
| `tests/integration/settings.test.ts` | 4 integration tests for settings API routes |
| `tests/e2e/auth.spec.ts` | 2 Playwright smoke tests |

**Modified files (3):**

| File | Change |
|------|--------|
| `src/app/layout.tsx` | Added `appleWebApp` metadata and `viewport` export with `themeColor` |
| `package.json` | Added `test`, `test:watch`, `test:integration`, `test:e2e` scripts; added `vitest`, `@vitejs/plugin-react`, `@playwright/test` dev deps |

**Test results:**
- `npm run test` → 41/41 passed (4 files: 2 unit, 2 integration)
- `npm run test:e2e` → 2/2 passed

**Build status:** Passing (`npm run build` succeeds, no warnings)
**Week 6 status:** Complete ✓
**Next:** Task 18 (TBD)

---

## Week 7, Task 18: Bug Fix — Submit Adjustment Navigation

**Date:** 2026-03-01
**Scope:** Navigation fix discovered during manual testing

### Bug: `/adjustments/new` was unreachable from the UI

**Problem:** The Submit Adjustment page (`/adjustments/new`) was fully built but had no navigation entry pointing to it. The only ways to reach it were:
1. Via the "Submit Adjustment" deep-link in the Dashboard's Expiring Soon section (pre-populated with an item and reason)
2. Typing the URL directly

Staff with no expiring items had no way to submit a general adjustment (e.g. damaged goods, miscounted stock) from the UI.

**Resolution:** Added "Submit Adjustment" to both navigation surfaces, visible to all users:
- Sidebar (`src/lib/navigation.ts`) — added to `mainNavItems` below Reports, with `SlidersHorizontal` icon
- Mobile More menu (`src/components/layout/bottom-tab-bar.tsx`) — added above Settings

**Lesson:** Navigation coverage should be verified during testing, not assumed from page existence. A page being built doesn't mean it's reachable.

---

### Final State After Task 18

**Modified files (2):**

| File | Change |
|------|--------|
| `src/lib/navigation.ts` | Added `SlidersHorizontal` import; added Submit Adjustment entry to `mainNavItems` |
| `src/components/layout/bottom-tab-bar.tsx` | Added `SlidersHorizontal` import; added Submit Adjustment to More menu |

**Week 7 status:** In progress
**Next:** Task 19 (E2E sandbox setup)

---

## Week 7, Task 19: Local E2E Test Sandbox

**Date:** 2026-03-02
**Scope:** Isolated test database + seed data so manual and automated testing never touches the dev database

### What was built

A dedicated local sandbox environment for E2E testing:

- **`.env.test`** — points `DATABASE_URL` to `inventory_test` (separate local PostgreSQL database); gitignored
- **`scripts/setup-test-db.ts`** — one-command setup: creates the database if missing, runs Prisma migrations against it, then runs the test seed
- **`prisma/seed-test.ts`** — deterministic test seed that wipes and repopulates `inventory_test` with known data on every run
- **`npm run dev:test`** — dev server started with `--env-file=.env.test` so it always hits the test database
- **`npm run test:e2e:setup`** — runs `setup-test-db.ts`; only needed when resetting to a clean state
- **`playwright.config.ts`** updated — loads `.env.test` via dotenv and passes it to the Playwright web server env; uses port 3001 to avoid conflicts with a running dev server

### Seed data coverage

| Scenario | Data |
|----------|------|
| Healthy stock | Chicken Breast (50 kg), Rice (150.5 kg) |
| Low stock | Cooking Oil (3 L, reorder 10) |
| Zero stock | Fish Sauce (0 bottles) |
| Expiration tracking | Fresh Milk — 1 batch expiring in 3 days (amber), 1 expired batch (red) |
| Decimal quantities | Cooking Oil, Chicken Breast, Rice (`allowsDecimal: true`) |
| Inactive item | Old Hot Sauce (`isActive: false`) |
| Transaction history | 8 transactions across both brands |
| Pending adjustment | Cooking Oil — Damaged, submitted by staff, awaiting owner approval |
| Notifications | 5 pre-seeded (low stock, expiring soon, expired, adjustment pending) |

**Test credentials:**
- Owner: `owner@test.local` / `TestPass123!`
- Staff: `staff@test.local` / PIN: `1234`

Both users have `mustChangePassword: false` to skip the force-change screens during testing.

---

### Challenge 1: Dev server hitting the wrong database

**Problem:** Running `npm run dev` (which loads `.env`) pointed at `inventory_dev` — an empty database. Credentials from the test seed didn't work because the test data lives in `inventory_test`.

**Resolution:** Added `dev:test` script using Node's native `--env-file` flag:
```json
"dev:test": "node --env-file=.env.test ./node_modules/.bin/next dev"
```
Next.js env loading only fills in vars that aren't already in `process.env`, so `DATABASE_URL` from `--env-file` takes precedence over `.env`.

**Lesson:** When working with multiple databases locally, make the "which database am I hitting?" question impossible to get wrong by accident. Separate named scripts (`dev` vs `dev:test`) are clearer than instructions to manually swap env files.

---

### Challenge 2: `dotenv` CLI not available

**Problem:** Initial plan for `dev:test` was `dotenv -e .env.test -- next dev`. The `dotenv` npm package (v17) does not ship a CLI binary — only the programmatic API.

**Resolution:** Used Node 20.6+'s built-in `--env-file` flag instead. No extra dependencies needed.

**Lesson:** Check whether an npm package ships a CLI (`ls node_modules/.bin/<name>`) before writing scripts that depend on it.

---

### Final State After Task 19

**New files (3):**

| File | Purpose |
|------|---------|
| `.env.test` | Test database connection string; gitignored |
| `scripts/setup-test-db.ts` | Creates DB, runs migrations, runs test seed |
| `prisma/seed-test.ts` | Deterministic test data; wipes and re-seeds on each run |

**Modified files (3):**

| File | Change |
|------|--------|
| `playwright.config.ts` | Loads `.env.test`; injects env into webServer; uses port 3001 |
| `package.json` | Added `test:e2e:setup` and `dev:test` scripts |
| `.gitignore` | Added `.env.test` |

**Testing workflow:**
- Reset test data: `npm run test:e2e:setup`
- Manual testing (browser/phone): `npm run dev:test` → `http://localhost:3000`
- Automated E2E: `npm run test:e2e`

**Week 7 status:** In progress
**Next:** Manual testing pass

---

## Week 7, Task 20: UI Fixes — Manual Testing Round 1

**Date:** 2026-03-05
**Scope:** First round of manual testing feedback — login and dashboard pages reviewed on desktop

### What was fixed

Three issues identified during the first manual testing pass:

1. **Notification overlay too dark** — The Sheet component's backdrop was `bg-black/80`, making it feel heavy when opening notifications. Reduced to `bg-black/40` in `src/components/ui/sheet.tsx`. Applies to all Sheet usage in the app.

2. **Notification header misalignment — "Mark all read" and X button overlapping** — The Sheet component auto-generates a close button at `absolute right-4 top-4`. The notification panel had its own header with a "Mark all read" button using `justify-between`. Because the X button is outside the normal document flow (absolutely positioned), it could never align with the in-flow header content — they just overlapped. Fixed by:
   - Hiding the auto-generated X button on the notification Sheet via `[&>button:last-child]:hidden` on SheetContent
   - Adding a `SheetClose` button directly inside `NotificationPanel`'s header as the third inline flex item
   - Result: Title | Mark all read | X — all in the same flex row, naturally spaced

3. **"Submit Adjustment" button removed from Expiring Soon section** — Expired items in the dashboard list had a "Submit Adjustment" shortcut button. Unnecessary: the Transactions and Adjustments pages already handle stock changes. The Expiring Soon section is a read-only highlight, not an action hub. Button removed; unused `Button` and `Link` imports cleaned up.

### Challenge: Absolute positioning vs. document flow

**Problem:** The Sheet component renders a close button as `absolute right-4 top-4` inside the panel. This works for the default use case where content starts below the button. But the notification panel has `p-0` on SheetContent and renders its own header flush to the top — putting header content and the absolute button in direct collision. Adding padding (`pr-12`) was a band-aid that improved spacing but still left the two items visually misaligned since they were never on the same baseline.

**Resolution:** Used `[&>button:last-child]:hidden` on SheetContent to suppress the auto-generated button, then added a `SheetClose` directly in the panel header. All three header items (title, mark-all-read, X) now live in the same flex row and align naturally. The bottom-tab-bar's "More" Sheet is unaffected and keeps the default close button.

**Lesson:** When a UI component injects absolutely-positioned elements into a container you're trying to control, don't fight it with padding hacks — take ownership of the button in your own component and suppress the injected one. This is a common pattern with shadcn/ui Sheets, Dialogs, and Drawers that have fully custom content areas.

### Files modified

| File | Change |
|------|--------|
| `src/components/ui/sheet.tsx` | Overlay opacity: `bg-black/80` → `bg-black/40` |
| `src/components/notifications/notification-bell.tsx` | Hide auto-generated SheetContent close button |
| `src/components/notifications/notification-panel.tsx` | Inline SheetClose in header; proper three-item flex layout |
| `src/components/dashboard/expiring-soon-section.tsx` | Remove "Submit Adjustment" button and unused imports |

**Week 7 status:** In progress
**Next:** Manual testing continues

---

## Week 7, Task 21: UI Fixes — Manual Testing Round 2

**Date:** 2026-03-09
**Scope:** Second round of manual testing feedback — New Transaction, Transaction History, Reports, and Dashboard (mobile) reviewed

### What was fixed

Five issues identified during the second manual testing pass:

1. **Transaction confirmation modal had brand colors** — The preview popup displayed a full-width colored banner (red for Brand A, green for Brand B) at the top of the dialog. Tester feedback: unnecessary color, the brand name is enough. Removed the colored banner entirely. Brand name is now shown as a plain text row inside the details list alongside Item, Action, and New Stock.

2. **Edit transaction page threw a runtime error** — Clicking "Edit" on a recent transaction produced: `Unhandled Runtime Error — Error: An unsupported type was passed to use(): [object Object]`. Root cause: the edit page was using React's `use()` hook to unwrap `params` as a Promise — the Next.js 15 pattern. But this project runs Next.js 14.2.x where `params` is still a plain synchronous object. Passing a plain object to `use()` throws. Fixed by removing `use()` and destructuring `params` directly.

3. **Adjustment tag color inconsistency** — The `adjust_pending` badge was yellow, but `adjust_approved` was blue and `adjust_rejected` was gray. Tester wanted all adjustment-type tags to use yellow. Updated `adjust_approved` and `adjust_rejected` to use `bg-yellow-100 text-yellow-800` to match the pending variant. The status label in the badge text (`Adjustment · Approved`, `Adjustment · Rejected`) still distinguishes them.

4. **Cost Allocation chart x-axis labels overlapping bars** — Category name labels on the x-axis were rotated but still colliding with the bars above them. The `angle`/`textAnchor` approach on Recharts XAxis rotates text around the wrong pivot point — the anchor sits on the axis line and the text extends upward into the chart. Fixed by replacing the built-in tick with a custom `AngledTick` SVG component that applies `rotate(-45)` via SVG `transform` on a `<g>` element. The text now correctly extends downward from the axis line with `dy={8}` offset and `textAnchor="end"`. Also increased chart height to 340px and bottom margin to 90px to give labels room.

5. **"Total Value" card overflows on mobile** — In a 2-column grid on mobile, each summary card is roughly half the screen width. A formatted peso value like `₱1,234,567.89` at `text-lg` was wider than the card, causing the number to visually protrude. Fixed by: adding `shrink-0` to the icon container so it never compresses, adding `min-w-0` to the text container to allow proper flex shrinking, reducing font size to `text-base`, and adding `break-words` so long values wrap cleanly within the card.

### Challenge: Recharts angled x-axis labels go the wrong way

**Problem:** Setting `angle={-45}` and `textAnchor="end"` on Recharts `XAxis` is the documented approach for angled labels, and it does rotate the text. But the rotation pivot is the text anchor point — which sits on the axis line. With a negative angle, the text body extends upward-left into the chart area, directly overlapping the bars. Adding margin and height props does not fix this because the text is already in the wrong direction.

**Resolution:** Wrote a custom `AngledTick` component — a React component that receives `x`, `y`, and `payload` props from Recharts and renders a `<g transform="translate(x,y)">` containing a `<text transform="rotate(-45)">`. The SVG transform applies from the translation point (on the axis line), and with `dy={8}` and `textAnchor="end"`, the text extends cleanly downward-left below the axis. This is the most reliable pattern for angled labels in Recharts.

**Lesson:** When Recharts tick rotation looks wrong, the built-in `angle` prop is often not enough — you need a custom tick component to get full control of the SVG transform and anchor. The pattern is always: `<g transform="translate(x,y)"><text transform="rotate(deg)" textAnchor="..." dy={n}>`.

### Files modified

| File | Change |
|------|--------|
| `src/components/transactions/confirmation-modal.tsx` | Remove brand color banner; show brand as plain text row; remove `p-0` override on DialogContent |
| `src/app/(main)/transactions/[id]/edit/page.tsx` | Remove `use()` call on params; destructure directly (Next.js 14 pattern) |
| `src/components/transactions/transaction-card.tsx` | `adjust_approved` and `adjust_rejected` badges → yellow |
| `src/components/reports/cost-allocation-chart.tsx` | Replace angled tick props with custom `AngledTick` SVG component; increase height and bottom margin |
| `src/components/dashboard/stock-summary-bar.tsx` | `min-w-0` + `break-words` on text container; `shrink-0` on icon; font size `text-lg` → `text-base` |

**Week 7 status:** In progress
**Next:** Manual testing continues

---

## Week 7, Task 22: macOS 26 Liquid Glass UI Experiment

**Date:** 2026-03-09
**Scope:** Design exploration — apply Apple's macOS 26 Liquid Glass design language to the login and dashboard pages, isolated on a feature branch

### What was built

A design experiment on branch `experiment/liquid-glass-ui`, running in a separate git worktree (`/inventory_web_app_experiment`) on port 3002, completely isolated from `main`.

**Liquid Glass design language (macOS 26 / Tahoe):**
Apple's most significant visual redesign since iOS 7. Introduced at WWDC 2025. The core material — Liquid Glass — is a translucent, blurred surface that refracts and reflects its surroundings. Applied to navigation elements (sidebar, tab bars, toolbars) that float above app content, not to content itself.

**Components redesigned:**

1. **Auth layout** — Replaced flat `bg-background` with a layered gradient wallpaper (sky → indigo → violet) plus three ambient color orbs using `blur-[120px]`. Gives the glass something to refract behind it.

2. **Login card** — Replaced shadcn `Card` with a custom `GlassCard`: `bg-white/30 backdrop-blur-3xl border border-white/60 rounded-3xl shadow-2xl`. Specular highlight rendered as a 1px gradient line across the top edge. Glass inputs (`bg-white/50 backdrop-blur-sm rounded-xl`). Pill-shaped buttons (`rounded-full`) — primary in indigo, ghost in `bg-white/20`.

3. **Dashboard background** — Fixed gradient backdrop (`from-slate-100 via-sky-50 to-indigo-100`) with ambient orbs using `pointer-events-none fixed -z-10`.

4. **Stat cards** — Glass panels: `bg-white/30 backdrop-blur-2xl border border-white/60 rounded-2xl` with specular highlights.

5. **Item cards** — Same glass treatment. Progress bar replaced with a custom glass bar: `bg-white/40` track, `bg-indigo-400/60 backdrop-blur-sm` fill.

6. **Sidebar** — `bg-white/20 backdrop-blur-3xl border-r border-white/50`. Specular highlight as a vertical gradient on the right edge. Active nav links use `bg-white/50 rounded-xl`. App shell `bg-slate-50` removed so the gradient shows through.

7. **Top header + Bottom tab bar (mobile)** — `bg-white/30 backdrop-blur-3xl border border-white/50`.

### Challenge: Running two design versions side by side

**Problem:** Both servers need to run simultaneously from different branches, but a single working directory can only be on one branch at a time. Switching branches causes both servers to serve the same files, and also corrupts the webpack cache.

**Resolution:** Used `git worktree` to create a second checkout of the experiment branch at `../inventory_web_app_experiment`. Each server runs from its own directory on its own branch. `node_modules` was symlinked from the main repo. `.env` was excluded from the worktree so the test database (`.env.test`) was used without interference from the Railway production URL.

**Lesson:** `git worktree` is the correct tool for running two branches simultaneously. Never switch branches while a dev server is running — it corrupts the webpack cache and both servers break. Always clear `.next` after any branch switch if a server was running.

### Files modified (experiment branch only — main untouched)

| File | Change |
|------|--------|
| `src/app/(auth)/layout.tsx` | Gradient wallpaper background with ambient color orbs |
| `src/components/auth/login-flow.tsx` | Full glass redesign — GlassCard, GlassInput, pill buttons |
| `src/app/(main)/dashboard/page.tsx` | Fixed gradient backdrop with ambient orbs |
| `src/components/dashboard/stock-summary-bar.tsx` | Glass stat cards with specular highlights |
| `src/components/dashboard/item-card.tsx` | Glass item cards with custom glass progress bar |
| `src/components/layout/app-shell.tsx` | Remove solid bg-slate-50 |
| `src/components/layout/sidebar.tsx` | Full glass sidebar — frosted panel, glass nav links, specular edge |
| `src/components/layout/top-header.tsx` | Glass top header (mobile) |
| `src/components/layout/bottom-tab-bar.tsx` | Glass bottom tab bar (mobile) |

**Status:** Experiment in progress — branch kept for continued iteration
**Next:** Continue refining the Liquid Glass design on the experiment branch

---

## Manual Testing Round 3 — Bug Fixes

**Date:** 2026-03-13
**Scope:** Fixes from Test Notes 3 — Items (new/edit), Reports (index redirect, chart labels)

---

### Fix 1: Unit of Measure — free-text input replaced with dropdown

**Problem:** The New Item form had a plain `<Input>` for Unit of Measure. Users could type anything, leading to inconsistency across items (e.g. "kg", "Kg", "kilograms" all meaning the same thing).

**Resolution:** Replaced the input with a `<Select>` dropdown containing 20 common kitchen units across weight (kg, g, lbs, oz), volume (L, mL, gal, tbsp, tsp, cup), and count/packaging (pcs, pack, box, bag, can, bottle, sachet, tray, bundle, portion).

**File:** `src/components/items/item-form.tsx`

**Lesson:** Controlled vocabularies (dropdowns) beat free-text for any field where consistency matters downstream — especially fields used for display grouping or filtering.

---

### Fix 2: Tracks Expiration toggle — no feedback about what it does

**Problem:** Toggling "Tracks Expiration" on the New Item form silently saved the item. The tester expected an expiration date field to appear, not understanding that expiration dates are captured per-transaction (per batch), not per-item.

**Resolution:** The `tracksExpiration` flag is a configuration setting on the item — the actual expiration dates live on transactions. Rather than change the data model, we added a contextual amber info note that appears when the toggle is enabled: *"When logging stock for this item, you'll be prompted to enter an expiration date for each batch received."*

**File:** `src/components/items/item-form.tsx`

**Lesson:** When a UI action has non-obvious downstream effects, the form is the right place to explain them — not the docs. Inline contextual hints prevent support tickets.

---

### Fix 3: Edit Item — `use(params)` crash (Next.js version mismatch)

**Problem:** The Edit Item page threw: `An unsupported type was passed to use(): [object Object]`

The page was written using the Next.js 15 pattern where `params` is a `Promise<{ id: string }>` that must be unwrapped with React's `use()` hook. However, this project runs Next.js 14, where `params` is a plain object — no Promise, no `use()` needed.

**Resolution:** Removed the `use` import and the `Promise<>` type wrapper. Changed to the Next.js 14 pattern: destructure `params` directly.

```tsx
// Before (Next.js 15 pattern — wrong here)
const { id } = use(params); // params: Promise<{ id: string }>

// After (Next.js 14 pattern — correct)
const { id } = params; // params: { id: string }
```

**File:** `src/app/(main)/items/[id]/edit/page.tsx`

**Lesson:** The Next.js 14 → 15 migration changed `params` from a plain object to an async Promise in page components. Code examples from newer docs or AI tools that target Next.js 15 will silently introduce this mismatch. Always verify the Next.js version before copying routing patterns.

---

### Fix 4: `useFormField` error on Edit Item (pre-existing, unmasked by Fix 3)

**Problem:** After fixing the `use(params)` crash, the Edit Item form threw: `useFormField should be used within <FormField>`

The `isActive` toggle (edit-only) was implemented using React Hook Form's raw `<Controller>` component. shadcn/ui's `FormLabel`, `FormDescription`, and `FormControl` all call `useFormField()` internally, which reads from `FormFieldContext`. `Controller` does not provide this context — only `FormField` (the shadcn wrapper around `Controller`) does.

This bug was pre-existing but had been masked: before Fix 3, the edit page crashed immediately on the `use(params)` error and never got far enough to render the `isActive` field.

**Resolution:** Replaced `<Controller>` with `<FormField>` for the `isActive` field. Also removed the now-unused `Controller` import.

**File:** `src/components/items/item-form.tsx`

**Lesson:** One crash can mask another. Fixing the first bug revealed the second — a good reminder to test every code path after a fix, not just the one that was broken. Also: in shadcn/ui forms, always use `<FormField>` as the wrapper for form fields, never raw `<Controller>`, unless you're intentionally avoiding the shadcn form context.

---

### Fix 5: Reports index page — blank page for staff (client-side redirect unreliable)

**Problem:** The `/reports` index page was a client component that returned `null` and used a `useEffect` to redirect based on the user's role once auth had loaded. Staff users reported seeing no reports — the redirect to `/reports/low-stock` wasn't working reliably, leaving them on a blank page.

**Resolution:** Converted `/reports/page.tsx` from a client component to a server component. The server can read the session cookie directly via `getSessionFromCookie()` and issue an immediate HTTP redirect using Next.js's `redirect()` utility — no auth loading delay, no flash of nothing, no timing dependency.

```tsx
// Before: client component, useEffect redirect, returns null while waiting
// After: async server component, instant server-side redirect
export default async function ReportsPage() {
  const session = await getSessionFromCookie();
  if (!session) redirect("/login");
  if (session.role === "owner") redirect("/reports/consumption");
  redirect("/reports/low-stock");
}
```

**File:** `src/app/(main)/reports/page.tsx`

**Lesson:** Client-side redirects based on auth state are fragile — they depend on the auth context loading before the effect fires, on the router being ready, and on nothing interrupting the render cycle. Whenever you need to redirect based on server-readable state (like a session cookie), do it on the server. The result is instant, reliable, and doesn't cause layout shift.

---

### Fix 6: Cost by Category chart — labels overflowing the container

**Problem:** The "Cost by Category" pie chart used inline labels (Recharts `label` prop on `<Pie>`). With a fixed container height of 200px and long category names, labels were rendered outside the visible area and got clipped.

**Resolution:** Removed the inline `label` prop from `<Pie>`. Added a `<Legend>` component below the chart instead. Category names longer than 16 characters are truncated with an ellipsis in the legend formatter. Chart height increased from 200px to 260px. The "Cost by Brand" bar chart height was also bumped to 260px to keep both cards flush in their two-column grid (mismatched heights cause one card to stretch with dead space at the bottom).

**Files:** `src/components/reports/consumption-chart.tsx`

**Lesson:** Pie chart inline labels are convenient for simple data but fall apart with longer text or constrained containers — the Recharts renderer places them outside the pie ring with no awareness of the parent boundary. A `<Legend>` is always safer: it flows within the component's own bounding box and can be truncated without losing the chart's readability. When charts sit side-by-side in a grid, their inner `ResponsiveContainer` heights must match, or the shorter card gets padded by the grid to match the taller one — leaving a gap below the chart.

---

## Manual Testing Round 4 — Bug Fixes

**Date:** 2026-03-14
**Source:** Test Notes 4 (manual walkthrough of Admin and Item Management pages)

Three bugs identified and fixed.

---

### Fix 1: Edit User form crash — `useFormField should be used within <FormField>`

**Problem:** Clicking the pencil icon to edit a user on the Admin → Users page crashed with:

```
Error: useFormField should be used within <FormField>
```

The `EditUserForm` in `user-form.tsx` displays the user's Role as a read-only field after creation. The code used shadcn/ui's `<FormItem>`, `<FormLabel>`, and `<FormDescription>` to lay it out — the same components used for editable fields. However, those components call `useFormField()` internally, which reads from a React context (`FormFieldContext`) that is only provided by the shadcn `<FormField>` wrapper. Since the Role display was intentionally read-only and not wrapped in `<FormField>`, the context was missing and the hook threw.

**Resolution:** Replaced `<FormItem>`, `<FormLabel>`, and `<FormDescription>` with plain HTML equivalents (`<div>`, `<label>`, `<p>`) for the read-only Role field. These carry no hook dependencies.

**File:** `src/components/users/user-form.tsx`

**Lesson:** shadcn/ui's form primitives (`FormItem`, `FormLabel`, `FormDescription`, `FormMessage`) are not generic layout components — they are tightly coupled to the form context provided by `<FormField>`. Using them outside that context will always crash. For read-only display inside a form, use plain HTML or unstyled wrappers and apply the equivalent Tailwind classes manually.

---

### Fix 2: Admin Categories — delete button overlapping the edit button on hover

**Problem:** On the Admin → Categories page, hovering over a category row caused the delete (trash) icon to appear on top of the edit (pencil) icon, making the edit button unclickable.

The layout had two layers: `CategoryRow` rendered the pencil button as the last item in its flex row (flush against the right edge), and outside the row an absolutely positioned `<Button>` with `absolute right-3` held the trash icon, revealed on hover via `opacity-0 group-hover:opacity-100`. Both buttons ended up occupying the same `right-3` space.

**Resolution:** Added `pr-12` to the `CategoryRow` container div. The extra right padding shifts the row's flex content (including the pencil button) 48px away from the right edge, leaving the absolute delete button's zone clear.

**File:** `src/app/(main)/admin/categories/page.tsx`

**Lesson:** When mixing in-flow flex layout with absolutely positioned overlay elements, reserve space for the overlay explicitly. The in-flow content has no awareness of the absolute element — they occupy the same visual space unless you carve out room with padding or margin.

---

### Fix 3: Item Management — shared items showing no brand tags

**Problem:** Items assigned to both brands (i.e., shared items) showed no brand badges in the item table. Brand-specific items correctly showed either the Brand A or Brand B badge, but shared items appeared with no tag at all.

**Root cause — two layers:**

First, `BusinessBadge` had an early return of `null` for any falsy or `"shared"` business value:

```tsx
if (!business || business === "shared") return null;
```

This was the original design intent (shared items = no badge). Test Notes 4 identified this as wrong — shared items should show *both* badges.

Second, after updating the component to render both badges for `"shared"`, the fix still had no effect. The reason: the item form maps the "None (Shared)" dropdown selection to `null` before saving:

```tsx
onValueChange={(val) => field.onChange(val === "none" ? null : val)}
```

So shared items are stored as `primaryBusiness = null` in the database — never the string `"shared"`. The updated check for `business === "shared"` was a no-op because no row ever has that value.

**Resolution:** Updated the guard condition to treat both `null` and `"shared"` as shared:

```tsx
if (!business || business === "shared") {
  return (
    <>
      <Badge ...>{"Brand A"}</Badge>
      <Badge ...>Brand B</Badge>
    </>
  );
}
```

**File:** `src/components/shared/business-badge.tsx`

**Lesson:** When a UI component's behavior depends on a data value, verify what value is *actually stored* — not what the UI label says. "None (Shared)" is a display label; `null` is the stored value. The mismatch between the two caused the first fix attempt to silently do nothing. Always trace the data from the form's `onValueChange` handler through to what Prisma writes, before assuming you know what the database contains.

---

## Pre-Launch Hardening: Rate Limiting on Auth Endpoints

**Date:** 2026-03-19
**Scope:** Add rate limiting to `/api/auth/login` and `/api/auth/lookup` to protect against brute-force attacks before going live.

### Subtasks Completed

1. Created `src/lib/rate-limit.ts` — in-memory rate limiter (10 attempts / 15 min / IP)
2. Applied rate limiting to `/api/auth/login` and `/api/auth/lookup`
3. Reset rate limit counter on successful login so legitimate users don't get locked out

---

### Decision: In-Memory Rate Limiting vs. Distributed (Upstash Redis)

**Context:** Vercel deploys Next.js as serverless functions. In-memory state doesn't persist between invocations, and different requests may hit different instances — so a Map-based counter won't count across all instances.

**Why we went in-memory anyway:** The app serves a small, known user base (restaurant staff, not the public internet). The risk of a coordinated brute-force attack that specifically targets multiple Vercel instances simultaneously is negligible for this use case. An in-memory limiter is a meaningful deterrent with zero infrastructure overhead, no new services to set up, and no new environment variables.

The proper distributed solution (Upstash Redis + `@upstash/ratelimit`) would be the right call for a high-traffic public app. For two restaurants, it's over-engineering.

**Lesson:** Rate limiting is about risk reduction, not perfection. Match the solution's complexity to the actual threat model. A simple deterrent that's actually deployed beats a theoretically perfect one that requires another service to maintain.

---

### Implementation Notes

- `getClientIp` reads `x-forwarded-for` header (set by Vercel's edge layer) and falls back to `"unknown"` — meaning all requests without a forwarded IP share one bucket, which is safe to fail towards caution.
- Rate check happens before `request.json()` parsing — no wasted DB work on blocked requests.
- `resetRateLimit` called after successful login. This resets the IP's counter so a legitimate user who fat-fingered their password a few times doesn't stay penalized after getting in.
- Lookup route does NOT reset on success — it's just an email probe step, not a full authentication.

---

## Production Deployment: Vercel + Neon Postgres

**Date:** 2026-03-26
**Scope:** Deploy the app to Vercel with Neon (via Vercel Postgres) as the production database.

### Stack Decision

Chose **Vercel** (frontend/API) + **Neon** (PostgreSQL, via Vercel's Postgres integration) over the originally planned Railway. Reasons:
- Both are on free tiers with no upfront cost
- Neon is provisioned directly from the Vercel dashboard — no separate account or manual `DATABASE_URL` wiring
- Easy migration path to Railway later if needed (pg_dump + swap env var)

### TypeScript Build Failures on Vercel

The biggest friction during deployment was a series of TypeScript errors that only surfaced on Vercel's clean-build environment, not locally. Root cause: `"incremental": true` in `tsconfig.json` causes TypeScript to cache its build results locally via `tsconfig.tsbuildinfo`. Local runs skip re-checking unchanged files. Vercel starts with no cache and checks everything fresh.

**Errors fixed:**
- Implicit `any` on `.map()` and `.flatMap()` callbacks in multiple API routes — fixed by adding inline type annotations (`(owner: { id: string })`) or explicit return type arrays (`const result: ExpiringResult[] = ...`)
- `prisma/seed-test.ts` being picked up by Next.js's type checker — fixed by adding it to `tsconfig.json` exclude array
- `flatMap` returning a mix of `[]` and an object caused TypeScript to lose the return type, making downstream `.sort()` callbacks untyped — fixed by explicitly typing the result array

**Prevention:** Added `postinstall: "prisma generate"` to `package.json` so Vercel always regenerates Prisma's TypeScript types after `npm install`, before the build runs. Also established the rule: before every push, run `rm -rf .next tsconfig.tsbuildinfo && npm run build` — the same clean-slate check Vercel runs.

### Database Connection Issue

After successful deployment, `/api/auth/lookup` was returning 500. All env vars were present. Root cause: `db.ts` was using `DATABASE_URL` (Neon's pooled connection) with the `PrismaPg` driver adapter. Neon's pooled URL routes through PgBouncer, which doesn't support Prisma's session-mode features.

**Fix:** Updated `db.ts` to prefer `DATABASE_URL_UNPOOLED` when available (Neon injects both):

```ts
const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!;
```

**Lesson:** When using Neon with Prisma, always use the unpooled connection string. The pooled URL is for query-mode connections (e.g. direct SQL clients), not for Prisma's driver adapter which needs session-mode support.

### Migrations & Seed

- Ran `npx prisma migrate deploy` locally with `DATABASE_URL` set to the production Neon URL — applied all migrations to the production database
- Ran `npx prisma db seed` to create the default owner account (`owner@inventory.local` / `changeme123`)
- Smoke test confirmed: login works, dashboard loads, transactions can be logged

---

## Security Remediation (Codex Audit)

**Date:** 2026-03-28
**Scope:** 4 of 5 vulnerabilities identified by Codex security audit. Patch Set 3 (Redis rate limiting) deferred.

### Patch Set 1: Session Revocation / Role-Change Bypass (Critical)

**Problem:** Middleware refreshed JWTs by re-signing the raw token payload — no DB check ever happened. Deactivated users and role-changed users kept valid, auto-refreshing sessions until natural expiry (up to 90 min).

**Changes:**
- Added `sessionVersion Int @default(0)` to `User` model; migration `20260328090149_add_session_version`
- Added `sessionVersion: number` to `SessionUser` type in `src/types/auth.ts`
- Created `src/lib/session-validation.ts` — queries DB, validates `isActive` and `sessionVersion`
- Updated `getSessionFromCookie()` in `src/lib/auth.ts` to call `validateSessionFromDb()` on every request; handles sliding window internally (re-issues token with fresh expiry)
- Removed `refreshToken()` and `setTokenCookie()` from `src/middleware.ts` — middleware now only does JWT crypto verification for redirect decisions
- Simplified `src/app/api/auth/session/route.ts` — removed redundant `signToken` + `setAuthCookie` calls (now handled by `getSessionFromCookie`)
- `src/app/api/auth/login/route.ts` — added `sessionVersion` to DB select and `signToken` payload
- `src/app/api/users/[id]/route.ts` — increments `sessionVersion` when `isActive` is set to `false`
- `src/app/api/users/[id]/reset-credential/route.ts` — increments `sessionVersion` on credential reset

**Bug hit:** After adding `sessionVersion` to the Prisma select in the login route, build failed with `'sessionVersion' does not exist in type 'UserSelect'`. Root cause: schema was updated but `prisma generate` hadn't been run. Fixed with `npx prisma generate` before the build.

**Deployment note:** All existing sessions are invalidated on first request post-deploy (tokens without `sessionVersion` field fail the mismatch check). Users must re-login once. Expected and intentional.

---

### Patch Set 2: Account Enumeration in Lookup Endpoint (High)

**Problem:** `POST /api/auth/lookup` returned `{ authType, fullName }` with status 200 for existing accounts, and `{ error }` with status 404 for non-existing ones. Enabled scripted enumeration of all valid email addresses plus user names and auth types.

**Changes:**
- `src/app/api/auth/lookup/route.ts` — replaced entire implementation with a constant `200 { success: true }`, no DB query, no imports
- `src/components/auth/login-flow.tsx` — removed `fullName` and `authType` state; step 2 now shows a generic "Enter your password or PIN" field regardless of account type; removed "Welcome back, [Name]" greeting

**Bug hit:** After clearing the `.next` cache for a clean rebuild, encountered a stale cache `ENOENT` error on a previous build artifact. Fixed by running `rm -rf .next && npm run build`.

**Side effect:** `/login` bundle size dropped from 2.83 kB to 2.54 kB — removed state is reflected in smaller client JS.

---

### Patch Set 4: Defense-in-Depth Auth on Sensitive GET Routes (Medium)

**Problem:** `GET /api/items`, `GET /api/categories`, and `GET /api/items/expiring` had no auth check inside the route handler — only middleware. Direct unauthenticated HTTP calls bypassed middleware and returned data.

**Changes:**
- Added `getSessionFromCookie()` guard at the top of each GET handler; returns `401` if no session
- Added `import { getSessionFromCookie } from "@/lib/auth"` to `expiring/route.ts` (it didn't have it)

**Side effect:** `/api/items/expiring` changed from `○` (static, prerendered) to `ƒ` (dynamic, server-rendered on demand) in the Next.js build output — correct, since it now requires a live session check.

---

### Patch Set 5: Security Headers (Medium)

**Problem:** `next.config.mjs` was empty — no HTTP security headers on any response.

**Changes:**
- Updated `next.config.mjs` to add `async headers()` returning 6 headers on all routes (`/(.*)`):
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Content-Security-Policy` — `default-src 'self'`, with `'unsafe-inline'` for scripts and styles (required by Next.js App Router hydration and Tailwind/shadcn)

**Note:** `'unsafe-inline'` on `script-src` and `style-src` is a known limitation of Next.js 14 App Router. Can be tightened later with a nonce-based CSP if needed.

---

### Patch Set 3: Redis Rate Limiting (High) — DEFERRED

**Problem:** In-memory rate limiter doesn't survive serverless cold starts or multi-instance deployments. `x-forwarded-for` header used for IP extraction is spoofable by clients.

**Deferred because:** Requires provisioning Upstash Redis (external service). Acceptable risk for now given small known user base.

**When ready:** Install `@upstash/ratelimit @upstash/redis`, rewrite `src/lib/rate-limit.ts` with sliding window keyed on `email:ip`, use `x-vercel-forwarded-for` (Vercel-set, not spoofable) for IP extraction, add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` to Vercel env vars.


---

## UI Polish — White Surfaces & Dev Environment Fix

**Date:** 2026-03-29
**Scope:** Visual consistency pass across all pages; local dev environment setup.

### What We Built

- **Login page warm background** — changed auth layout from flat `bg-background` (`#F2F2F7`) to warm off-white `#FAF9F7`. More welcoming for a restaurant-facing app, less clinical.

- **Global input/form surfaces** — changed `bg-background` → `bg-card` (white) in the shadcn/ui base components: `input.tsx`, `select.tsx` (SelectTrigger), `textarea.tsx`, `button.tsx` (outline variant). Because the whole app builds on these primitives, one change fixes every page automatically.

- **Global overlay surfaces** — same fix applied to `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`. Modals and panels are now white instead of blending into the page gray.

- **Dashboard Expiring Soon section** — added `bg-card` to the collapsible wrapper; previously had no background so it blended with the page.

- **Transaction & Adjustment forms** — three custom surfaces needed manual fixes: quantity stepper `<input>` elements (raw HTML, not using the base Input component), brand selector radio cards (unselected state had no background class), and the Remove Stock / Add Stock correction toggle buttons (unselected state had no background class).

- **User Management table** — added `bg-card` to the `rounded-md border` table wrapper div.

- **CSP dev fix** — the Content Security Policy in `next.config.mjs` blocked `unsafe-eval`, which Next.js HMR (Hot Module Replacement) requires in development mode. Added conditional: `unsafe-eval` is included in `script-src` only when `NODE_ENV === 'development'`. Production CSP unchanged.

### Bugs Hit and Fixed

**Bug: Login button did nothing in local dev**
- **Symptom:** Clicking Continue/Sign In on the login page had no visible effect. No network request, no error shown.
- **Root cause 1:** Missing `.env.local` — without `DATABASE_URL` and `JWT_SECRET`, the app silently fails any DB call. Created `.env.local` with Neon connection string and JWT secret from Vercel dashboard.
- **Root cause 2:** Even after `.env.local` was added, the browser console showed `Uncaught EvalError: ... 'unsafe-eval' is not an allowed source`. The CSP was blocking Next.js's HMR runtime, which uses `eval` to inject hot-reloaded modules. This prevented React from mounting, so the button had no click handler attached at all.
- **Fix:** Added `isDev = process.env.NODE_ENV === 'development'` check to `next.config.mjs`; appended `'unsafe-eval'` to `script-src` only in dev mode.

**Key distinction learned:** Production builds don't need `unsafe-eval` because Next.js pre-compiles everything statically. Dev mode uses webpack HMR which requires `eval` to inject code changes on the fly. The CSP that works in production was actively breaking local development.
