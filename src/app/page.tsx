import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { LandingPage } from '@/components/LandingPage';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getUser();

  if (user) {
    redirect('/dashboard');
  }

  return <LandingPage />;
}
