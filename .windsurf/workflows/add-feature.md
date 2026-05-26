---
description: End-to-end workflow for adding a new feature to the Envelopes app
---

## Add a New Feature to Envelopes

Use this workflow whenever building a new feature. Follow each step in order.

---

### 1. Load project context

Read `.windsurf/rules/project.md` to refresh on architecture, conventions, and gotchas before writing any code.

---

### 2. Clarify scope

Before touching any files, confirm:
- Does this feature need a **new page** or does it extend an existing one?
- Does it need a **new DB table** or new columns? (If yes, follow `db-schema-change` workflow instead for that part)
- Does it need a **new API route** or extend an existing one? (See `new-api-route` workflow)
- Does it need a **new React component** or extend an existing one? (See `new-component` workflow)

---

### 3. Schema changes (if needed)

If the feature requires new tables or columns:

1. Add the new table/column definition to `app/src/db/schema.ts` using Drizzle syntax
2. Add the matching `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE` SQL to the `initializeDatabase()` function in `app/src/db/index.ts`
3. Export any new types at the bottom of `schema.ts`
4. See `db-schema-change.md` workflow for full details

---

### 4. Create the API route(s)

Create `app/src/pages/api/[feature-name].ts`:

```ts
import type { APIRoute } from 'astro';
import { db } from '../../db/index';
import { yourTable } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export const GET: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  // always filter by user.userId for data isolation
  const result = db.select().from(yourTable).where(eq(yourTable.userId, user.userId)).all();
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  const body = await request.json();
  const result = db.insert(yourTable).values({ userId: user.userId, ...body }).returning().get();
  return new Response(JSON.stringify(result), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
```

Key rules:
- **Always** filter queries by `user.userId` — no cross-user data leakage
- Use `(locals as any).user` to access the authenticated user
- Return `new Response(JSON.stringify(...), { headers: { 'Content-Type': 'application/json' } })`
- PUT updates use `{ id, ...updates }` from body; DELETE uses `?id=` query param

---

### 5. Create the React component

Create `app/src/components/[FeatureName]View.tsx` (or `[FeatureName].tsx`):

```tsx
import { useEffect, useState } from "react";

export default function FeatureNameView() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/feature-name")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* content */}
    </div>
  );
}
```

Key rules:
- All data fetching inside `useEffect` — no server props passed from Astro
- Use Tailwind classes from the design system (see `global.css` for custom classes)
- Use `lucide-react` for icons, `recharts` for charts
- Use `.card`, `.stat-card`, `.btn-primary`, `.input`, `.label` utility classes
- Colors: `brand-*`, `ink-*`, `paper-*`, `success-*`, `danger-*`
- For modals, use `createPortal(content, document.body)` pattern
- For deletes, use `<ConfirmDialog>` from `./ui/ConfirmDialog`

---

### 6. Create the Astro page

Create `app/src/pages/app/[feature-name].astro`:

```astro
---
import AppLayout from "../../layouts/AppLayout.astro";
import "../../styles/global.css";
import FeatureNameView from "../../components/FeatureNameView";
---

<AppLayout title="Feature Name" activeNav="feature-name">
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-ink-900">Feature Name</h1>
      <p class="text-sm text-ink-400 mt-1">Description of this feature</p>
    </div>
    <FeatureNameView client:load />
  </div>
</AppLayout>
```

---

### 7. Add nav link to sidebar

Edit `app/src/layouts/AppLayout.astro` — add a new `<a>` in the `<nav>` section following the existing pattern:

```astro
<a
  href="/app/feature-name"
  class:list={[
    "sidebar-link",
    activeNav === "feature-name"
      ? "bg-sidebar-active text-paper-100"
      : "text-paper-400 hover:text-paper-100 hover:bg-sidebar-hover",
  ]}
>
  <!-- SVG icon here (Heroicons outline style, w-5 h-5) -->
  Feature Name
</a>
```

---

### 8. Test the feature

Start the dev server if not running:
```bash
cd app && npm run dev
```

Check:
- [ ] Page loads at `/app/[feature-name]`
- [ ] Sidebar nav link works and shows active state
- [ ] API routes return correct data
- [ ] Create/update/delete operations work and reflect in UI
- [ ] Auth is enforced (test by removing cookie)
- [ ] No console errors

---

### 9. Update project docs

After completing the feature, update `.windsurf/rules/project.md`:
- Add new files to the directory tree
- Add new API routes to the API Routes table
- Add any new gotchas or patterns discovered
