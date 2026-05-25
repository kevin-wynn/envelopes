import { defineMiddleware } from 'astro:middleware';
import { getUserFromCookie } from './lib/auth';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return next();
  }

  // Allow static assets
  if (pathname.startsWith('/_astro') || pathname.includes('.')) {
    return next();
  }

  const cookieHeader = context.request.headers.get('cookie');
  const user = getUserFromCookie(cookieHeader);

  if (!user) {
    // API routes return 401
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Pages redirect to login
    return context.redirect('/login');
  }

  // Attach user to locals
  context.locals.user = user;
  return next();
});
