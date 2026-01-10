'use client';

import { Payslip } from '@/types/payslip';
import { formatCurrency } from '@/lib/tax-calculator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface PayslipViewerProps {
  payslip: Payslip;
}

export function PayslipViewer({ payslip }: PayslipViewerProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{payslip.employeeName}</CardTitle>
              <CardDescription>Employee ID: {payslip.employeeId}</CardDescription>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-sm">
                {payslip.payPeriod}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">
                Pay Date: {new Date(payslip.payDate).toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Earnings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payslip.earnings.map((earning, index) => (
                  <TableRow key={index}>
                    <TableCell>{earning.name}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(earning.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Separator className="my-4" />
            <div className="flex justify-between font-semibold">
              <span>Gross Pay</span>
              <span className="text-green-600">{formatCurrency(payslip.grossPay)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Deductions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Deductions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payslip.deductions.map((deduction, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {deduction.name}
                      {deduction.isAdjustable && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Adjustable
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(deduction.amount)}
                      {deduction.isPercentage && (
                        <span className="text-muted-foreground text-sm ml-1">
                          ({deduction.percentage}%)
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Separator className="my-4" />
            <div className="flex justify-between font-semibold">
              <span>Total Deductions</span>
              <span className="text-red-600">
                -{formatCurrency(payslip.totalDeductions)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net Pay */}
      <Card className="bg-primary/5">
        <CardContent className="py-6">
          <div className="flex justify-between items-center">
            <span className="text-xl font-semibold">Net Pay</span>
            <span className="text-3xl font-bold text-primary">
              {formatCurrency(payslip.netPay)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Year to Date */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Year to Date</CardTitle>
          <CardDescription>Tax Year 2025/26</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Gross</p>
              <p className="text-lg font-semibold">{formatCurrency(payslip.ytdGross)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tax</p>
              <p className="text-lg font-semibold">{formatCurrency(payslip.ytdTax)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">NI</p>
              <p className="text-lg font-semibold">{formatCurrency(payslip.ytdNI)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net</p>
              <p className="text-lg font-semibold">{formatCurrency(payslip.ytdNet)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Code Info */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>Tax Code: <strong>{payslip.taxCode}</strong></span>
      </div>
    </div>
  );
}
