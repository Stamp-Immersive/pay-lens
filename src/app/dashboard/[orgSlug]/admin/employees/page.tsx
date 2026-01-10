import { notFound } from 'next/navigation';
import { getOrganizationBySlug } from '@/lib/actions/organizations';
import { getEmployees } from '@/lib/actions/employees';
import { getOrgPendingInvites } from '@/lib/actions/invites';
import { EmployeesList } from '@/components/admin/EmployeesList';

export const dynamic = 'force-dynamic';

export default async function EmployeesPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const organization = await getOrganizationBySlug(orgSlug);

  if (!organization) {
    notFound();
  }

  const [employees, pendingInvites] = await Promise.all([
    getEmployees(organization.id),
    getOrgPendingInvites(organization.id),
  ]);

  return (
    <div>
      <EmployeesList
        employees={employees}
        orgId={organization.id}
        pendingInvites={pendingInvites}
      />
    </div>
  );
}
