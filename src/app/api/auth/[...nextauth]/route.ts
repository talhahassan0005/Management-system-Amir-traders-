import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

const handler = NextAuth({
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = String(credentials?.email || '').trim().toLowerCase();
        const password = String(credentials?.password || '');
        const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
        const adminPassword = String(process.env.ADMIN_PASSWORD || '');

        if (!adminEmail || !adminPassword) {
          // In case env not set, block auth but keep page working
          return null;
        }

        if (email === adminEmail && password === adminPassword) {
          return {
            id: 'admin',
            name: 'Administrator',
            email: adminEmail,
            role: 'admin',
          } as any;
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as any).role || 'admin';
      return token as any;
    },
    async session({ session, token }) {
      (session.user as any).role = (token as any).role || 'admin';
      return session;
    },
  },
});

export { handler as GET, handler as POST };
