import { redirect } from 'next/navigation';
import { getUser, getUserProfile } from '@/lib/supabase/server';
import { getOrganizationBySlug, getMyRole, getAdminNotificationCounts } from '@/lib/actions/organizations';
import { ThemeToggle } from '@/components/theme-toggle';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { Badge } from '@/components/ui/badge';
import { AdminNav } from '@/components/admin/AdminNav';
import { OrganizationSwitcher } from '@/components/OrganizationSwitcher';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getUserProfile();
  const organization = await getOrganizationBySlug(orgSlug);

  if (!organization) {
    redirect('/dashboard');
  }

  const role = await getMyRole(organization.id);

  if (role !== 'admin' && role !== 'owner') {
    redirect(`/dashboard/${orgSlug}/employee`);
  }

  const notificationCounts = await getAdminNotificationCounts(organization.id);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-6 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                PayLens
              </h1>
              <OrganizationSwitcher />
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              Welcome, {profile?.full_name || user.email}
              <Badge variant="secondary" className="ml-2 capitalize">{role}</Badge>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>

        <AdminNav notificationCounts={notificationCounts} />

        {children}
      </div>
    </div>
  );
}
