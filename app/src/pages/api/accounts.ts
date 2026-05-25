import type { APIRoute } from 'astro';
import { db } from '../../db/index';
import { accounts } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export const GET: APIRoute = async ({ locals }) => {
  const user = (locals as any).user;
  const result = db.select().from(accounts).where(eq(accounts.userId, user.userId)).orderBy(accounts.sortOrder).all();
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  const body = await request.json();

  const result = db.insert(accounts).values({
    userId: user.userId,
    name: body.name,
    type: body.type,
    balance: body.balance || 0,
    institution: body.institution || null,
    apr: body.apr || null,
    minimumPayment: body.minimumPayment || null,
    creditLimit: body.creditLimit || null,
    loanOriginalAmount: body.loanOriginalAmount || null,
    loanTermMonths: body.loanTermMonths || null,
    maturityDate: body.maturityDate || null,
    notes: body.notes || null,
    isOffBudget: body.isOffBudget || false,
  }).returning().get();

  return new Response(JSON.stringify(result), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return new Response(JSON.stringify({ error: 'ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = db.update(accounts)
    .set({ ...updates, updatedAt: new Date().toISOString() })
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.userId)))
    .returning()
    .get();

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get('id') || '0');

  if (!id) {
    return new Response(JSON.stringify({ error: 'ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, user.userId))).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
