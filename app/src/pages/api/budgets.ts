import type { APIRoute } from 'astro';
import { db } from '../../db/index';
import { monthlyBudgets, categories, categoryGroups, transactions } from '../../db/schema';
import { eq, and, like, sql, lte, gte } from 'drizzle-orm';

export const GET: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  const url = new URL(request.url);
  const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);

  // Get all category groups with categories
  const groups = db.select().from(categoryGroups)
    .where(and(eq(categoryGroups.userId, user.userId), eq(categoryGroups.hidden, false)))
    .orderBy(categoryGroups.sortOrder)
    .all();

  const cats = db.select().from(categories)
    .where(and(eq(categories.userId, user.userId), eq(categories.hidden, false)))
    .orderBy(categories.sortOrder)
    .all();

  // Get monthly budgets for the month
  const budgets = db.select().from(monthlyBudgets)
    .where(and(eq(monthlyBudgets.userId, user.userId), eq(monthlyBudgets.month, month)))
    .all();

  // Get activity (transactions) for the month
  const monthStart = `${month}-01`;
  const nextMonth = getNextMonthDate(month);

  const activity = db.select({
    categoryId: transactions.categoryId,
    total: sql<number>`sum(${transactions.amount})`,
  }).from(transactions)
    .where(
      and(
        eq(transactions.userId, user.userId),
        gte(transactions.date, monthStart),
        like(transactions.date, `${month}%`)
      )
    )
    .groupBy(transactions.categoryId)
    .all();

  const activityMap = new Map(activity.map((a) => [a.categoryId, a.total || 0]));
  const budgetMap = new Map(budgets.map((b) => [b.categoryId, b]));

  // Calculate available = all past assigned - all past activity for each category
  // For simplicity: available = assigned this month + carryover - spent this month
  // Get all prior months budgets and activity
  const allBudgets = db.select().from(monthlyBudgets)
    .where(and(eq(monthlyBudgets.userId, user.userId), lte(monthlyBudgets.month, month)))
    .all();

  const allActivity = db.select({
    categoryId: transactions.categoryId,
    total: sql<number>`sum(${transactions.amount})`,
  }).from(transactions)
    .where(
      and(
        eq(transactions.userId, user.userId),
        lte(transactions.date, `${month}-31`)
      )
    )
    .groupBy(transactions.categoryId)
    .all();

  const totalAssignedMap = new Map<number, number>();
  allBudgets.forEach((b) => {
    totalAssignedMap.set(b.categoryId, (totalAssignedMap.get(b.categoryId) || 0) + b.assigned);
  });

  const totalActivityMap = new Map(allActivity.map((a) => [a.categoryId, a.total || 0]));

  const result = groups.map((group) => ({
    ...group,
    categories: cats.filter((c) => c.groupId === group.id).map((cat) => {
      const assigned = budgetMap.get(cat.id)?.assigned || 0;
      const monthActivity = activityMap.get(cat.id) || 0;
      const totalAssigned = totalAssignedMap.get(cat.id) || 0;
      const totalActivity = totalActivityMap.get(cat.id) || 0;
      const available = totalAssigned + totalActivity; // activity is negative for spending

      return {
        ...cat,
        budgetId: budgetMap.get(cat.id)?.id || null,
        assigned,
        activity: monthActivity,
        available: Math.round(available * 100) / 100,
      };
    }),
  }));

  // Calculate total assigned and ready to assign
  const totalIncome = allActivity.filter((a) => (a.total || 0) > 0).reduce((sum, a) => sum + (a.total || 0), 0);
  const totalAssignedAll = Array.from(totalAssignedMap.values()).reduce((sum, v) => sum + v, 0);
  const readyToAssign = Math.round((totalIncome - totalAssignedAll) * 100) / 100;

  return new Response(JSON.stringify({ groups: result, readyToAssign, month }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  const body = await request.json();

  // Upsert monthly budget
  const existing = db.select().from(monthlyBudgets)
    .where(and(
      eq(monthlyBudgets.userId, user.userId),
      eq(monthlyBudgets.categoryId, body.categoryId),
      eq(monthlyBudgets.month, body.month)
    ))
    .get();

  if (existing) {
    const result = db.update(monthlyBudgets)
      .set({ assigned: body.assigned, updatedAt: new Date().toISOString() })
      .where(eq(monthlyBudgets.id, existing.id))
      .returning().get();
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = db.insert(monthlyBudgets).values({
    userId: user.userId,
    categoryId: body.categoryId,
    month: body.month,
    assigned: body.assigned,
  }).returning().get();

  return new Response(JSON.stringify(result), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

function getNextMonthDate(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year, m, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
