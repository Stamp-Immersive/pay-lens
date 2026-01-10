import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { getMyOrganizations, getDefaultOrganization } from '@/lib/actions/organizations';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user's organizations
  const userOrgs = await getMyOrganizations();

  if (userOrgs.length === 0) {
    // User has no organizations - redirect to create one or onboarding
    redirect('/onboarding');
  }

  // Get the default organization (admin/owner orgs take priority)
  const defaultOrg = await getDefaultOrganization();

  if (!defaultOrg) {
    redirect('/onboarding');
  }

  // Find user's role in this organization
  const userOrgRole = userOrgs.find(o => o.organization.id === defaultOrg.id);

  if (!userOrgRole) {
    redirect('/onboarding');
  }

  // Redirect based on role
  if (userOrgRole.role === 'admin' || userOrgRole.role === 'owner') {
    redirect(`/dashboard/${defaultOrg.slug}/admin`);
  }

  // Default to employee dashboard
  redirect(`/dashboard/${defaultOrg.slug}/employee`);
}
