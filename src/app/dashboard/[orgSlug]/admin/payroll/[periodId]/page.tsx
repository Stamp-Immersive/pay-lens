import { notFound } from 'next/navigation';
import { getOrganizationBySlug } from '@/lib/actions/organizations';
import { getPayrollPeriod } from '@/lib/actions/payroll';
import { PayrollPeriodDetail } from '@/components/admin/PayrollPeriodDetail';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ orgSlug: string; periodId: string }>;
};

export default async function PayrollPeriodPage({ params }: Props) {
  const { orgSlug, periodId } = await params;
  const organization = await getOrganizationBySlug(orgSlug);

  if (!organization) {
    notFound();
  }

  const data = await getPayrollPeriod(organization.id, periodId);

  if (!data) {
    notFound();
  }

  return <PayrollPeriodDetail period={data.period} payslips={data.payslips} orgId={organization.id} />;
}
