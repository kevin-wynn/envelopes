import type { APIRoute } from 'astro';

export const POST: APIRoute = async () => {
  return new Response(null, {
    status: 302,
    headers: {
      'Set-Cookie': 'envelopes_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
      'Location': '/login',
    },
  });
};
