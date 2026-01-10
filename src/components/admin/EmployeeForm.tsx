'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { upsertEmployeeDetails, type EmployeeWithDetails } from '@/lib/actions/employees';

// Common UK tax codes
const TAX_CODES = ['1257L', '1257L-W1', '1257L-M1', 'BR', 'D0', 'D1', 'NT', '0T'];

type EmployeeFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: EmployeeWithDetails | null;
  mode: 'add' | 'edit';
  orgId: string;
};

export function EmployeeForm({ open, onOpenChange, employee, mode, orgId }: EmployeeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: employee?.full_name || '',
    department: employee?.department || '',
    annual_salary: employee?.annual_salary?.toString() || '',
    tax_code: employee?.tax_code || '1257L',
    default_pension_percent: employee?.default_pension_percent?.toString() || '5',
    employer_pension_percent: employee?.employer_pension_percent?.toString() || '3',
    bank_account_name: employee?.bank_account_name || '',
    bank_account_number: employee?.bank_account_number || '',
    bank_sort_code: employee?.bank_sort_code || '',
    start_date: employee?.start_date || '',
  });

  // Reset form when dialog opens with new data
  const handleOpenChange = (open: boolean) => {
    if (open && employee) {
      setFormData({
        full_name: employee.full_name || '',
        department: employee.department || '',
        annual_salary: employee.annual_salary?.toString() || '',
        tax_code: employee.tax_code || '1257L',
        default_pension_percent: employee.default_pension_percent?.toString() || '5',
        employer_pension_percent: employee.employer_pension_percent?.toString() || '3',
        bank_account_name: employee.bank_account_name || '',
        bank_account_number: employee.bank_account_number || '',
        bank_sort_code: employee.bank_sort_code || '',
        start_date: employee.start_date || '',
      });
    }
    setError(null);
    onOpenChange(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee?.profile_id) return;

    setLoading(true);
    setError(null);

    try {
      await upsertEmployeeDetails(orgId, employee.profile_id, {
        full_name: formData.full_name,
        department: formData.department,
        annual_salary: parseFloat(formData.annual_salary) || 0,
        tax_code: formData.tax_code,
        default_pension_percent: parseFloat(formData.default_pension_percent) || 5,
        employer_pension_percent: parseFloat(formData.employer_pension_percent) || 3,
        bank_account_name: formData.bank_account_name || undefined,
        bank_account_number: formData.bank_account_number || undefined,
        bank_sort_code: formData.bank_sort_code || undefined,
        start_date: formData.start_date || undefined,
      });

      router.refresh();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  const monthlyGross = parseFloat(formData.annual_salary) / 12 || 0;
  const pensionAmount = monthlyGross * (parseFloat(formData.default_pension_percent) / 100) || 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Set Up Employee' : 'Edit Employee'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add'
              ? 'Configure payroll details for this employee.'
              : 'Update employee payroll information.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Smith"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Engineering"
                />
              </div>
            </div>

            {/* Salary & Tax */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="annual_salary">Annual Salary (£)</Label>
                <Input
                  id="annual_salary"
                  type="number"
                  step="100"
                  value={formData.annual_salary}
                  onChange={(e) => setFormData({ ...formData, annual_salary: e.target.value })}
                  placeholder="50000"
                />
                {formData.annual_salary && (
                  <p className="text-xs text-zinc-500">
                    £{monthlyGross.toLocaleString(undefined, { maximumFractionDigits: 2 })}/month
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_code">Tax Code</Label>
                <Select
                  value={formData.tax_code}
                  onValueChange={(value) => setFormData({ ...formData, tax_code: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tax code" />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_CODES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pension */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default_pension_percent">Employee Pension (%)</Label>
                <Input
                  id="default_pension_percent"
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={formData.default_pension_percent}
                  onChange={(e) => setFormData({ ...formData, default_pension_percent: e.target.value })}
                />
                {formData.annual_salary && (
                  <p className="text-xs text-zinc-500">
                    £{pensionAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}/month
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="employer_pension_percent">Employer Pension (%)</Label>
                <Input
                  id="employer_pension_percent"
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={formData.employer_pension_percent}
                  onChange={(e) => setFormData({ ...formData, employer_pension_percent: e.target.value })}
                />
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-2">
              <Label className="text-zinc-500">Bank Details (Optional)</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank_account_name" className="text-xs">Account Name</Label>
                  <Input
                    id="bank_account_name"
                    value={formData.bank_account_name}
                    onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                    placeholder="J Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_sort_code" className="text-xs">Sort Code</Label>
                  <Input
                    id="bank_sort_code"
                    value={formData.bank_sort_code}
                    onChange={(e) => setFormData({ ...formData, bank_sort_code: e.target.value })}
                    placeholder="00-00-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_account_number" className="text-xs">Account Number</Label>
                  <Input
                    id="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                    placeholder="12345678"
                  />
                </div>
              </div>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
