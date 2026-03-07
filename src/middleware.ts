import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async ({ request, cookies, redirect, url }, next) => {
  // Allow static assets
  if (
    url.pathname.startsWith('/_astro/') ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/login'
  ) {
    return next();
  }

  // Allow login POST
  if (url.pathname === '/api/login') {
    return next();
  }

  const apiKey = import.meta.env.API_KEY;

  // Check Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ') && authHeader.slice(7) === apiKey) {
    return next();
  }

  // Check cookie
  const cookieKey = cookies.get('api_key')?.value;
  if (cookieKey === apiKey) {
    return next();
  }

  // Not authenticated — redirect browser requests, 401 for API
  if (url.pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return redirect('/login');
});
