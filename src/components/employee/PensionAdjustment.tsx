'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Loader2 } from 'lucide-react';
import { calculateMonthlyPay, formatCurrency } from '@/lib/tax-calculator';
import { adjustPension, type EmployeePayslip } from '@/lib/actions/employee';

type PensionAdjustmentProps = {
  payslip: EmployeePayslip | null;
  annualSalary: number;
  canAdjust: boolean;
  orgId: string;
};

export function PensionAdjustment({ payslip, annualSalary, canAdjust, orgId }: PensionAdjustmentProps) {
  const router = useRouter();
  const currentPensionPercent = payslip?.pension_percent || 5;
  const [pensionPercent, setPensionPercent] = useState(currentPensionPercent);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minPension = 3;
  const maxPension = 10;

  const currentCalc = useMemo(() => {
    return calculateMonthlyPay({
      annualGrossSalary: annualSalary,
      pensionPercentage: currentPensionPercent,
      studentLoanPlan: null,
    });
  }, [annualSalary, currentPensionPercent]);

  const newCalc = useMemo(() => {
    return calculateMonthlyPay({
      annualGrossSalary: annualSalary,
      pensionPercentage: pensionPercent,
      studentLoanPlan: null,
    });
  }, [annualSalary, pensionPercent]);

  const hasChanged = pensionPercent !== currentPensionPercent;
  const netDifference = newCalc.netPay - currentCalc.netPay;
  const pensionDifference = newCalc.pensionContribution - currentCalc.pensionContribution;
  const taxSavings = currentCalc.incomeTax - newCalc.incomeTax;

  const handleConfirm = async () => {
    if (!payslip) return;

    setLoading(true);
    setError(null);

    try {
      await adjustPension(orgId, payslip.id, pensionPercent, reason || undefined);
      setConfirmOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save adjustment');
    } finally {
      setLoading(false);
    }
  };

  if (!payslip) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-zinc-300 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Payslip Available</h3>
          <p className="text-zinc-500">
            There is no current payslip to adjust. Your employer will create one for the next pay period.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Adjust Your Pension Contribution</CardTitle>
          <CardDescription>
            See how changing your pension affects your take-home pay.
            {!canAdjust && (
              <span className="block mt-1 text-yellow-600 dark:text-yellow-400">
                Adjustments are only available during the preview period.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Annual Salary Display */}
          <div className="flex justify-between items-center p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <span className="text-sm text-zinc-500">Annual Salary</span>
            <span className="text-lg font-semibold">{formatCurrency(annualSalary)}</span>
          </div>

          {/* Pension Slider */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label htmlFor="pension">Pension Contribution</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="pension"
                  type="number"
                  value={pensionPercent}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= minPension && val <= maxPension) {
                      setPensionPercent(val);
                    }
                  }}
                  className="w-20 text-right"
                  min={minPension}
                  max={maxPension}
                  step={0.5}
                  disabled={!canAdjust}
                />
                <span className="text-zinc-500">%</span>
              </div>
            </div>
            <Slider
              value={[pensionPercent]}
              onValueChange={(value) => setPensionPercent(value[0])}
              min={minPension}
              max={maxPension}
              step={0.5}
              disabled={!canAdjust}
            />
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Min: {minPension}%</span>
              <span>Max: {maxPension}%</span>
            </div>
          </div>

          {hasChanged && (
            <Badge variant="outline" className="w-full justify-center py-2">
              Changed from {currentPensionPercent}% to {pensionPercent}%
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Comparison Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Current */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current ({currentPensionPercent}%)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-zinc-500">Gross Pay</span>
              <span>{formatCurrency(currentCalc.grossPay)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Income Tax</span>
              <span className="text-red-600">-{formatCurrency(currentCalc.incomeTax)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">National Insurance</span>
              <span className="text-red-600">-{formatCurrency(currentCalc.nationalInsurance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Pension</span>
              <span className="text-red-600">-{formatCurrency(currentCalc.pensionContribution)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Net Pay</span>
              <span>{formatCurrency(currentCalc.netPay)}</span>
            </div>
          </CardContent>
        </Card>

        {/* New */}
        <Card className={hasChanged ? 'ring-2 ring-blue-500' : ''}>
          <CardHeader>
            <CardTitle className="text-lg">
              {hasChanged ? 'New' : 'Current'} ({pensionPercent}%)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-zinc-500">Gross Pay</span>
              <span>{formatCurrency(newCalc.grossPay)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Income Tax</span>
              <span className="text-red-600">-{formatCurrency(newCalc.incomeTax)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">National Insurance</span>
              <span className="text-red-600">-{formatCurrency(newCalc.nationalInsurance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Pension</span>
              <span className="text-red-600">-{formatCurrency(newCalc.pensionContribution)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Net Pay</span>
              <span>{formatCurrency(newCalc.netPay)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Impact Summary */}
      {hasChanged && (
        <Card className="bg-blue-50 dark:bg-blue-950/50">
          <CardHeader>
            <CardTitle className="text-lg">Impact Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white dark:bg-zinc-900 rounded-lg">
                <p className="text-sm text-zinc-500">Monthly Take-Home Change</p>
                <p className={`text-2xl font-bold ${netDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {netDifference >= 0 ? '+' : ''}{formatCurrency(netDifference)}
                </p>
              </div>
              <div className="text-center p-4 bg-white dark:bg-zinc-900 rounded-lg">
                <p className="text-sm text-zinc-500">Extra Pension/Month</p>
                <p className={`text-2xl font-bold ${pensionDifference >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {pensionDifference >= 0 ? '+' : ''}{formatCurrency(pensionDifference)}
                </p>
              </div>
              <div className="text-center p-4 bg-white dark:bg-zinc-900 rounded-lg">
                <p className="text-sm text-zinc-500">Tax Savings/Month</p>
                <p className={`text-2xl font-bold ${taxSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {taxSavings >= 0 ? '+' : ''}{formatCurrency(taxSavings)}
                </p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-white dark:bg-zinc-900 rounded-lg text-center">
              <p className="text-sm text-zinc-500">
                Annual Impact: Take-home {netDifference >= 0 ? 'increases' : 'decreases'} by{' '}
                <strong>{formatCurrency(Math.abs(netDifference * 12))}</strong>,
                Pension {pensionDifference >= 0 ? 'increases' : 'decreases'} by{' '}
                <strong>{formatCurrency(Math.abs(pensionDifference * 12))}</strong>
              </p>
            </div>

            {canAdjust && (
              <div className="mt-6 text-center">
                <Button onClick={() => setConfirmOpen(true)} size="lg">
                  Apply This Change
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Pension Adjustment</DialogTitle>
            <DialogDescription>
              You are changing your pension contribution from {currentPensionPercent}% to {pensionPercent}%.
              This will affect your net pay for this pay period.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>New Net Pay:</span>
                <span className="font-semibold">{formatCurrency(newCalc.netPay)}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Change:</span>
                <span className={netDifference >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {netDifference >= 0 ? '+' : ''}{formatCurrency(netDifference)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Increasing pension savings for retirement"
                rows={2}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Confirm Change'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
