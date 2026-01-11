'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Eye, FileText } from 'lucide-react';
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

type PayslipHistoryProps = {
  payslips: EmployeePayslip[];
};

export function PayslipHistory({ payslips }: PayslipHistoryProps) {
  const [selectedPayslip, setSelectedPayslip] = useState<EmployeePayslip | null>(null);

  // Filter to only show non-preview payslips in history
  const historyPayslips = payslips.filter((p) => p.period_status !== 'draft');

  if (historyPayslips.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-zinc-300 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Payslip History</h3>
          <p className="text-zinc-500">
            Your payslip history will appear here once payroll has been processed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Payslip History</CardTitle>
          <CardDescription>View your past payslips</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Gross Pay</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyPayslips.map((payslip) => {
                const statusConfig = STATUS_CONFIG[payslip.status] || STATUS_CONFIG.draft;
                return (
                  <TableRow key={payslip.id}>
                    <TableCell className="font-medium">
                      {MONTHS[payslip.period_month - 1]} {payslip.period_year}
                    </TableCell>
                    <TableCell>{formatCurrency(payslip.gross_pay)}</TableCell>
                    <TableCell className="text-red-600">
                      -{formatCurrency(payslip.total_deductions)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payslip.net_pay)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedPayslip(payslip)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payslip Detail Dialog */}
      <Dialog open={!!selectedPayslip} onOpenChange={() => setSelectedPayslip(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedPayslip && `${MONTHS[selectedPayslip.period_month - 1]} ${selectedPayslip.period_year}`}
            </DialogTitle>
          </DialogHeader>

          {selectedPayslip && (
            <div className="space-y-4">
              {/* Earnings */}
              <div>
                <h4 className="font-medium mb-2">Earnings</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Basic Salary</span>
                    <span>{formatCurrency(selectedPayslip.base_salary)}</span>
                  </div>
                  {/* Individual bonuses */}
                  {selectedPayslip.bonuses && selectedPayslip.bonuses.length > 0 && (
                    selectedPayslip.bonuses.map((bonus) => (
                      <div key={bonus.id} className="flex justify-between">
                        <span className="text-zinc-500">{bonus.description}</span>
                        <span>{formatCurrency(bonus.amount)}</span>
                      </div>
                    ))
                  )}
                  {/* Legacy bonus field */}
                  {selectedPayslip.bonus > 0 && (!selectedPayslip.bonuses || selectedPayslip.bonuses.length === 0) && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Bonus</span>
                      <span>{formatCurrency(selectedPayslip.bonus)}</span>
                    </div>
                  )}
                  {selectedPayslip.other_additions > 0 && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Other Additions</span>
                      <span>{formatCurrency(selectedPayslip.other_additions)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Gross Pay</span>
                    <span className="text-green-600">{formatCurrency(selectedPayslip.gross_pay)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <h4 className="font-medium mb-2">Deductions</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">
                      Pension ({selectedPayslip.pension_percent}%)
                    </span>
                    <span className="text-red-600">-{formatCurrency(selectedPayslip.pension_employee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Income Tax</span>
                    <span className="text-red-600">-{formatCurrency(selectedPayslip.income_tax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">National Insurance</span>
                    <span className="text-red-600">-{formatCurrency(selectedPayslip.national_insurance)}</span>
                  </div>
                  {selectedPayslip.other_deductions > 0 && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Other</span>
                      <span className="text-red-600">-{formatCurrency(selectedPayslip.other_deductions)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total Deductions</span>
                    <span className="text-red-600">-{formatCurrency(selectedPayslip.total_deductions)}</span>
                  </div>
                </div>
              </div>

              {/* Net Pay */}
              <div className="p-4 bg-zinc-900 dark:bg-zinc-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-zinc-50 dark:text-zinc-900">Net Pay</span>
                  <span className="text-2xl font-bold text-zinc-50 dark:text-zinc-900">
                    {formatCurrency(selectedPayslip.net_pay)}
                  </span>
                </div>
              </div>

              {/* Tax Info */}
              <div className="text-sm text-zinc-500">
                Tax Code: {selectedPayslip.tax_code}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
