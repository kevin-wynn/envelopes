# Envelopes — Agent Rules & Project Context

## What This App Is

**Envelopes** is a self-hosted, open-source envelope budgeting web app inspired by YNAB and Monarch Money. Users self-host it via Docker, log in with credentials set through environment variables, and manage their personal finances with no third-party data access.

Live at: `http://localhost:4321` (Docker) or `http://localhost:4321` (dev)

---

## Monorepo Structure

```
envelopes/
├── app/          ← Main application (Astro SSR + React + SQLite)
└── marketing/    ← Static marketing site (Astro static)
```

### `app/` — Main Application

```
app/src/
├── components/
│   ├── Dashboard.tsx          — Dashboard page component (net worth, recent txns)
│   ├── BudgetView.tsx         — Budget page: monthly envelope assignment/tracking
│   ├── AccountsView.tsx       — Accounts CRUD with all account types
│   ├── TransactionsView.tsx   — Transaction list with filters
│   └── ui/
│       ├── AddTransactionModal.tsx   — Modal for add/edit transaction
│       └── ConfirmDialog.tsx         — Generic confirm/delete dialog
├── db/
│   ├── schema.ts              — Drizzle ORM schema (all tables + type exports)
│   └── index.ts               — DB init, table creation, user seeding, default categories
├── layouts/
│   ├── Layout.astro           — Base HTML layout (used by login page)
│   └── AppLayout.astro        — Full app shell with sidebar nav (used by all app pages)
├── lib/
│   ├── auth.ts                — bcryptjs login, JWT sign/verify, cookie parsing
│   └── utils.ts               — formatCurrency, formatDate, month helpers, account type constants
├── pages/
│   ├── index.astro            — Redirects to /app/dashboard or /login
│   ├── login.astro            — Login page (JS fetch to /api/auth/login)
│   ├── app/
│   │   ├── dashboard.astro    — Mounts <Dashboard client:load />
│   │   ├── budget.astro       — Mounts <BudgetView client:load />
│   │   ├── accounts.astro     — Mounts <AccountsView client:load />
│   │   └── transactions.astro — Mounts <TransactionsView client:load />
│   └── api/
│       ├── accounts.ts        — GET/POST/PUT/DELETE /api/accounts
│       ├── transactions.ts    — GET/POST/PUT/DELETE /api/transactions
│       ├── budgets.ts         — GET/POST /api/budgets
│       ├── categories.ts      — GET/POST/PUT/DELETE /api/categories
│       ├── payees.ts          — GET /api/payees
│       └── auth/
│           ├── login.ts       — POST /api/auth/login (sets HTTP-only JWT cookie)
│           └── logout.ts      — POST /api/auth/logout (clears cookie)
├── styles/
│   └── global.css             — Tailwind base + custom component classes
├── env.d.ts                   — Astro/env type declarations
└── middleware.ts              — JWT auth guard (redirects to /login or 401)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Astro 4 (SSR, Node adapter, standalone mode) |
| UI Components | React 18 (client islands via `client:load`) |
| Styling | Tailwind CSS 3 + custom utility classes in `global.css` |
| Icons | Lucide React (available, use it for new UI) |
| Charts | Recharts 2 (available, not yet used in app) |
| DB ORM | Drizzle ORM (better-sqlite3) |
| Database | SQLite file at `DATABASE_URL` (default `./data/envelopes.db`) |
| Auth | bcryptjs password hashing + JWT (7d expiry, HTTP-only cookie `envelopes_token`) |
| Deployment | Docker, port 4321, standalone Node server |

---

## Database Schema

### Tables

| Table | Key Fields |
|---|---|
| `users` | id, username, password_hash |
| `accounts` | id, user_id, name, type, balance, institution, apr, minimum_payment, credit_limit, loan_*, is_off_budget, is_closed, sort_order |
| `category_groups` | id, user_id, name, sort_order, is_income, hidden |
| `categories` | id, group_id, user_id, name, sort_order, hidden |
| `monthly_budgets` | id, user_id, category_id, month (YYYY-MM), assigned |
| `payees` | id, user_id, name |
| `transactions` | id, user_id, account_id, category_id, payee_id, date (YYYY-MM-DD), amount (negative=outflow), memo, cleared, approved, transfer_account_id |

### Account Types (enum)
`checking`, `savings`, `credit_card`, `cash`, `mortgage`, `auto_loan`, `personal_loan`, `student_loan`, `cd`, `investment`, `retirement`, `other`

Assets: `checking`, `savings`, `cash`, `cd`, `investment`, `retirement`
Liabilities: `credit_card`, `mortgage`, `auto_loan`, `personal_loan`, `student_loan`

---

## API Routes

All routes under `/api/*` (except `/api/auth/login`) require auth via JWT cookie. The middleware handles this — API routes get 401, pages get redirect to `/login`.

| Method | Route | Description |
|---|---|---|
| GET | `/api/accounts` | List user accounts ordered by sort_order |
| POST | `/api/accounts` | Create account |
| PUT | `/api/accounts` | Update account by id in body |
| DELETE | `/api/accounts?id=` | Delete account |
| GET | `/api/transactions?accountId=&month=&limit=&offset=` | List transactions with joins |
| POST | `/api/transactions` | Create transaction, auto-creates payee, recalculates account balance |
| PUT | `/api/transactions` | Update transaction, recalculates balance |
| DELETE | `/api/transactions?id=` | Delete transaction, recalculates balance |
| GET | `/api/budgets?month=YYYY-MM` | Budget groups+categories with assigned/activity/available, readyToAssign |
| POST | `/api/budgets` | Upsert monthly budget assignment |
| GET | `/api/categories` | All groups+categories (including hidden) |
| POST | `/api/categories` | Create group (type:'group') or category |
| PUT | `/api/categories` | Rename group or category |
| DELETE | `/api/categories?id=&type=` | Delete with cascade |
| GET | `/api/payees` | List payees |
| POST | `/api/auth/login` | Authenticate, set cookie |
| POST | `/api/auth/logout` | Clear cookie |

---

## Auth Flow

1. User visits any page → `middleware.ts` checks `envelopes_token` cookie
2. `getUserFromCookie()` parses cookie header, calls `verifyToken()` (JWT)
3. Valid: attaches `context.locals.user = { userId, username }` and continues
4. Invalid: API → 401 JSON, Page → redirect `/login`
5. Login: POST to `/api/auth/login` → bcrypt compare → JWT signed → `Set-Cookie` HTTP-only

Access user in any API route via `(locals as any).user.userId`

---

## UI Patterns & Conventions

### Tailwind Custom Classes (defined in `global.css`)
- `.stat-card` — white card with padding for dashboard stats
- `.stat-label` — small uppercase label text
- `.stat-value` — large number display
- `.card` — general white card container
- `.card-header` — card header with bottom border
- `.sidebar-link` — flex row nav item with icon
- `.btn-primary` — primary action button
- `.btn-secondary` — secondary button
- `.btn-lg` — large button size modifier
- `.input` — form input
- `.label` — form label
- `.badge-*` — status badges

### Color Palette (Tailwind theme)
- `brand-*` — primary green (brand color)
- `ink-*` — text grays
- `paper-*` — background neutrals
- `success-*` — green success states
- `danger-*` — red error/negative states
- `sidebar` / `sidebar-active` / `sidebar-hover` — sidebar specific colors

### Component Pattern
- Pages are Astro files in `app/src/pages/app/` that mount one React island with `client:load`
- All data fetching happens inside React components via `fetch()` to API routes
- No server-side props passed to React components — they self-fetch on mount
- Modals use `createPortal(document.body)` pattern
- Confirm/delete dialogs use the shared `<ConfirmDialog>` component

### Adding a New Page
1. Create `app/src/pages/app/[name].astro` using `<AppLayout>` with correct `activeNav`
2. Create `app/src/components/[Name]View.tsx` (or `[Name].tsx`)
3. Mount the component with `client:load` in the Astro page
4. Add nav link to `AppLayout.astro` sidebar
5. Add API route(s) under `app/src/pages/api/[name].ts` if needed

---

## Environment Variables

| Variable | Default | Notes |
|---|---|---|
| `JWT_SECRET` | `envelopes-secret-change-me-in-production` | Required in prod |
| `ENVELOPES_USERNAME` | `admin` | Login username |
| `ENVELOPES_PASSWORD` | `changeme` | Hashed with bcrypt on startup |
| `DATABASE_URL` | `./data/envelopes.db` | SQLite file path |

---

## Known Patterns & Gotchas

- **Balance recalculation**: Account balances are recalculated from scratch by summing all transactions for that account on every transaction create/update/delete. This is intentional but not optimized for large datasets.
- **Budget `readyToAssign`**: Calculated as total positive activity (income) minus total assigned across all months up to current. Can be negative.
- **Amount convention**: Positive = inflow/income, Negative = outflow/expense. TransactionsView splits into `inflow`/`outflow` fields for UX then converts on submit.
- **Payee auto-creation**: POSTing a transaction with `payeeName` (string) instead of `payeeId` will find-or-create the payee automatically.
- **DB init on import**: `app/src/db/index.ts` runs `initializeDatabase()` at module load time — tables are created and the default user is seeded on every server start.
- **No migrations system**: Schema changes must be made manually in both `schema.ts` (Drizzle) and the `CREATE TABLE IF NOT EXISTS` block in `db/index.ts`.
- **bcryptjs ESM compat**: There's a workaround `const bcrypt = (_bcryptjs as any).default ?? _bcryptjs` due to ESM/CJS interop issues.
- **`locals` typing**: The Astro `locals` type doesn't include `user` by default — always cast as `(locals as any).user`.

---

## Marketing Site (`marketing/`)

Static Astro site deployed separately (Cloudflare Pages via `wrangler.toml`). Single page at `marketing/src/pages/index.astro`. Has its own `package.json` and Tailwind config. Not connected to the app backend.

---

## Development Commands

```bash
# Run app dev server
cd app && npm run dev        # http://localhost:4321

# Build for production
cd app && npm run build

# Run production server
cd app && npm run start

# Docker
docker compose up -d         # from app/ directory

# Marketing site
cd marketing && npm run dev
```
