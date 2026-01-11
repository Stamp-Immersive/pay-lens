'use client';

import { useState, useTransition } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
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
  MoreHorizontal,
  Eye,
  Trash2,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
  Gift,
  Pencil,
} from 'lucide-react';
import Link from 'next/link';
import {
  type PayrollPeriod,
  type PayslipWithEmployee,
  type PayslipBonus,
  generatePayslips,
  updatePayrollStatus,
  deletePayrollPeriod,
  revertPayrollToDraft,
  deletePayslip,
  regeneratePayslip,
  deleteBonus,
} from '@/lib/actions/payroll';
import { useOrganization } from '@/contexts/OrganizationContext';
import { AddBonusDialog } from './AddBonusDialog';

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
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Combined loading state - true while action is running OR while refresh is pending
  const isLoading = loading || isPending;
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [dates, setDates] = useState({
    preview_start_date: '',
    adjustment_deadline: '',
    processing_date: '',
  });

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    warning?: boolean;
    action: () => Promise<void>;
  }>({
    open: false,
    title: '',
    description: '',
    action: async () => {},
  });

  // Payslip detail dialog - store ID and look up from payslips array for fresh data
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null);
  const selectedPayslip = selectedPayslipId ? payslips.find(p => p.id === selectedPayslipId) || null : null;

  // Bonus dialog state
  const [bonusDialogOpen, setBonusDialogOpen] = useState(false);
  const [bonusTarget, setBonusTarget] = useState<{
    payslipId?: string;
    employeeName?: string;
  } | null>(null);

  const handleGeneratePayslips = async () => {
    setLoading(true);
    setLoadingMessage('Generating payslips...');
    try {
      const result = await generatePayslips(orgId, period.id);
      if (result.error) {
        alert(result.error);
        return;
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate payslips');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleStartPreview = async () => {
    setLoading(true);
    setLoadingMessage('Starting preview...');
    try {
      const result = await updatePayrollStatus(orgId, period.id, 'preview', dates);
      if (result.error) {
        alert(result.error);
        return;
      }
      setPreviewDialogOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start preview');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleApprove = () => {
    setConfirmDialog({
      open: true,
      title: 'Approve Payroll',
      description: 'Approve this payroll? Employees will no longer be able to make adjustments.',
      action: async () => {
        setLoading(true);
        setLoadingMessage('Approving payroll...');
        try {
          const result = await updatePayrollStatus(orgId, period.id, 'approved');
          if (result.error) {
            alert(result.error);
            return;
          }
          startTransition(() => {
            router.refresh();
          });
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to approve payroll');
        } finally {
          setLoading(false);
          setLoadingMessage('');
        }
      },
    });
  };

  const handleProcess = () => {
    setConfirmDialog({
      open: true,
      title: 'Mark as Processed',
      description: 'Mark this payroll as processed? This indicates payments have been made.',
      action: async () => {
        setLoading(true);
        setLoadingMessage('Processing payroll...');
        try {
          const result = await updatePayrollStatus(orgId, period.id, 'processed');
          if (result.error) {
            alert(result.error);
            return;
          }
          startTransition(() => {
            router.refresh();
          });
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to process payroll');
        } finally {
          setLoading(false);
          setLoadingMessage('');
        }
      },
    });
  };

  const handleRevertToDraft = () => {
    setConfirmDialog({
      open: true,
      title: 'Revert to Draft',
      description: 'This payroll is in preview mode. Employees may have already viewed their payslips and made pension adjustments. Reverting to draft will reset all adjustments. Are you sure?',
      warning: true,
      action: async () => {
        setLoading(true);
        setLoadingMessage('Reverting to draft...');
        try {
          const result = await revertPayrollToDraft(orgId, period.id);
          if (result.error) {
            alert(result.error);
            return;
          }
          startTransition(() => {
            router.refresh();
          });
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to revert payroll');
        } finally {
          setLoading(false);
          setLoadingMessage('');
        }
      },
    });
  };

  const handleDeletePeriod = () => {
    const isPreview = period.status === 'preview';
    setConfirmDialog({
      open: true,
      title: 'Delete Payroll Period',
      description: isPreview
        ? 'This payroll period has been previewed by employees. Deleting it will remove all associated payslips. This action cannot be undone.'
        : 'Are you sure you want to delete this payroll period? This action cannot be undone.',
      warning: isPreview,
      action: async () => {
        setLoading(true);
        setLoadingMessage('Deleting payroll period...');
        try {
          const result = await deletePayrollPeriod(orgId, period.id, isPreview);
          if (result.error) {
            alert(result.error);
            return;
          }
          router.push(`/dashboard/${organization.slug}/admin/payroll`);
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to delete payroll');
        } finally {
          setLoading(false);
          setLoadingMessage('');
        }
      },
    });
  };

  const handleRegenerateAllPayslips = () => {
    const isPreview = period.status === 'preview';
    setConfirmDialog({
      open: true,
      title: 'Regenerate All Payslips',
      description: isPreview
        ? 'This will delete all current payslips and recalculate them. Any employee pension adjustments will be lost. Are you sure?'
        : 'This will regenerate all payslips using current employee data. Existing payslips will be replaced.',
      warning: isPreview,
      action: handleGeneratePayslips,
    });
  };

  const handleDeletePayslip = (payslip: PayslipWithEmployee) => {
    const profile = payslip.profiles as { full_name: string };
    setConfirmDialog({
      open: true,
      title: 'Delete Payslip',
      description: `Are you sure you want to delete the payslip for ${profile?.full_name || 'this employee'}? This action cannot be undone.`,
      warning: true,
      action: async () => {
        setLoading(true);
        setLoadingMessage('Deleting payslip...');
        try {
          const result = await deletePayslip(orgId, period.id, payslip.id);
          if (result.error) {
            alert(result.error);
            return;
          }
          startTransition(() => {
            router.refresh();
          });
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to delete payslip');
        } finally {
          setLoading(false);
          setLoadingMessage('');
        }
      },
    });
  };

  const handleRegeneratePayslip = (payslip: PayslipWithEmployee) => {
    const profile = payslip.profiles as { full_name: string };
    const isAdjusted = payslip.employee_adjusted;
    setConfirmDialog({
      open: true,
      title: 'Regenerate Payslip',
      description: isAdjusted
        ? `This will recalculate the payslip for ${profile?.full_name || 'this employee'} using their current salary data. Their pension adjustment will be lost. Are you sure?`
        : `Regenerate the payslip for ${profile?.full_name || 'this employee'} using their current salary data?`,
      warning: isAdjusted,
      action: async () => {
        setLoading(true);
        setLoadingMessage('Regenerating payslip...');
        try {
          const result = await regeneratePayslip(orgId, period.id, payslip.employee_id);
          if (result.error) {
            alert(result.error);
            return;
          }
          startTransition(() => {
            router.refresh();
          });
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to regenerate payslip');
        } finally {
          setLoading(false);
          setLoadingMessage('');
        }
      },
    });
  };

  const adjustedCount = payslips.filter((p) => p.employee_adjusted).length;
  const canModify = period.status === 'draft' || period.status === 'preview';

  const handleOpenBonusDialog = (payslip?: PayslipWithEmployee) => {
    if (payslip) {
      const profile = payslip.profiles as { full_name: string };
      setBonusTarget({
        payslipId: payslip.id,
        employeeName: profile?.full_name,
      });
    } else {
      setBonusTarget(null);
    }
    setBonusDialogOpen(true);
  };

  const handleDeleteBonus = (bonus: PayslipBonus) => {
    // Close the payslip detail dialog first
    setSelectedPayslipId(null);

    setConfirmDialog({
      open: true,
      title: 'Delete Bonus',
      description: `Are you sure you want to delete the "${bonus.description}" bonus? This will recalculate the employee's payslip.`,
      warning: true,
      action: async () => {
        setLoading(true);
        setLoadingMessage('Deleting bonus...');
        try {
          const result = await deleteBonus(orgId, bonus.id);
          if (result.error) {
            alert(result.error);
            return;
          }
          startTransition(() => {
            router.refresh();
          });
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to delete bonus');
        } finally {
          setLoading(false);
          setLoadingMessage('');
        }
      },
    });
  };

  return (
    <LoadingOverlay isLoading={isLoading} message={loadingMessage}>
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
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleOpenBonusDialog()}
                      className="gap-2"
                    >
                      <Gift className="h-4 w-4" />
                      Add Bonus
                    </Button>
                    <Button onClick={() => setPreviewDialogOpen(true)} className="gap-2">
                      <Play className="h-4 w-4" />
                      Start Preview
                    </Button>
                  </>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDeletePeriod} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Period
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            {period.status === 'preview' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleOpenBonusDialog()}
                  className="gap-2"
                >
                  <Gift className="h-4 w-4" />
                  Add Bonus
                </Button>
                <Button onClick={handleApprove} disabled={loading} className="gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Approve Payroll
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleRevertToDraft}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Revert to Draft
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleRegenerateAllPayslips}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate All Payslips
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDeletePeriod} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Period
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
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
                    <TableHead className="w-[50px]"></TableHead>
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
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedPayslipId(payslip.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {canModify && (
                                <>
                                  <DropdownMenuItem onClick={() => handleOpenBonusDialog(payslip)}>
                                    <Gift className="h-4 w-4 mr-2" />
                                    Add Bonus
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleRegeneratePayslip(payslip)}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Regenerate
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeletePayslip(payslip)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className={confirmDialog.warning ? 'flex items-center gap-2' : ''}>
                {confirmDialog.warning && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                {confirmDialog.title}
              </DialogTitle>
              <DialogDescription>{confirmDialog.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
                Cancel
              </Button>
              <Button
                variant={confirmDialog.warning ? 'destructive' : 'default'}
                onClick={async () => {
                  setConfirmDialog({ ...confirmDialog, open: false });
                  await confirmDialog.action();
                }}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payslip Detail Dialog */}
        <Dialog open={!!selectedPayslip} onOpenChange={(open) => !open && setSelectedPayslipId(null)}>
          <DialogContent className="max-w-2xl">
            {selectedPayslip && (
              <>
                <DialogHeader>
                  <DialogTitle>Payslip Details</DialogTitle>
                  <DialogDescription>
                    {(selectedPayslip.profiles as { full_name: string })?.full_name} - {MONTHS[period.month - 1]} {period.year}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* Earnings Section */}
                  <div>
                    <h4 className="font-semibold mb-2">Earnings</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-zinc-500">Base Salary</span>
                      <span className="text-right">£{Number(selectedPayslip.base_salary).toLocaleString()}</span>
                      {/* Individual Bonuses */}
                      {selectedPayslip.payslip_bonuses && selectedPayslip.payslip_bonuses.length > 0 && (
                        selectedPayslip.payslip_bonuses.map((bonus) => (
                          <div key={bonus.id} className="contents">
                            <span className="text-zinc-500 flex items-center gap-2">
                              {bonus.description}
                              {canModify && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => handleDeleteBonus(bonus)}
                                >
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              )}
                            </span>
                            <span className="text-right">£{Number(bonus.amount).toLocaleString()}</span>
                          </div>
                        ))
                      )}
                      {/* Legacy bonus field (for backwards compatibility) */}
                      {Number(selectedPayslip.bonus) > 0 && (!selectedPayslip.payslip_bonuses || selectedPayslip.payslip_bonuses.length === 0) && (
                        <>
                          <span className="text-zinc-500">Bonus</span>
                          <span className="text-right">£{Number(selectedPayslip.bonus).toLocaleString()}</span>
                        </>
                      )}
                      {Number(selectedPayslip.other_additions) > 0 && (
                        <>
                          <span className="text-zinc-500">Other Additions</span>
                          <span className="text-right">£{Number(selectedPayslip.other_additions).toLocaleString()}</span>
                        </>
                      )}
                      <span className="font-medium border-t pt-2">Gross Pay</span>
                      <span className="font-medium text-right border-t pt-2 text-green-600">
                        £{Number(selectedPayslip.gross_pay).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Deductions Section */}
                  <div>
                    <h4 className="font-semibold mb-2">Deductions</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-zinc-500">Income Tax</span>
                      <span className="text-right">£{Number(selectedPayslip.income_tax).toLocaleString()}</span>
                      <span className="text-zinc-500">National Insurance</span>
                      <span className="text-right">£{Number(selectedPayslip.national_insurance).toLocaleString()}</span>
                      <span className="text-zinc-500">
                        Pension ({selectedPayslip.pension_percent}%)
                        {selectedPayslip.employee_adjusted && (
                          <Badge variant="secondary" className="ml-2 text-xs">Adjusted</Badge>
                        )}
                      </span>
                      <span className="text-right">£{Number(selectedPayslip.pension_employee).toLocaleString()}</span>
                      {Number(selectedPayslip.other_deductions) > 0 && (
                        <>
                          <span className="text-zinc-500">Other Deductions</span>
                          <span className="text-right">£{Number(selectedPayslip.other_deductions).toLocaleString()}</span>
                        </>
                      )}
                      <span className="font-medium border-t pt-2">Total Deductions</span>
                      <span className="font-medium text-right border-t pt-2 text-red-600">
                        -£{Number(selectedPayslip.total_deductions).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Net Pay */}
                  <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Net Pay</span>
                      <span className="text-2xl font-bold text-primary">
                        £{Number(selectedPayslip.net_pay).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="text-sm text-zinc-500 space-y-1">
                    <p>Tax Code: <span className="font-medium">{selectedPayslip.tax_code}</span></p>
                    <p>Status: <Badge variant={STATUS_VARIANTS[selectedPayslip.status]}>{selectedPayslip.status}</Badge></p>
                    <p>Employer Pension Contribution: £{Number(selectedPayslip.pension_employer).toLocaleString()}</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedPayslipId(null)}>
                    Close
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Bonus Dialog */}
        <AddBonusDialog
          open={bonusDialogOpen}
          onOpenChange={setBonusDialogOpen}
          orgId={orgId}
          periodId={period.id}
          payslipId={bonusTarget?.payslipId}
          employeeName={bonusTarget?.employeeName}
          onSuccess={() => {
            setBonusTarget(null);
          }}
        />
      </div>
    </LoadingOverlay>
  );
}
