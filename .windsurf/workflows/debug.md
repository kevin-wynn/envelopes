---
description: Debugging workflow for the Envelopes app — isolate and fix issues systematically
---

## Debug an Issue in Envelopes

Use this workflow to systematically track down bugs. Always identify root cause before touching code.

---

### 1. Load project context

Read `.windsurf/rules/project.md` to orient yourself before investigating.

---

### 2. Classify the bug

Determine where the bug likely lives:

| Symptom | Likely Location |
|---|---|
| Page redirects to `/login` unexpectedly | `middleware.ts`, JWT cookie, `auth.ts` |
| API returns 401 | Missing/expired JWT cookie, middleware |
| API returns 500 | DB query error, missing field, Drizzle type mismatch |
| Data not showing in UI | React `useEffect` fetch, API response shape, state |
| Wrong numbers (balances, budgets) | Balance recalculation logic in `transactions.ts`, budget `available` calc in `budgets.ts` |
| Form submit does nothing | JS event handler, fetch call, API validation |
| Styles wrong | Tailwind class name, custom class in `global.css`, missing import |
| DB changes not persisting | Missing `.run()` on Drizzle mutations, schema mismatch |
| App crashes on startup | `db/index.ts` `initializeDatabase()`, missing env var |

---

### 3. Check the dev server output

Run the dev server and watch the terminal:
```bash
cd app && npm run dev
```

Look for:
- TypeScript errors
- Drizzle query errors
- `initializeDatabase()` failure messages
- Unhandled promise rejections

---

### 4. Add targeted logging

**API route debugging** — add `console.log` before and after the DB call:
```ts
export const GET: APIRoute = async ({ locals }) => {
  const user = (locals as any).user;
  console.log('[DEBUG accounts GET] userId:', user?.userId);
  try {
    const result = db.select().from(accounts).where(...).all();
    console.log('[DEBUG accounts GET] result count:', result.length);
    return new Response(JSON.stringify(result), ...);
  } catch (err) {
    console.error('[DEBUG accounts GET] error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, ... });
  }
};
```

**React component debugging** — log state and fetch results:
```tsx
useEffect(() => {
  fetch("/api/accounts")
    .then((r) => {
      console.log('[DEBUG] response status:', r.status);
      return r.json();
    })
    .then((data) => {
      console.log('[DEBUG] data received:', data);
      setAccounts(data);
    })
    .catch((err) => console.error('[DEBUG] fetch error:', err));
}, []);
```

---

### 5. Auth / cookie issues

Check the cookie is being set and sent:

1. Open DevTools → Application → Cookies → look for `envelopes_token`
2. Verify it's `HttpOnly` and not expired
3. Check `auth.ts` `TOKEN_EXPIRY` = `'7d'`
4. Check `JWT_SECRET` env var is consistent between restarts
5. The cookie name is `envelopes_token` — verify in `auth.ts` `getUserFromCookie()`

To test auth manually:
```bash
curl -c cookies.txt -X POST http://localhost:4321/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"changeme"}'

curl -b cookies.txt http://localhost:4321/api/accounts
```

---

### 6. Database issues

**Inspect the SQLite file directly:**
```bash
sqlite3 app/data/envelopes.db
.tables
.schema accounts
SELECT * FROM transactions LIMIT 10;
```

**Common DB issues:**
- Missing column → schema was updated in `schema.ts` but not in `db/index.ts` `initializeDatabase()` SQL block (SQLite `IF NOT EXISTS` won't add new columns)
- Wrong data type → Drizzle `real` vs `integer` mismatch
- Foreign key error → check `sqlite.pragma("foreign_keys = ON")` is set (it is, in `db/index.ts`)
- Balance wrong → the balance recalc sums ALL transactions for the account; check if any have wrong `accountId`

**Check balance calculation:**
```bash
sqlite3 app/data/envelopes.db \
  "SELECT account_id, SUM(amount) as balance FROM transactions GROUP BY account_id;"
```

---

### 7. Budget calculation issues

The `available` for a category is calculated in `budgets.ts` as:
```
available = totalAssigned (all months ≤ current) + totalActivity (all months ≤ current)
```

`activity` values are **negative** for spending (outflows), so `totalAssigned + totalActivity` gives the running balance.

`readyToAssign` = sum of all positive transaction amounts (income) - total assigned across all months.

To debug: log the `activityMap`, `budgetMap`, `totalAssignedMap`, `totalActivityMap` in `budgets.ts GET`.

---

### 8. Drizzle query issues

If a Drizzle query returns `undefined` instead of throwing:
- `.get()` returns `undefined` if no row found (not an error)
- `.all()` returns `[]` if no rows
- Always check for `undefined` before using `.get()` results

If a mutation doesn't persist:
- Mutations need `.run()` (fire-and-forget) or `.returning().get()` (get result)
- Missing `.run()` means the query is built but never executed

---

### 9. TypeScript errors

Common TS errors in this codebase:
- `locals.user` doesn't exist → use `(locals as any).user`
- `accounts.type` enum mismatch → make sure value is one of the 12 valid account type strings
- `amount` expects `number` but gets `string` → parse with `parseFloat()` or `Number()`

Run type check:
```bash
cd app && npx tsc --noEmit
```

---

### 10. Minimal fix

Once root cause is identified:
- Make the **smallest possible change** that fixes the root cause
- Do not add workarounds that paper over the real problem
- Remove all debug `console.log` statements before committing
- Verify the fix doesn't break other features that touch the same data

---

### 11. Update docs if needed

If the bug revealed an undocumented gotcha, add it to the **Known Patterns & Gotchas** section of `.windsurf/rules/project.md`.
