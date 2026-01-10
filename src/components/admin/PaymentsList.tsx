'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Download,
  FileSpreadsheet,
  Building2,
  CheckCircle,
  Loader2,
  Clock,
  PoundSterling,
  AlertCircle,
} from 'lucide-react';
import {
  type PaymentPeriod,
  type PaymentDetail,
  getPaymentDetails,
  generatePaymentCSV,
  generateBACSExport,
  markAsProcessing,
  markAsProcessed,
} from '@/lib/actions/payments';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type PaymentsListProps = {
  periods: PaymentPeriod[];
  stats: {
    pendingTotal: number;
    pendingCount: number;
    processedThisYear: number;
  };
  orgId: string;
};

export function PaymentsList({ periods, stats, orgId }: PaymentsListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PaymentPeriod | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetail[]>([]);

  const handleViewDetails = async (period: PaymentPeriod) => {
    setSelectedPeriod(period);
    setLoading(period.id);
    try {
      const data = await getPaymentDetails(orgId, period.id);
      setPaymentDetails(data.payments);
      setDetailsOpen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load details');
    } finally {
      setLoading(null);
    }
  };

  const handleExportCSV = async (periodId: string) => {
    setLoading(periodId);
    try {
      const csv = await generatePaymentCSV(orgId, periodId);
      downloadFile(csv, `payments-${periodId.slice(0, 8)}.csv`, 'text/csv');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate CSV');
    } finally {
      setLoading(null);
    }
  };

  const handleExportBACS = async (periodId: string) => {
    setLoading(periodId);
    try {
      const bacs = await generateBACSExport(orgId, periodId);
      downloadFile(bacs, `bacs-${periodId.slice(0, 8)}.txt`, 'text/plain');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate BACS file');
    } finally {
      setLoading(null);
    }
  };

  const handleMarkProcessing = async (periodId: string) => {
    if (!confirm('Mark this payroll as processing? This indicates payments are being sent.')) {
      return;
    }
    setLoading(periodId);
    try {
      await markAsProcessing(orgId, periodId);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setLoading(null);
    }
  };

  const handleMarkProcessed = async (periodId: string) => {
    if (!confirm('Mark this payroll as paid? This will update all payslips to paid status.')) {
      return;
    }
    setLoading(periodId);
    try {
      await markAsProcessed(orgId, periodId);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setLoading(null);
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const pendingPeriods = periods.filter((p) => p.status === 'approved');
  const processingPeriods = periods.filter((p) => p.status === 'processing');
  const processedPeriods = periods.filter((p) => p.status === 'processed');

  const missingBankDetails = paymentDetails.filter(
    (p) => !p.bank_account_number || !p.bank_sort_code
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              £{stats.pendingTotal.toLocaleString()}
            </div>
            <p className="text-xs text-zinc-500">
              {stats.pendingCount} period{stats.pendingCount !== 1 ? 's' : ''} awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Loader2 className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processingPeriods.length}</div>
            <p className="text-xs text-zinc-500">Payments in transit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Paid This Year</CardTitle>
            <PoundSterling className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              £{stats.processedThisYear.toLocaleString()}
            </div>
            <p className="text-xs text-zinc-500">{new Date().getFullYear()} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payments */}
      {pendingPeriods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ready for Payment</CardTitle>
            <CardDescription>
              Approved payroll periods ready for bank transfer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Processing Date</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPeriods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">
                      {MONTHS[period.month - 1]} {period.year}
                    </TableCell>
                    <TableCell>{period.employee_count}</TableCell>
                    <TableCell>£{Number(period.total_net).toLocaleString()}</TableCell>
                    <TableCell>
                      {period.processing_date
                        ? new Date(period.processing_date).toLocaleDateString('en-GB')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={loading === period.id}
                          >
                            {loading === period.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(period)}>
                            <PoundSterling className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleExportCSV(period.id)}>
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Export CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportBACS(period.id)}>
                            <Building2 className="h-4 w-4 mr-2" />
                            Export BACS
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleMarkProcessing(period.id)}>
                            <Loader2 className="h-4 w-4 mr-2" />
                            Mark as Processing
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMarkProcessed(period.id)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark as Paid
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Processing */}
      {processingPeriods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing</CardTitle>
            <CardDescription>Payments currently being processed</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processingPeriods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">
                      {MONTHS[period.month - 1]} {period.year}
                    </TableCell>
                    <TableCell>{period.employee_count}</TableCell>
                    <TableCell>£{Number(period.total_net).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkProcessed(period.id)}
                        disabled={loading === period.id}
                      >
                        {loading === period.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Mark Paid'
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Completed payments</CardDescription>
        </CardHeader>
        <CardContent>
          {processedPeriods.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Total Paid</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedPeriods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">
                      {MONTHS[period.month - 1]} {period.year}
                    </TableCell>
                    <TableCell>{period.employee_count}</TableCell>
                    <TableCell>£{Number(period.total_net).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Paid
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-zinc-500 text-center py-8">
              No payment history yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Empty State */}
      {periods.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <PoundSterling className="h-12 w-12 mx-auto text-zinc-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">No payments yet</h3>
            <p className="text-zinc-500">
              Approve a payroll period to see it here for payment processing.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Payment Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Payment Details - {selectedPeriod && `${MONTHS[selectedPeriod.month - 1]} ${selectedPeriod.year}`}
            </DialogTitle>
            <DialogDescription>
              Individual payment amounts and bank details
            </DialogDescription>
          </DialogHeader>

          {missingBankDetails.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Missing Bank Details
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {missingBankDetails.length} employee{missingBankDetails.length > 1 ? 's' : ''} missing bank details:{' '}
                  {missingBankDetails.map((p) => p.full_name).join(', ')}
                </p>
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Sort Code</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentDetails.map((payment) => (
                <TableRow key={payment.payslip_id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{payment.full_name}</p>
                      <p className="text-xs text-zinc-500">{payment.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {payment.bank_sort_code || (
                      <span className="text-yellow-600">Missing</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {payment.bank_account_number ? (
                      <span>****{payment.bank_account_number.slice(-4)}</span>
                    ) : (
                      <span className="text-yellow-600">Missing</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    £{payment.net_pay.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-zinc-500">
              {paymentDetails.length} payment{paymentDetails.length !== 1 ? 's' : ''}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => selectedPeriod && handleExportCSV(selectedPeriod.id)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => selectedPeriod && handleExportBACS(selectedPeriod.id)}
                className="gap-2"
              >
                <Building2 className="h-4 w-4" />
                BACS
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
