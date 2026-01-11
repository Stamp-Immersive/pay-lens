'use client';

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
import { MoreHorizontal, Eye, FileText, Trash2, Play } from 'lucide-react';
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
  const { organization } = useOrganization();

  const handleView = (periodId: string) => {
    router.push(`/dashboard/${organization.slug}/admin/payroll/${periodId}`);
  };

  const handleGeneratePayslips = async (periodId: string) => {
    try {
      const result = await generatePayslips(orgId, periodId);
      if (result.error) {
        alert(result.error);
        return;
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate payslips');
    }
  };

  const handleDelete = async (periodId: string) => {
    if (confirm('Are you sure you want to delete this payroll period?')) {
      try {
        const result = await deletePayrollPeriod(orgId, periodId);
        if (result.error) {
          alert(result.error);
          return;
        }
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete period');
      }
    }
  };

  return (
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(period.id);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                        {period.status === 'draft' && period.employee_count > 0 && (
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
  );
}
