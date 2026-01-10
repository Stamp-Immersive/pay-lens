import { notFound } from 'next/navigation';
import { getOrganizationBySlug } from '@/lib/actions/organizations';
import { getPayrollPeriods } from '@/lib/actions/payroll';
import { PayrollPeriodsList } from '@/components/admin/PayrollPeriodsList';

export const dynamic = 'force-dynamic';

export default async function PayrollPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const organization = await getOrganizationBySlug(orgSlug);

  if (!organization) {
    notFound();
  }

  const periods = await getPayrollPeriods(organization.id);

  return (
    <div>
      <PayrollPeriodsList periods={periods} orgId={organization.id} />
    </div>
  );
}
