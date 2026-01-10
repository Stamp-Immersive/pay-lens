import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationBySlug } from '@/lib/actions/organizations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, DollarSign, TrendingUp, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getStats(orgId: string) {
  const supabase = await createClient();

  // Get employee count
  const { count: employeeCount } = await supabase
    .from('employee_details')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('is_active', true);

  // Get total annual salary
  const { data: salaryData } = await supabase
    .from('employee_details')
    .select('annual_salary')
    .eq('organization_id', orgId)
    .eq('is_active', true);

  const totalAnnualSalary = salaryData?.reduce((sum, e) => sum + Number(e.annual_salary), 0) || 0;
  const monthlyPayroll = totalAnnualSalary / 12;
  const avgSalary = employeeCount ? monthlyPayroll / employeeCount : 0;

  // Get current period if exists
  const { data: currentPeriod } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('organization_id', orgId)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(1)
    .single();

  return {
    totalEmployees: employeeCount || 0,
    totalPayroll: Math.round(monthlyPayroll),
    avgSalary: Math.round(avgSalary),
    currentPeriod,
  };
}

async function getRecentPayslips(orgId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('payslips')
    .select(`
      id,
      net_pay,
      status,
      profiles:employee_id (
        full_name,
        department
      ),
      payroll_periods!inner (
        organization_id
      )
    `)
    .eq('payroll_periods.organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(5);

  return data || [];
}

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const organization = await getOrganizationBySlug(orgSlug);

  if (!organization) {
    notFound();
  }

  const stats = await getStats(organization.id);
  const recentPayslips = await getRecentPayslips(organization.id);

  return (
    <>
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-zinc-500">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              £{stats.totalPayroll.toLocaleString()}
            </div>
            <p className="text-xs text-zinc-500">Estimated monthly</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Salary</CardTitle>
            <TrendingUp className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              £{stats.avgSalary.toLocaleString()}
            </div>
            <p className="text-xs text-zinc-500">Per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Current Period</CardTitle>
            <FileText className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.currentPeriod
                ? `${stats.currentPeriod.month}/${stats.currentPeriod.year}`
                : 'None'}
            </div>
            <p className="text-xs text-zinc-500">
              {stats.currentPeriod?.status || 'No active payroll'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payslips Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payslips</CardTitle>
          <CardDescription>Latest payslip activity across all employees</CardDescription>
        </CardHeader>
        <CardContent>
          {recentPayslips.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayslips.map((payslip) => {
                  const profileData = payslip.profiles as unknown as { full_name: string; department: string } | { full_name: string; department: string }[] | null;
                  const profile = Array.isArray(profileData) ? profileData[0] : profileData;
                  return (
                    <TableRow key={payslip.id}>
                      <TableCell className="font-medium">
                        {profile?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell>{profile?.department || '-'}</TableCell>
                      <TableCell>£{Number(payslip.net_pay).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge
                          variant={payslip.status === 'paid' ? 'default' : 'secondary'}
                        >
                          {payslip.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-zinc-500 text-center py-8">
              No payslips yet. Create a payroll period to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
