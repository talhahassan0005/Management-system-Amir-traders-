import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

// For the App Router API routes, export the NextAuth handler for the HTTP methods
const handler = NextAuth(authOptions as any);
export { handler as GET, handler as POST };
