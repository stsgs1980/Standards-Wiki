import { NextRequest, NextResponse } from 'next/server';

/**
 * API authentication middleware.
 * If API_KEY env var is set, all /api/ routes (except GET) require
 * Authorization: Bearer <API_KEY> header.
 * If API_KEY is not set, all requests pass (dev mode).
 */
export function middleware(request: NextRequest) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return NextResponse.next();

  // Allow GET requests without auth (read-only)
  if (request.method === 'GET') return NextResponse.next();

  // Skip non-API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};