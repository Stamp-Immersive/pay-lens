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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { MoreHorizontal, Eye, FileText, Trash2, Play, AlertTriangle } from 'lucide-react';
import { CreatePeriodDialog } from './CreatePeriodDialog';
import { type PayrollPeriod, deletePayrollPeriod, generatePayslips } from '@/lib/actions/payroll';
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
};

type PayrollPeriodsListProps = {
  periods: PayrollPeriod[];
  orgId: string;
};

export function PayrollPeriodsList({ periods, orgId }: PayrollPeriodsListProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

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

  const handleView = (periodId: string) => {
    router.push(`/dashboard/${organization.slug}/admin/payroll/${periodId}`);
  };

  const handleGeneratePayslips = async (periodId: string) => {
    setLoading(true);
    setLoadingMessage('Generating payslips...');
    try {
      const result = await generatePayslips(orgId, periodId);
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

  const handleDelete = (period: PayrollPeriod) => {
    const isPreview = period.status === 'preview';
    setConfirmDialog({
      open: true,
      title: 'Delete Payroll Period',
      description: isPreview
        ? `This payroll period (${MONTHS[period.month - 1]} ${period.year}) has been previewed by employees. Deleting it will remove all associated payslips. This action cannot be undone.`
        : `Are you sure you want to delete the payroll period for ${MONTHS[period.month - 1]} ${period.year}? This action cannot be undone.`,
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
          startTransition(() => {
            router.refresh();
          });
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Failed to delete period');
        } finally {
          setLoading(false);
          setLoadingMessage('');
        }
      },
    });
  };

  return (
    <LoadingOverlay isLoading={loading} message={loadingMessage}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payroll Periods</CardTitle>
            <CardDescription>
              Manage monthly payroll runs and generate payslips
            </CardDescription>
          </div>
          <CreatePeriodDialog orgId={orgId} />
        </CardHeader>
        <CardContent>
          {periods.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Total Gross</TableHead>
                  <TableHead>Total Net</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((period) => (
                  <TableRow
                    key={period.id}
                    className="cursor-pointer"
                    onClick={() => handleView(period.id)}
                  >
                    <TableCell className="font-medium">
                      {MONTHS[period.month - 1]} {period.year}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[period.status] || 'outline'}>
                        {period.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{period.employee_count}</TableCell>
                    <TableCell>
                      {period.total_gross > 0
                        ? `£${Number(period.total_gross).toLocaleString()}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {period.total_net > 0
                        ? `£${Number(period.total_net).toLocaleString()}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(period.id);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {period.status === 'draft' && (
                            <>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGeneratePayslips(period.id);
                                }}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                {period.employee_count > 0 ? 'Regenerate Payslips' : 'Generate Payslips'}
                              </DropdownMenuItem>
                              {period.employee_count > 0 && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleView(period.id);
                                  }}
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  Start Preview
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {(period.status === 'draft' || period.status === 'preview') && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(period);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-zinc-500 text-center py-8">
              No payroll periods yet. Create one to get started.
            </p>
          )}
        </CardContent>
      </Card>

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
    </LoadingOverlay>
  );
}
