'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { type EmployeePayslip } from '@/lib/actions/employee';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'outline' },
  preview: { label: 'Preview', variant: 'secondary' },
  adjusted: { label: 'Adjusted', variant: 'secondary' },
  approved: { label: 'Approved', variant: 'default' },
  paid: { label: 'Paid', variant: 'default' },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

type CurrentPayslipProps = {
  payslip: EmployeePayslip;
  employeeName: string;
};

export function CurrentPayslip({ payslip, employeeName }: CurrentPayslipProps) {
  const periodLabel = `${MONTHS[payslip.period_month - 1]} ${payslip.period_year}`;
  const statusConfig = STATUS_CONFIG[payslip.status] || STATUS_CONFIG.draft;

  const earnings = [
    { name: 'Basic Salary', amount: payslip.base_salary },
    ...(payslip.bonus > 0 ? [{ name: 'Bonus', amount: payslip.bonus }] : []),
    ...(payslip.other_additions > 0 ? [{ name: 'Other Additions', amount: payslip.other_additions }] : []),
  ];

  const deductions = [
    { name: 'Pension', amount: payslip.pension_employee, percentage: payslip.pension_percent, adjustable: true },
    { name: 'Income Tax', amount: payslip.income_tax },
    { name: 'National Insurance', amount: payslip.national_insurance },
    ...(payslip.other_deductions > 0 ? [{ name: 'Other Deductions', amount: payslip.other_deductions }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{employeeName}</CardTitle>
              <CardDescription>Tax Code: {payslip.tax_code}</CardDescription>
            </div>
            <div className="text-right">
              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
              <p className="text-sm text-zinc-500 mt-1">{periodLabel}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Preview Notice */}
      {payslip.period_status === 'preview' && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
          <CardContent className="py-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              This is a preview of your upcoming payslip. You can adjust your pension contribution
              using the calculator below before the deadline.
              {payslip.employee_adjusted && (
                <span className="block mt-1 font-medium">
                  You have already made an adjustment to this payslip.
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Earnings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {earnings.map((earning, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">{earning.name}</span>
                  <span>{formatCurrency(earning.amount)}</span>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between font-semibold">
              <span>Gross Pay</span>
              <span className="text-green-600">{formatCurrency(payslip.gross_pay)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Deductions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Deductions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deductions.map((deduction, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {deduction.name}
                    {'adjustable' in deduction && deduction.adjustable && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Adjustable
                      </Badge>
                    )}
                  </span>
                  <span>
                    -{formatCurrency(deduction.amount)}
                    {'percentage' in deduction && deduction.percentage && (
                      <span className="text-zinc-500 text-sm ml-1">
                        ({deduction.percentage}%)
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between font-semibold">
              <span>Total Deductions</span>
              <span className="text-red-600">-{formatCurrency(payslip.total_deductions)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net Pay */}
      <Card className="bg-zinc-900 dark:bg-zinc-50">
        <CardContent className="py-6">
          <div className="flex justify-between items-center">
            <span className="text-xl font-semibold text-zinc-50 dark:text-zinc-900">Net Pay</span>
            <span className="text-3xl font-bold text-zinc-50 dark:text-zinc-900">
              {formatCurrency(payslip.net_pay)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Employer Contributions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Employer Contributions</CardTitle>
          <CardDescription>Additional amounts paid by your employer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">Employer Pension</span>
            <span className="text-green-600">{formatCurrency(payslip.pension_employer)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
