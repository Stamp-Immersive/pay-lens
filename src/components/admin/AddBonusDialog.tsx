'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
import { addBonusToPayslip, addBonusToAllPayslips } from '@/lib/actions/payroll';

type AddBonusDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  periodId: string;
  payslipId?: string;
  employeeName?: string;
  onSuccess?: () => void;
};

export function AddBonusDialog({
  open,
  onOpenChange,
  orgId,
  periodId,
  payslipId,
  employeeName,
  onSuccess,
}: AddBonusDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [target, setTarget] = useState<'single' | 'all'>(payslipId ? 'single' : 'all');

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount greater than 0');
      setLoading(false);
      return;
    }

    try {
      let result;
      if (target === 'single' && payslipId) {
        result = await addBonusToPayslip(orgId, payslipId, description, amountNum);
      } else {
        result = await addBonusToAllPayslips(orgId, periodId, description, amountNum);
      }

      if (result.error) {
        setError(result.error);
        return;
      }

      // Reset form
      setDescription('');
      setAmount('');
      setError(null);

      router.refresh();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add bonus');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setDescription('');
      setAmount('');
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Bonus</DialogTitle>
          <DialogDescription>
            Add a bonus payment to {payslipId ? 'an employee\'s' : 'employees\''} payslip.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="e.g. 10% Royalties, Christmas Bonus"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                £
              </span>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="pl-7"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          {payslipId && (
            <div className="space-y-3">
              <Label>Apply to</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={target === 'single' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setTarget('single')}
                >
                  {employeeName || 'This employee'} only
                </Button>
                <Button
                  type="button"
                  variant={target === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setTarget('all')}
                >
                  All employees
                </Button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !description.trim() || !amount}>
            {loading ? 'Adding...' : 'Add Bonus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
