import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import * as schema from "./schema";

// eslint-disable-next-line @typescript-eslint/no-require-imports
import * as _bcryptjs from "bcryptjs";
const bcrypt = (_bcryptjs as any).default ?? (_bcryptjs as typeof _bcryptjs);

const dbPath =
  import.meta.env.DATABASE_URL ||
  process.env.DATABASE_URL ||
  "./data/envelopes.db";

const dir = dirname(dbPath);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export function initializeDatabase() {
  // Create tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      institution TEXT,
      apr REAL,
      minimum_payment REAL,
      credit_limit REAL,
      loan_original_amount REAL,
      loan_term_months INTEGER,
      maturity_date TEXT,
      notes TEXT,
      is_off_budget INTEGER DEFAULT 0,
      is_closed INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS category_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      is_income INTEGER DEFAULT 0,
      hidden INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES category_groups(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      hidden INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS monthly_budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      category_id INTEGER NOT NULL REFERENCES categories(id),
      month TEXT NOT NULL,
      assigned REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      category_id INTEGER REFERENCES categories(id),
      payee_id INTEGER REFERENCES payees(id),
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      memo TEXT,
      cleared INTEGER DEFAULT 0,
      approved INTEGER DEFAULT 1,
      transfer_account_id INTEGER REFERENCES accounts(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

  `);

  // Create default user from env vars
  const username =
    import.meta.env.ENVELOPES_USERNAME ||
    process.env.ENVELOPES_USERNAME ||
    "admin";
  const password =
    import.meta.env.ENVELOPES_PASSWORD ||
    process.env.ENVELOPES_PASSWORD ||
    "changeme";

  const existingUser = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .get();

  if (!existingUser) {
    const passwordHash = bcrypt.hashSync(password, 12);
    const user = db
      .insert(schema.users)
      .values({
        username,
        passwordHash,
      })
      .returning()
      .get();

    // Seed default category groups and categories
    seedDefaultCategories(user.id);
    console.log(`Created user: ${username}`);
  } else {
    // Always sync password from env in case it changed
    const passwordMatches = bcrypt.compareSync(
      password,
      existingUser.passwordHash,
    );
    if (!passwordMatches) {
      const newHash = bcrypt.hashSync(password, 12);
      db.update(schema.users)
        .set({ passwordHash: newHash })
        .where(eq(schema.users.id, existingUser.id))
        .run();
      console.log(`Updated password for user: ${username}`);
    }
  }
}

function seedDefaultCategories(userId: number) {
  const groups = [
    {
      name: "Income",
      isIncome: true,
      categories: ["Salary", "Freelance", "Interest", "Other Income"],
    },
    {
      name: "Housing",
      isIncome: false,
      categories: [
        "Rent/Mortgage",
        "Utilities",
        "Internet",
        "Phone",
        "Home Insurance",
        "Home Maintenance",
      ],
    },
    {
      name: "Transportation",
      isIncome: false,
      categories: [
        "Car Payment",
        "Gas",
        "Car Insurance",
        "Maintenance",
        "Public Transit",
        "Parking",
      ],
    },
    {
      name: "Food & Dining",
      isIncome: false,
      categories: ["Groceries", "Restaurants", "Coffee Shops", "Fast Food"],
    },
    {
      name: "Personal",
      isIncome: false,
      categories: [
        "Clothing",
        "Personal Care",
        "Health & Fitness",
        "Education",
      ],
    },
    {
      name: "Entertainment",
      isIncome: false,
      categories: [
        "Streaming Services",
        "Hobbies",
        "Books & Media",
        "Events & Activities",
      ],
    },
    {
      name: "Health",
      isIncome: false,
      categories: [
        "Health Insurance",
        "Doctor/Dentist",
        "Medications",
        "Vision",
      ],
    },
    {
      name: "Financial",
      isIncome: false,
      categories: ["Savings", "Investments", "Emergency Fund"],
    },
    {
      name: "Giving",
      isIncome: false,
      categories: ["Charitable Donations", "Gifts"],
    },
  ];

  groups.forEach((group, groupIndex) => {
    const g = db
      .insert(schema.categoryGroups)
      .values({
        userId,
        name: group.name,
        sortOrder: groupIndex,
        isIncome: group.isIncome,
      })
      .returning()
      .get();

    group.categories.forEach((catName, catIndex) => {
      db.insert(schema.categories)
        .values({
          groupId: g.id,
          userId,
          name: catName,
          sortOrder: catIndex,
        })
        .run();
    });
  });
}

// Initialize on import
initializeDatabase();
