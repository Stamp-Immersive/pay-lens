import { redirect, notFound } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { getOrganizationBySlug, getMyRole } from '@/lib/actions/organizations';
import { OrganizationProvider } from '@/contexts/OrganizationContext';

export const dynamic = 'force-dynamic';

export default async function OrgLayout({
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

  // Get the organization by slug
  const organization = await getOrganizationBySlug(orgSlug);

  if (!organization) {
    notFound();
  }

  // Get user's role in this organization
  const role = await getMyRole(organization.id);

  if (!role) {
    // User is not a member of this organization
    redirect('/dashboard');
  }

  return (
    <OrganizationProvider organization={organization} role={role}>
      {children}
    </OrganizationProvider>
  );
}
