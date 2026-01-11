import { notFound } from 'next/navigation';
import { getOrganizationBySlug, getAdminNotificationDetails } from '@/lib/actions/organizations';
import { getPaymentPeriods, getPaymentStats } from '@/lib/actions/payments';
import { PaymentsList } from '@/components/admin/PaymentsList';
import { NotificationBanner } from '@/components/admin/NotificationBanner';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const organization = await getOrganizationBySlug(orgSlug);

  if (!organization) {
    notFound();
  }

  const [periods, stats, notificationDetails] = await Promise.all([
    getPaymentPeriods(organization.id),
    getPaymentStats(organization.id),
    getAdminNotificationDetails(organization.id),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Payments</h2>
        <p className="text-zinc-500">Process and track salary payments</p>
      </div>
      <NotificationBanner details={notificationDetails} page="payments" />
      <PaymentsList periods={periods} stats={stats} orgId={organization.id} />
    </div>
  );
}
