---
description: Add a new API route to the Envelopes app
---

## Add a New API Route

Use this workflow whenever adding a new REST endpoint to `app/src/pages/api/`.

---

### 1. Create the route file

Create `app/src/pages/api/[resource-name].ts`.

Astro file-based routing maps:
- `app/src/pages/api/foo.ts` → `/api/foo`
- `app/src/pages/api/foo/bar.ts` → `/api/foo/bar`

---

### 2. Implement the handlers

Use this full template with all relevant HTTP methods:

```ts
import type { APIRoute } from 'astro';
import { db } from '../../db/index';
import { yourTable } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

// GET — list or fetch
export const GET: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  const url = new URL(request.url);

  // Parse query params if needed
  const id = url.searchParams.get('id');

  const result = db
    .select()
    .from(yourTable)
    .where(eq(yourTable.userId, user.userId))
    .orderBy(yourTable.sortOrder)
    .all();

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST — create
export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  const body = await request.json();

  // Validate required fields
  if (!body.name) {
    return new Response(JSON.stringify({ error: 'name is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = db
    .insert(yourTable)
    .values({
      userId: user.userId,
      name: body.name,
      // ...other fields
    })
    .returning()
    .get();

  return new Response(JSON.stringify(result), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

// PUT — update (id in body)
export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return new Response(JSON.stringify({ error: 'id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = db
    .update(yourTable)
    .set({ ...updates, updatedAt: new Date().toISOString() })
    .where(and(eq(yourTable.id, id), eq(yourTable.userId, user.userId)))
    .returning()
    .get();

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// DELETE — delete (id in query param)
export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get('id') || '0');

  if (!id) {
    return new Response(JSON.stringify({ error: 'id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  db.delete(yourTable)
    .where(and(eq(yourTable.id, id), eq(yourTable.userId, user.userId)))
    .run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

---

### 3. Critical rules

- **Always** filter by `user.userId` — never return another user's data
- `(locals as any).user` — the `user` object has `{ userId: number, username: string }`
- Use `.get()` for single-row queries (returns `undefined` if not found — check for it!)
- Use `.all()` for multi-row queries (returns `[]` if none)
- Use `.run()` for mutations where you don't need the result
- Use `.returning().get()` for mutations where you need the created/updated row
- The `Content-Type: application/json` header is required on every response
- `status: 201` for creates, `status: 400` for bad requests, `status: 404` for not found

---

### 4. Nested routes

For auth-related routes like login/logout (which are public), create under `api/auth/`:
```
app/src/pages/api/auth/login.ts   → /api/auth/login
app/src/pages/api/auth/logout.ts  → /api/auth/logout
```

Public routes must be added to `PUBLIC_PATHS` in `middleware.ts`:
```ts
const PUBLIC_PATHS = ['/login', '/api/auth/login'];
```

---

### 5. Test the route

With dev server running:
```bash
# With cookie from login
curl -b cookies.txt http://localhost:4321/api/your-route
curl -b cookies.txt -X POST http://localhost:4321/api/your-route \
  -H "Content-Type: application/json" \
  -d '{"name":"test"}'
curl -b cookies.txt -X DELETE "http://localhost:4321/api/your-route?id=1"
```

---

### 6. Document it

Add the new route to the **API Routes** table in `.windsurf/rules/project.md`.
