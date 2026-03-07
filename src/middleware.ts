import { defineMiddleware } from 'astro:middleware';

const BASE = import.meta.env.BASE_URL; // e.g. '/' or '/barcode/'

export const onRequest = defineMiddleware(async ({ request, cookies, redirect, url }, next) => {
  // Allow static assets
  if (
    url.pathname.startsWith('/_astro/') ||
    url.pathname === '/favicon.ico' ||
    url.pathname === `${BASE}login` ||
    url.pathname === `${BASE}login/`
  ) {
    return next();
  }

  // Allow login POST
  if (url.pathname === `${BASE}api/login` || url.pathname === `${BASE}api/login/`) {
    return next();
  }

  const apiKey = import.meta.env.API_KEY;

  // If no API_KEY configured, skip auth entirely
  if (!apiKey) {
    return next();
  }

  // Check Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ') && authHeader.slice(7) === apiKey) {
    return next();
  }

  // Check cookie
  const cookieKey = cookies.get('api_key')?.value;
  if (cookieKey && cookieKey === apiKey) {
    return next();
  }

  // Not authenticated — redirect browser requests, 401 for API
  if (url.pathname.includes('/api/')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return redirect(`${BASE}login`);
});
