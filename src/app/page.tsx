import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { redirect } from 'next/navigation';
import DashboardClient from '@/components/DashboardClient';

export default async function Page() {
  // Server-side session validation
  const session = await getServerSession(authOptions as any);

  if (!session || (session as any)?.user?.role !== 'admin') {
    redirect(`/login?callbackUrl=${encodeURIComponent('/')}`);
  }

  return <DashboardClient />;
}
