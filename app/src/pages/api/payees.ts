import type { APIRoute } from 'astro';
import { db } from '../../db/index';
import { payees } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ locals }) => {
  const user = (locals as any).user;
  const result = db.select().from(payees).where(eq(payees.userId, user.userId)).all();
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};
