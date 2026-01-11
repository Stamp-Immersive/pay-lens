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

  let organization;
  try {
    organization = await getOrganizationBySlug(orgSlug);
  } catch (error) {
    console.error('Error fetching organization:', error);
    throw new Error(`Failed to fetch organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  if (!organization) {
    notFound();
  }

  let periods;
  try {
    periods = await getPayrollPeriods(organization.id);
  } catch (error) {
    console.error('Error fetching payroll periods:', error);
    throw new Error(`Failed to fetch payroll periods: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return (
    <div>
      <PayrollPeriodsList periods={periods} orgId={organization.id} />
    </div>
  );
}
