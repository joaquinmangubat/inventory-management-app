# Inventory Management App

A full-stack inventory management web app built for a restaurant operation managing shared inventory across two brands. Replaces a Google Sheets workflow with a purpose-built system featuring transaction logging, adjustment workflows, cost allocation reports, and automated alerts.

## Features

- **Dual-brand tracking** — every transaction is tagged to one of two business entities
- **Transaction logging** — consume, restock, and transfer with a 5-minute edit window
- **Adjustment workflow** — staff submits adjustment requests; owner reviews and approves or rejects
- **Cost allocation reports** — monthly breakdown of inventory costs per brand
- **Low stock & expiration alerts** — automated notifications and a daily cron check
- **Two-tier auth** — staff authenticate via PIN; owners via password; both using JWT in HTTP-only cookies
- **90-minute sliding session timeout**
- **Progressive Web App** — installable on mobile with a home screen manifest
- **Role-based access** — staff see operational views; owners see reports, admin, and approval queues

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Database | PostgreSQL 15+ via Prisma ORM |
| Hosting | Vercel (app) + Railway (database) |
| Styling | Tailwind CSS + shadcn/ui |
| State | TanStack Query (server state), React Hook Form + Zod (forms) |
| Auth | JWT in HTTP-only cookies, bcrypt |
| Charts | Recharts |
| Testing | Vitest (unit + integration), Playwright (E2E) |

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, change password/PIN screens
│   ├── (main)/          # App pages (dashboard, transactions, reports, admin)
│   └── api/             # API routes
├── components/
│   ├── ui/              # shadcn/ui primitives
│   ├── layout/          # Shell, sidebar, bottom nav
│   ├── shared/          # Reusable composed components
│   └── [feature]/       # Feature-specific components
├── hooks/               # TanStack Query hooks
├── lib/                 # DB client, auth helpers, rate limiter, validations
├── providers/           # React context providers
└── types/               # Shared TypeScript types
prisma/
└── schema.prisma        # Database schema + migrations
tests/
├── unit/                # Business logic and validation tests
├── integration/         # API route tests
└── e2e/                 # Playwright end-to-end tests
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+

### Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in DATABASE_URL and JWT_SECRET

# Run migrations and generate Prisma client
npx prisma migrate dev
npx prisma generate

# Start dev server
npm run dev
```

### Commands

```bash
npm run dev              # Development server
npm run build            # Production build
npm run test             # Unit tests
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests (requires running dev server)
npx prisma studio        # Database GUI
```

## Key Design Decisions

**Negative stock is allowed** — the system records what actually happened rather than blocking the transaction. Critical-level alerts notify owners when stock goes negative.

**Prices are snapshotted at transaction time** — cost reports reflect what was paid at the time of consumption, not the current price.

**In-memory rate limiting on auth endpoints** — 10 attempts per IP per 15-minute window. Chosen over a distributed Redis-based solution given the small, known user base.

**Single Next.js codebase for frontend and backend** — API routes and React components live together, eliminating the need to manage and deploy two separate services.

## Documentation

- `TECHNICAL_SPECIFICATION.md` — API endpoints, data model, and business rules
- `UI_UX_PLAN.md` — Screen-by-screen layout and interaction details
- `DEVELOPMENT_LOG.md` — Challenges and lessons learned during development
