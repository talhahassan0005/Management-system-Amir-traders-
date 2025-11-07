import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  // Allow public and Next.js internals
  const PUBLIC_PATHS = [
    '/_next',
    '/_next/static',
    '/_next/image',
    '/api/auth',
    '/login',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/public',
    '/images',
  ];

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  try {
    // Validate token using NextAuth JWT helper (reads cookies)
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      // Not authenticated -> redirect to login and preserve desired path
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/login';
      const target = pathname + (req.nextUrl.search || '');
      loginUrl.search = `?callbackUrl=${encodeURIComponent(target)}`;
      return NextResponse.redirect(loginUrl);
    }

    // Authenticated -> continue
    return NextResponse.next();
  } catch (err) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    const target = pathname + (req.nextUrl.search || '');
    loginUrl.search = `?callbackUrl=${encodeURIComponent(target)}`;
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  // Match all routes except Next.js internals, auth and login
  matcher: '/((?!_next/static|_next/image|favicon.ico|public|api/auth|login|images|robots.txt|sitemap.xml).*)',

