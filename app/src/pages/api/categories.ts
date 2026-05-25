import type { APIRoute } from 'astro';
import { db } from '../../db/index';
import { categories, categoryGroups, monthlyBudgets } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export const GET: APIRoute = async ({ locals }) => {
  const user = (locals as any).user;

  const groups = db.select().from(categoryGroups)
    .where(eq(categoryGroups.userId, user.userId))
    .orderBy(categoryGroups.sortOrder)
    .all();

  const cats = db.select().from(categories)
    .where(eq(categories.userId, user.userId))
    .orderBy(categories.sortOrder)
    .all();

  const result = groups.map((group) => ({
    ...group,
    categories: cats.filter((c) => c.groupId === group.id),
  }));

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  const body = await request.json();

  if (body.type === 'group') {
    const result = db.insert(categoryGroups).values({
      userId: user.userId,
      name: body.name,
      sortOrder: body.sortOrder || 0,
      isIncome: body.isIncome || false,
    }).returning().get();
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = db.insert(categories).values({
    groupId: body.groupId,
    userId: user.userId,
    name: body.name,
    sortOrder: body.sortOrder || 0,
  }).returning().get();

  return new Response(JSON.stringify(result), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  const body = await request.json();
  const { id, type, ...updates } = body;

  if (type === 'group') {
    const result = db.update(categoryGroups)
      .set(updates)
      .where(and(eq(categoryGroups.id, id), eq(categoryGroups.userId, user.userId)))
      .returning().get();
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = db.update(categories)
    .set(updates)
    .where(and(eq(categories.id, id), eq(categories.userId, user.userId)))
    .returning().get();

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get('id') || '0');
  const type = url.searchParams.get('type');

  if (type === 'group') {
    // Delete associated budgets and categories first
    const cats = db.select().from(categories).where(eq(categories.groupId, id)).all();
    for (const cat of cats) {
      db.delete(monthlyBudgets).where(eq(monthlyBudgets.categoryId, cat.id)).run();
    }
    db.delete(categories).where(eq(categories.groupId, id)).run();
    db.delete(categoryGroups).where(and(eq(categoryGroups.id, id), eq(categoryGroups.userId, user.userId))).run();
  } else {
    db.delete(monthlyBudgets).where(eq(monthlyBudgets.categoryId, id)).run();
    db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, user.userId))).run();
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
