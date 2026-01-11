import { notFound } from 'next/navigation';
import { getOrganizationBySlug, getAdminNotificationDetails } from '@/lib/actions/organizations';
import { getEmployees } from '@/lib/actions/employees';
import { getOrgPendingInvites } from '@/lib/actions/invites';
import { EmployeesList } from '@/components/admin/EmployeesList';
import { NotificationBanner } from '@/components/admin/NotificationBanner';

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

  const [employees, pendingInvites, notificationDetails] = await Promise.all([
    getEmployees(organization.id),
    getOrgPendingInvites(organization.id),
    getAdminNotificationDetails(organization.id),
  ]);

  return (
    <div>
      <NotificationBanner details={notificationDetails} page="employees" />
      <EmployeesList
        employees={employees}
        orgId={organization.id}
        pendingInvites={pendingInvites}
      />
    </div>
  );
}
