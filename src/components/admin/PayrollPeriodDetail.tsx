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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  FileText,
  Play,
  CheckCircle,
  Loader2,
  Check,
  Users,
  PoundSterling,
  Receipt,
  Building2,
} from 'lucide-react';
import Link from 'next/link';
import {
  type PayrollPeriod,
  type PayslipWithEmployee,
  generatePayslips,
  updatePayrollStatus,
} from '@/lib/actions/payroll';
import { useOrganization } from '@/contexts/OrganizationContext';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  preview: 'secondary',
  approved: 'default',
  processing: 'secondary',
  processed: 'default',
  adjusted: 'secondary',
  paid: 'default',
};

type PayrollPeriodDetailProps = {
  period: PayrollPeriod;
  payslips: PayslipWithEmployee[];
  orgId: string;
};

export function PayrollPeriodDetail({ period, payslips, orgId }: PayrollPeriodDetailProps) {
  const router = useRouter();
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [dates, setDates] = useState({
    preview_start_date: '',
    adjustment_deadline: '',
    processing_date: '',
  });

  const handleGeneratePayslips = async () => {
    setLoading(true);
    try {
      await generatePayslips(orgId, period.id);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate payslips');
    } finally {
      setLoading(false);
    }
  };

  const handleStartPreview = async () => {
    setLoading(true);
    try {
      await updatePayrollStatus(orgId, period.id, 'preview', dates);
      setPreviewDialogOpen(false);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start preview');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Approve this payroll? Employees will no longer be able to make adjustments.')) {
      return;
    }
    setLoading(true);
    try {
      await updatePayrollStatus(orgId, period.id, 'approved');
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!confirm('Mark this payroll as processed? This indicates payments have been made.')) {
      return;
    }
    setLoading(true);
    try {
      await updatePayrollStatus(orgId, period.id, 'processed');
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to process payroll');
    } finally {
      setLoading(false);
    }
  };

  const adjustedCount = payslips.filter((p) => p.employee_adjusted).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/${organization.slug}/admin/payroll`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold">
              {MONTHS[period.month - 1]} {period.year}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={STATUS_VARIANTS[period.status]}>
                {period.status}
              </Badge>
              {adjustedCount > 0 && (
                <Badge variant="secondary">
                  {adjustedCount} adjustment{adjustedCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {period.status === 'draft' && (
            <>
              <Button
                variant="outline"
                onClick={handleGeneratePayslips}
                disabled={loading}
                className="gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {payslips.length > 0 ? 'Regenerate' : 'Generate'} Payslips
              </Button>
              {payslips.length > 0 && (
                <Button onClick={() => setPreviewDialogOpen(true)} className="gap-2">
                  <Play className="h-4 w-4" />
                  Start Preview
                </Button>
              )}
            </>
          )}
          {period.status === 'preview' && (
            <Button onClick={handleApprove} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Approve Payroll
            </Button>
          )}
          {period.status === 'approved' && (
            <Button onClick={handleProcess} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Mark as Processed
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Employees</CardTitle>
            <Users className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{period.employee_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Gross</CardTitle>
            <PoundSterling className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              £{Number(period.total_gross).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Net</CardTitle>
            <Receipt className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              £{Number(period.total_net).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Employer Costs</CardTitle>
            <Building2 className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              £{(Number(period.total_gross) + Number(period.total_pension_employer)).toLocaleString()}
            </div>
            <p className="text-xs text-zinc-500">
              incl. £{Number(period.total_pension_employer).toLocaleString()} pension
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deductions Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-zinc-500">Income Tax</p>
            <p className="text-lg font-semibold">£{Number(period.total_tax).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-zinc-500">National Insurance</p>
            <p className="text-lg font-semibold">£{Number(period.total_ni).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-zinc-500">Employee Pension</p>
            <p className="text-lg font-semibold">£{Number(period.total_pension_employee).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-zinc-500">Employer Pension</p>
            <p className="text-lg font-semibold">£{Number(period.total_pension_employer).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Payslips Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payslips</CardTitle>
          <CardDescription>
            Individual payslips for this period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payslips.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>NI</TableHead>
                  <TableHead>Pension</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payslips.map((payslip) => {
                  const profile = payslip.profiles as { full_name: string; email: string; department: string | null };
                  return (
                    <TableRow key={payslip.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{profile?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-zinc-500">{profile?.department || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>£{Number(payslip.gross_pay).toLocaleString()}</TableCell>
                      <TableCell>£{Number(payslip.income_tax).toLocaleString()}</TableCell>
                      <TableCell>£{Number(payslip.national_insurance).toLocaleString()}</TableCell>
                      <TableCell>
                        <div>
                          <p>£{Number(payslip.pension_employee).toLocaleString()}</p>
                          <p className="text-xs text-zinc-500">{payslip.pension_percent}%</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        £{Number(payslip.net_pay).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[payslip.status]}>
                          {payslip.employee_adjusted ? 'adjusted' : payslip.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-zinc-500 text-center py-8">
              No payslips generated yet. Click &quot;Generate Payslips&quot; to create them.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Preview Start Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Preview Period</DialogTitle>
            <DialogDescription>
              Set dates for the preview period. Employees will be able to adjust their pension contributions.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preview_start">Preview Start Date</Label>
              <Input
                id="preview_start"
                type="date"
                value={dates.preview_start_date}
                onChange={(e) => setDates({ ...dates, preview_start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustment_deadline">Adjustment Deadline</Label>
              <Input
                id="adjustment_deadline"
                type="date"
                value={dates.adjustment_deadline}
                onChange={(e) => setDates({ ...dates, adjustment_deadline: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="processing_date">Processing Date</Label>
              <Input
                id="processing_date"
                type="date"
                value={dates.processing_date}
                onChange={(e) => setDates({ ...dates, processing_date: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartPreview} disabled={loading}>
              {loading ? 'Starting...' : 'Start Preview'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
