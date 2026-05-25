import type { APIRoute } from 'astro';
import { db } from '../../db/index';
import { transactions, accounts, payees, categories } from '../../db/schema';
import { eq, and, desc, gte, lte, like } from 'drizzle-orm';

export const GET: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  const url = new URL(request.url);
  const accountId = url.searchParams.get('accountId');
  const month = url.searchParams.get('month');
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  let conditions = [eq(transactions.userId, user.userId)];

  if (accountId) {
    conditions.push(eq(transactions.accountId, parseInt(accountId)));
  }

  if (month) {
    conditions.push(like(transactions.date, `${month}%`));
  }

  const result = db.select({
    transaction: transactions,
    accountName: accounts.name,
    categoryName: categories.name,
    payeeName: payees.name,
  })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(payees, eq(transactions.payeeId, payees.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(limit)
    .offset(offset)
    .all();

  const formatted = result.map((r) => ({
    ...r.transaction,
    accountName: r.accountName,
    categoryName: r.categoryName,
    payeeName: r.payeeName,
  }));

  return new Response(JSON.stringify(formatted), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  const body = await request.json();

  // Create or find payee
  let payeeId = body.payeeId || null;
  if (body.payeeName && !payeeId) {
    const existing = db.select().from(payees)
      .where(and(eq(payees.userId, user.userId), eq(payees.name, body.payeeName)))
      .get();

    if (existing) {
      payeeId = existing.id;
    } else {
      const newPayee = db.insert(payees).values({
        userId: user.userId,
        name: body.payeeName,
      }).returning().get();
      payeeId = newPayee.id;
    }
  }

  const result = db.insert(transactions).values({
    userId: user.userId,
    accountId: body.accountId,
    categoryId: body.categoryId || null,
    payeeId,
    date: body.date,
    amount: body.amount,
    memo: body.memo || null,
    cleared: body.cleared || false,
    transferAccountId: body.transferAccountId || null,
  }).returning().get();

  // Update account balance
  db.update(accounts)
    .set({
      balance: db.select({
        total: eq(transactions.accountId, body.accountId)
      }).from(transactions) as any,
    });

  // Simpler approach: directly update balance
  const accountTxns = db.select().from(transactions).where(eq(transactions.accountId, body.accountId)).all();
  const newBalance = accountTxns.reduce((sum, t) => sum + t.amount, 0);
  db.update(accounts).set({ balance: newBalance }).where(eq(accounts.id, body.accountId)).run();

  return new Response(JSON.stringify(result), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  const body = await request.json();
  const { id, ...updates } = body;

  // Handle payee
  if (updates.payeeName) {
    const existing = db.select().from(payees)
      .where(and(eq(payees.userId, user.userId), eq(payees.name, updates.payeeName)))
      .get();

    if (existing) {
      updates.payeeId = existing.id;
    } else {
      const newPayee = db.insert(payees).values({
        userId: user.userId,
        name: updates.payeeName,
      }).returning().get();
      updates.payeeId = newPayee.id;
    }
    delete updates.payeeName;
  }

  const result = db.update(transactions)
    .set({ ...updates, updatedAt: new Date().toISOString() })
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.userId)))
    .returning().get();

  // Recalculate account balance
  if (updates.accountId || updates.amount !== undefined) {
    const txn = result;
    const accountTxns = db.select().from(transactions).where(eq(transactions.accountId, txn.accountId)).all();
    const newBalance = accountTxns.reduce((sum, t) => sum + t.amount, 0);
    db.update(accounts).set({ balance: newBalance }).where(eq(accounts.id, txn.accountId)).run();
  }

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get('id') || '0');

  const txn = db.select().from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.userId)))
    .get();

  if (txn) {
    db.delete(transactions).where(eq(transactions.id, id)).run();

    // Recalculate account balance
    const accountTxns = db.select().from(transactions).where(eq(transactions.accountId, txn.accountId)).all();
    const newBalance = accountTxns.reduce((sum, t) => sum + t.amount, 0);
    db.update(accounts).set({ balance: newBalance }).where(eq(accounts.id, txn.accountId)).run();
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
