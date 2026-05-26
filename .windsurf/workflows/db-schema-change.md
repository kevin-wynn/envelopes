---
description: Make a database schema change (new table, new column, or modify existing) in the Envelopes app
---

## Database Schema Change

**Important:** This app has no migration runner. Schema changes must be applied in two places simultaneously. Skipping either step will cause the app to crash or silently fail.

---

### 1. Understand the dual-schema system

The app uses SQLite with Drizzle ORM. Schema is defined in **two places**:

| File | Purpose |
|---|---|
| `app/src/db/schema.ts` | Drizzle ORM schema — TypeScript types, relations, query builder |
| `app/src/db/index.ts` | Raw SQL `CREATE TABLE IF NOT EXISTS` — actually creates tables on startup |

**Both must be updated** for any schema change. The Drizzle schema drives type safety; the raw SQL in `index.ts` is what actually runs when the app boots.

---

### 2. Adding a new table

**Step A — Add to `schema.ts`:**

```ts
import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./schema"; // if referencing users

export const yourNewTable = sqliteTable("your_new_table", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  amount: real("amount").notNull().default(0),
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Add type export at bottom of file:
export type YourNewTable = typeof yourNewTable.$inferSelect;
```

**Step B — Add to `index.ts` `initializeDatabase()` SQL block:**

```ts
sqlite.exec(`
  -- ... existing tables ...

  CREATE TABLE IF NOT EXISTS your_new_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);
```

**Step C — Import in `index.ts` and `drizzle()`:**

The `db/index.ts` already does `import * as schema from "./schema"` and passes it to `drizzle(sqlite, { schema })`. Your new table will be automatically included.

---

### 3. Adding a new column to an existing table

**Critical:** SQLite `CREATE TABLE IF NOT EXISTS` won't add columns to an already-existing table. For existing databases, you need `ALTER TABLE`.

**Step A — Update `schema.ts`** to add the column to the table definition.

**Step B — Update `index.ts`** to add both:
1. The column in the `CREATE TABLE IF NOT EXISTS` block (for fresh installs)
2. An `ALTER TABLE ... ADD COLUMN` statement (for existing databases)

```ts
// In initializeDatabase(), after the CREATE TABLE block:
try {
  sqlite.exec(`ALTER TABLE accounts ADD COLUMN new_field TEXT`);
} catch {
  // Column already exists — safe to ignore
}
```

The `try/catch` is necessary because SQLite throws an error if you try to `ADD COLUMN` and it already exists. This makes the migration idempotent.

---

### 4. Drizzle type reference

| TypeScript | Drizzle | SQLite |
|---|---|---|
| `number` (int) | `integer("col")` | `INTEGER` |
| `number` (float) | `real("col")` | `REAL` |
| `string` | `text("col")` | `TEXT` |
| `boolean` | `integer("col", { mode: "boolean" })` | `INTEGER` (0/1) |
| `string` enum | `text("col", { enum: ["a","b"] })` | `TEXT` |
| optional | `.nullable()` or no `.notNull()` | nullable |
| required | `.notNull()` | NOT NULL |
| default value | `.default(value)` | `DEFAULT value` |
| SQL default | `.default(sql\`CURRENT_TIMESTAMP\`)` | `DEFAULT CURRENT_TIMESTAMP` |
| foreign key | `.references(() => otherTable.id)` | `REFERENCES other_table(id)` |

---

### 5. Verify the change

Start the dev server — DB is initialized on import:
```bash
cd app && npm run dev
```

Confirm the table/column exists:
```bash
sqlite3 app/data/envelopes.db ".schema your_new_table"
sqlite3 app/data/envelopes.db "PRAGMA table_info(accounts);"
```

---

### 6. Seed data (if needed)

If the new table needs default rows for new users, add them to `seedDefaultCategories()` or create a new seed function called from `initializeDatabase()`.

---

### 7. Update project docs

Add the new table/columns to the **Database Schema** section of `.windsurf/rules/project.md`.
