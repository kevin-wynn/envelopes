import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  type: text("type", {
    enum: [
      "checking",
      "savings",
      "credit_card",
      "cash",
      "mortgage",
      "auto_loan",
      "personal_loan",
      "student_loan",
      "cd",
      "investment",
      "retirement",
      "other",
    ],
  }).notNull(),
  balance: real("balance").notNull().default(0),
  institution: text("institution"),
  apr: real("apr"),
  minimumPayment: real("minimum_payment"),
  creditLimit: real("credit_limit"),
  loanOriginalAmount: real("loan_original_amount"),
  loanTermMonths: integer("loan_term_months"),
  maturityDate: text("maturity_date"),
  notes: text("notes"),
  isOffBudget: integer("is_off_budget", { mode: "boolean" }).default(false),
  isClosed: integer("is_closed", { mode: "boolean" }).default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const categoryGroups = sqliteTable("category_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").default(0),
  isIncome: integer("is_income", { mode: "boolean" }).default(false),
  hidden: integer("hidden", { mode: "boolean" }).default(false),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  groupId: integer("group_id")
    .notNull()
    .references(() => categoryGroups.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").default(0),
  hidden: integer("hidden", { mode: "boolean" }).default(false),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const monthlyBudgets = sqliteTable("monthly_budgets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  month: text("month").notNull(), // YYYY-MM format
  assigned: real("assigned").notNull().default(0),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const payees = sqliteTable("payees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id),
  categoryId: integer("category_id").references(() => categories.id),
  payeeId: integer("payee_id").references(() => payees.id),
  date: text("date").notNull(), // YYYY-MM-DD
  amount: real("amount").notNull(), // negative for outflow, positive for inflow
  memo: text("memo"),
  cleared: integer("cleared", { mode: "boolean" }).default(false),
  approved: integer("approved", { mode: "boolean" }).default(true),
  transferAccountId: integer("transfer_account_id").references(
    () => accounts.id,
  ),
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type CategoryGroup = typeof categoryGroups.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type MonthlyBudget = typeof monthlyBudgets.$inferSelect;
export type Payee = typeof payees.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
