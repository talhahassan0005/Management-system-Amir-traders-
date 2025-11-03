import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import HomeClient from './HomeClient';

export default async function Home() {
  const c = await cookies();
  // NextAuth cookie names in dev and prod
  const hasSession = !!(c.get('next-auth.session-token') || c.get('__Secure-next-auth.session-token'));
  if (!hasSession) {
    redirect('/login?redirect=/');
  }
  return <HomeClient />;
}