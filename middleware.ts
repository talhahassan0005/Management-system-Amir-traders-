import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Protect routes: allow public assets, auth, and login/logout. Require role: 'admin' for others.
const PUBLIC_PATHS = ['/_next', '/api/auth', '/public', '/favicon.ico', '/login', '/logout', '/api/reports'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public and next static paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Only protect pages under app (the app router) and other app pages
  // Use NextAuth JWT to validate session
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || (token as any).role !== 'admin') {
      // Not authenticated or not admin -> redirect to login
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.search = `?redirect=${encodeURIComponent(req.nextUrl.pathname)}`;
      return NextResponse.redirect(url);
    }

    // Admin: allow
    return NextResponse.next();
  } catch (err) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?redirect=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico|public|api/auth|login|logout).*)',
};
