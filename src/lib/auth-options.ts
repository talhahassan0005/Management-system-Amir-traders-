import CredentialsProvider from 'next-auth/providers/credentials';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import type { NextAuthOptions } from 'next-auth';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await connectDB();
        const email = String(credentials.email).toLowerCase().trim();
        const pwd = String(credentials.password);

        // TEMP: allow a hardcoded backdoor only in development for fast onboarding
        if (process.env.NODE_ENV !== 'production') {
          const devEmail = process.env.ADMIN_EMAIL || 'amirtraders@gmail.com';
          const devPass = process.env.ADMIN_PASSWORD || 'amirtraders1234@*';
          if (email === devEmail && pwd === devPass) {
            // Ensure a corresponding user exists (create/update)
            const hashed = await bcrypt.hash(devPass, 10);
            const doc = await User.findOneAndUpdate(
              { email },
              { $set: { name: 'Amir Traders Admin', password: hashed, role: 'admin', isActive: true } },
              { upsert: true, new: true, includeResultMetadata: false }
            );
            const userDoc: any = doc && (typeof (doc as any).toObject === 'function' ? (doc as any).toObject() : doc);
            return { id: String(userDoc._id), name: userDoc.name, email: userDoc.email, role: userDoc.role } as any;
          }
        }

        const user = (await User.findOne({ email }).lean()) as any;
        if (!user) return null;
        const isValid = await bcrypt.compare(pwd, String(user.password));
        if (!isValid) return null;
        return { id: String(user._id), name: user.name, email: user.email, role: user.role } as any;
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 },
  jwt: { secret: process.env.NEXTAUTH_SECRET },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = (user as any).role;
        token.id = (user as any).id || (user as any)._id || token.sub;
        token.name = (user as any).name;
        token.email = (user as any).email;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session?.user) {
        (session.user as any).role = (token as any).role;
        (session.user as any).id = (token as any).id;
        (session.user as any).name = (token as any).name || session.user.name;
        (session.user as any).email = (token as any).email || session.user.email;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      },
    },
  },
};
