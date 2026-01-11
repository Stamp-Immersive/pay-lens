import { redirect, notFound } from 'next/navigation';
import { getUser, getUserProfile } from '@/lib/supabase/server';
import { getOrganizationBySlug, getMyRole } from '@/lib/actions/organizations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/theme-toggle';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { CurrentPayslip } from '@/components/employee/CurrentPayslip';
import { PensionAdjustment } from '@/components/employee/PensionAdjustment';
import { PayslipHistory } from '@/components/employee/PayslipHistory';
import { OrganizationSwitcher } from '@/components/OrganizationSwitcher';
import {
  getMyDetails,
  getMyPayslips,
  getCurrentPayslip,
  canAdjustPension,
} from '@/lib/actions/employee';

export const dynamic = 'force-dynamic';

export default async function EmployeeDashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  const organization = await getOrganizationBySlug(orgSlug);

  if (!organization) {
    notFound();
  }

  const role = await getMyRole(organization.id);

  if (!role) {
    redirect('/dashboard');
  }

  // Redirect admins to admin dashboard
  if (role === 'admin' || role === 'owner') {
    redirect(`/dashboard/${orgSlug}/admin`);
  }

  const profile = await getUserProfile();

  const [details, payslips, currentPayslip] = await Promise.all([
    getMyDetails(organization.id),
    getMyPayslips(organization.id),
    getCurrentPayslip(organization.id),
  ]);

  // Check if pension adjustment is allowed for current payslip
  const canAdjust = currentPayslip ? await canAdjustPension(organization.id, currentPayslip.id) : false;

  const annualSalary = details?.annual_salary || 0;
  const employeeName = details?.full_name || profile?.full_name || user.email || 'Employee';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                PayAdjust
              </h1>
              <OrganizationSwitcher />
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              Welcome, {employeeName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>

        {!details?.id ? (
          // Employee not set up yet
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <h2 className="text-xl font-semibold mb-2">Account Setup Required</h2>
              <p className="text-zinc-500">
                Your payroll account is being set up by your administrator.
                Please check back later or contact your HR department.
              </p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="payslip" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="payslip">Current Payslip</TabsTrigger>
              <TabsTrigger value="calculator">Pension Calculator</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="payslip">
              {currentPayslip ? (
                <CurrentPayslip payslip={currentPayslip} employeeName={employeeName} />
              ) : (
                <div className="text-center py-12">
                  <p className="text-zinc-500">
                    No payslip available yet. Your next payslip will appear here
                    when your employer creates it.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="calculator">
              <PensionAdjustment
                payslip={currentPayslip}
                annualSalary={annualSalary}
                canAdjust={canAdjust}
                orgId={organization.id}
              />
            </TabsContent>

            <TabsContent value="history">
              <PayslipHistory payslips={payslips} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
