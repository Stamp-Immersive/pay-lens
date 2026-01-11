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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoreHorizontal, Pencil, UserX, UserCheck, Plus, Mail, Clock, X, Loader2 } from 'lucide-react';
import { EmployeeForm } from './EmployeeForm';
import {
  type EmployeeWithDetails,
  deactivateEmployee,
  reactivateEmployee,
} from '@/lib/actions/employees';
import { inviteMember } from '@/lib/actions/organizations';
import { cancelInvite } from '@/lib/actions/invites';

type PendingInvite = {
  id: string;
  type: 'member' | 'pending';
  email: string;
  name: string | null;
  role: string;
  invited_at: string;
  expires_at: string | null;
};

type EmployeesListProps = {
  employees: EmployeeWithDetails[];
  orgId: string;
  pendingInvites?: PendingInvite[];
};

export function EmployeesList({ employees, orgId, pendingInvites = [] }: EmployeesListProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithDetails | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('edit');
  const [showInactive, setShowInactive] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'employee' | 'admin'>('employee');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const handleEdit = (employee: EmployeeWithDetails) => {
    setSelectedEmployee(employee);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleSetup = (employee: EmployeeWithDetails) => {
    setSelectedEmployee(employee);
    setFormMode('add');
    setFormOpen(true);
  };

  const handleDeactivate = async (profileId: string) => {
    if (confirm('Are you sure you want to deactivate this employee?')) {
      await deactivateEmployee(orgId, profileId);
      startTransition(() => {
        router.refresh();
      });
    }
  };

  const handleReactivate = async (profileId: string) => {
    await reactivateEmployee(orgId, profileId);
    startTransition(() => {
      router.refresh();
    });
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError(null);

    try {
      await inviteMember(orgId, inviteEmail, inviteRole);
      setInviteOpen(false);
      setInviteEmail('');
      setInviteRole('employee');
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCancelInvite = async (invite: PendingInvite) => {
    if (confirm(`Cancel invitation to ${invite.email}?`)) {
      try {
        await cancelInvite(invite.id, invite.type, orgId);
        startTransition(() => {
          router.refresh();
        });
      } catch (err) {
        console.error('Failed to cancel invite:', err);
      }
    }
  };

  const activeEmployees = employees.filter((e) => e.is_active);
  const inactiveEmployees = employees.filter((e) => !e.is_active);
  const needsSetup = employees.filter((e) => !e.id && e.is_active);
  const displayEmployees = showInactive ? inactiveEmployees : activeEmployees;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Employees</CardTitle>
            <CardDescription>
              Manage employee payroll details and settings
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setInviteOpen(true)}>
              <Mail className="h-4 w-4 mr-2" />
              Invite Employee
            </Button>
            <Button
              variant={showInactive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? 'Show Active' : `Inactive (${inactiveEmployees.length})`}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Pending Invites Section */}
          {pendingInvites.length > 0 && !showInactive && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Invitations ({pendingInvites.length})
              </h4>
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between bg-white dark:bg-zinc-900 p-2 rounded border"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-zinc-400" />
                      <span className="font-medium">{invite.name || invite.email}</span>
                      {invite.name && (
                        <span className="text-zinc-500 text-sm">({invite.email})</span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {invite.role}
                      </Badge>
                      {invite.type === 'pending' && (
                        <Badge variant="secondary" className="text-xs">
                          Not signed up
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelInvite(invite)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {needsSetup.length > 0 && !showInactive && (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                Employees Needing Setup ({needsSetup.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {needsSetup.map((emp) => (
                  <Button
                    key={emp.profile_id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetup(emp)}
                    className="gap-2"
                  >
                    <Plus className="h-3 w-3" />
                    {emp.full_name || emp.email}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {displayEmployees.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Annual Salary</TableHead>
                  <TableHead>Tax Code</TableHead>
                  <TableHead>Pension</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayEmployees.map((employee) => (
                  <TableRow key={employee.profile_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{employee.full_name || 'Not set'}</p>
                        <p className="text-xs text-zinc-500">{employee.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{employee.job_title || '-'}</TableCell>
                    <TableCell>{employee.department || '-'}</TableCell>
                    <TableCell>
                      {employee.annual_salary
                        ? `£${Number(employee.annual_salary).toLocaleString()}`
                        : '-'}
                    </TableCell>
                    <TableCell>{employee.tax_code}</TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {employee.default_pension_percent}% / {employee.employer_pension_percent}%
                      </span>
                      <p className="text-xs text-zinc-500">Employee / Employer</p>
                    </TableCell>
                    <TableCell>
                      {!employee.id ? (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                          Needs Setup
                        </Badge>
                      ) : employee.is_active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {employee.id ? (
                            <DropdownMenuItem onClick={() => handleEdit(employee)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleSetup(employee)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Set Up
                            </DropdownMenuItem>
                          )}
                          {employee.is_active ? (
                            <DropdownMenuItem
                              onClick={() => handleDeactivate(employee.profile_id)}
                              className="text-red-600"
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleReactivate(employee.profile_id)}>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Reactivate
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
              {showInactive
                ? 'No inactive employees.'
                : 'No employees yet. Use the "Invite Employee" button to add team members.'}
            </p>
          )}
        </CardContent>
      </Card>

      <EmployeeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        employee={selectedEmployee}
        mode={formMode}
        orgId={orgId}
      />

      {/* Invite Employee Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Employee</DialogTitle>
            <DialogDescription>
              Send an email invitation to join your organization.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="employee@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'employee' | 'admin')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {inviteError && (
                <p className="text-sm text-red-500">{inviteError}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteLoading}>
                {inviteLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
