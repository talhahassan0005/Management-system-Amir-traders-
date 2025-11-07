import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/LoginForm';

export default async function LoginPage({ searchParams }: { searchParams?: any }) {
  const session = await getServerSession(authOptions as any);
  const sp = await Promise.resolve(searchParams || {});
  const redirectTo = (sp.redirect || sp.callbackUrl || '/') as string;
  if (session) {
    redirect(redirectTo);
  }
  return <LoginForm redirectTo={redirectTo} />;
}
