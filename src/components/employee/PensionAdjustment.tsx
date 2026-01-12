'use client';

import { useState, useMemo, useTransition } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Loader2, Gift, TrendingUp, Calendar } from 'lucide-react';
import { calculateMonthlyPay, formatCurrency } from '@/lib/tax-calculator';
import { adjustPension, type EmployeePayslip } from '@/lib/actions/employee';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type PensionAdjustmentProps = {
  payslip: EmployeePayslip | null;
  allPayslips?: EmployeePayslip[];
  annualSalary: number;
  canAdjust: boolean;
  orgId: string;
};

export function PensionAdjustment({ payslip, allPayslips = [], annualSalary, canAdjust, orgId }: PensionAdjustmentProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const currentPensionPercent = payslip?.pension_percent || 5;
  const [pensionPercent, setPensionPercent] = useState(currentPensionPercent);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>(payslip?.id || '');

  const minPension = 3;
  const maxPension = 100;

  // Get all payslips for the current year for annual view
  const currentYear = payslip?.period_year || new Date().getFullYear();
  const yearPayslips = useMemo(() => {
    return allPayslips
      .filter(p => p.period_year === currentYear)
      .sort((a, b) => a.period_month - b.period_month);
  }, [allPayslips, currentYear]);

  // Get the selected payslip for monthly view
  const selectedPayslip = useMemo(() => {
    if (!selectedMonth) return payslip;
    return allPayslips.find(p => p.id === selectedMonth) || payslip;
  }, [selectedMonth, allPayslips, payslip]);

  // Calculate current values including bonuses for monthly view
  const monthlyActualCalc = useMemo(() => {
    if (!selectedPayslip) return null;
    const totalBonuses = selectedPayslip.bonuses?.reduce((sum, b) => sum + b.amount, 0) || 0;
    const grossWithBonuses = selectedPayslip.base_salary + totalBonuses + selectedPayslip.other_additions;

    return {
      baseSalary: selectedPayslip.base_salary,
      bonuses: selectedPayslip.bonuses || [],
      totalBonuses,
      otherAdditions: selectedPayslip.other_additions,
      grossPay: grossWithBonuses,
      pensionContribution: selectedPayslip.pension_employee,
      incomeTax: selectedPayslip.income_tax,
      nationalInsurance: selectedPayslip.national_insurance,
      netPay: selectedPayslip.net_pay,
    };
  }, [selectedPayslip]);

  // Calculate new values with adjusted pension for monthly view
  const monthlyNewCalc = useMemo(() => {
    if (!selectedPayslip) return null;
    const totalBonuses = selectedPayslip.bonuses?.reduce((sum, b) => sum + b.amount, 0) || 0;
    const grossWithBonuses = selectedPayslip.base_salary + totalBonuses + selectedPayslip.other_additions;

    // Calculate new pension contribution
    const newPensionContribution = grossWithBonuses * (pensionPercent / 100);

    // Recalculate tax based on reduced taxable income
    const annualGrossProjection = grossWithBonuses * 12;
    const annualPensionProjection = newPensionContribution * 12;
    const baseCalc = calculateMonthlyPay({
      annualGrossSalary: annualGrossProjection,
      pensionPercentage: pensionPercent,
      studentLoanPlan: null,
    });

    const totalDeductions = newPensionContribution + baseCalc.incomeTax + selectedPayslip.national_insurance + selectedPayslip.other_deductions;

    return {
      baseSalary: selectedPayslip.base_salary,
      bonuses: selectedPayslip.bonuses || [],
      totalBonuses,
      otherAdditions: selectedPayslip.other_additions,
      grossPay: grossWithBonuses,
      pensionContribution: Math.round(newPensionContribution * 100) / 100,
      incomeTax: baseCalc.incomeTax,
      nationalInsurance: selectedPayslip.national_insurance,
      netPay: Math.round((grossWithBonuses - totalDeductions) * 100) / 100,
    };
  }, [selectedPayslip, pensionPercent]);

  // Annual calculations (base salary only, no bonuses for projection)
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

  // Calculate annual totals from actual payslips
  const annualTotals = useMemo(() => {
    const totals = {
      baseSalary: 0,
      totalBonuses: 0,
      grossPay: 0,
      pension: 0,
      tax: 0,
      ni: 0,
      netPay: 0,
      bonusList: [] as { month: string; description: string; amount: number }[],
    };

    yearPayslips.forEach(p => {
      totals.baseSalary += p.base_salary;
      const monthBonuses = p.bonuses?.reduce((sum, b) => sum + b.amount, 0) || 0;
      totals.totalBonuses += monthBonuses;
      totals.grossPay += p.gross_pay;
      totals.pension += p.pension_employee;
      totals.tax += p.income_tax;
      totals.ni += p.national_insurance;
      totals.netPay += p.net_pay;

      // Track individual bonuses
      p.bonuses?.forEach(b => {
        totals.bonusList.push({
          month: MONTHS[p.period_month - 1],
          description: b.description,
          amount: b.amount,
        });
      });
    });

    return totals;
  }, [yearPayslips]);

  const hasChanged = pensionPercent !== currentPensionPercent;

  // Monthly differences
  const monthlyNetDifference = monthlyNewCalc && monthlyActualCalc
    ? monthlyNewCalc.netPay - monthlyActualCalc.netPay
    : 0;
  const monthlyPensionDifference = monthlyNewCalc && monthlyActualCalc
    ? monthlyNewCalc.pensionContribution - monthlyActualCalc.pensionContribution
    : 0;
  const monthlyTaxSavings = monthlyActualCalc && monthlyNewCalc
    ? monthlyActualCalc.incomeTax - monthlyNewCalc.incomeTax
    : 0;

  // Annual differences
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
      startTransition(() => {
        router.refresh();
      });
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
          <CardTitle>Pension Contribution Calculator</CardTitle>
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
          {/* View Mode Toggle */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'monthly' | 'annual')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Monthly View
              </TabsTrigger>
              <TabsTrigger value="annual" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Annual Projection
              </TabsTrigger>
            </TabsList>

            <TabsContent value="monthly" className="space-y-6 mt-6">
              {/* Month Selector */}
              {allPayslips.length > 1 && (
                <div className="space-y-2">
                  <Label>Select Month</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a month" />
                    </SelectTrigger>
                    <SelectContent>
                      {allPayslips.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {MONTHS[p.period_month - 1]} {p.period_year}
                          {p.id === payslip.id && ' (Current)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Monthly Gross Display with Bonus Breakdown */}
              {monthlyActualCalc && (
                <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-500">Base Salary</span>
                    <span className="font-medium">{formatCurrency(monthlyActualCalc.baseSalary)}</span>
                  </div>

                  {/* Bonus Breakdown */}
                  {monthlyActualCalc.bonuses.length > 0 && (
                    <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Bonuses</span>
                      </div>
                      {monthlyActualCalc.bonuses.map((bonus) => (
                        <div key={bonus.id} className="flex justify-between items-center pl-6">
                          <span className="text-sm text-zinc-500">{bonus.description}</span>
                          <span className="text-sm text-amber-600 dark:text-amber-400">+{formatCurrency(bonus.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {monthlyActualCalc.otherAdditions > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-500">Other Additions</span>
                      <span className="text-sm">+{formatCurrency(monthlyActualCalc.otherAdditions)}</span>
                    </div>
                  )}

                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Gross Pay (incl. bonuses)</span>
                    <span className="text-lg font-semibold text-green-600">{formatCurrency(monthlyActualCalc.grossPay)}</span>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="annual" className="space-y-6 mt-6">
              {/* Annual Salary Display */}
              <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-500">Annual Base Salary</span>
                  <span className="text-lg font-semibold">{formatCurrency(annualSalary)}</span>
                </div>

                {/* Year-to-date bonuses */}
                {annualTotals.bonusList.length > 0 && (
                  <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        {currentYear} Bonuses (Year to Date)
                      </span>
                    </div>
                    {annualTotals.bonusList.map((bonus, idx) => (
                      <div key={idx} className="flex justify-between items-center pl-6">
                        <span className="text-sm text-zinc-500">
                          {bonus.month}: {bonus.description}
                        </span>
                        <span className="text-sm text-amber-600 dark:text-amber-400">
                          +{formatCurrency(bonus.amount)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pl-6 pt-1 border-t border-dashed border-zinc-300 dark:border-zinc-600">
                      <span className="text-sm font-medium">Total Bonuses YTD</span>
                      <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        +{formatCurrency(annualTotals.totalBonuses)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

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

      {/* Comparison Cards - Monthly View */}
      {viewMode === 'monthly' && monthlyActualCalc && monthlyNewCalc && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Current */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Current ({currentPensionPercent}%)
                <span className="text-sm font-normal text-zinc-500 ml-2">
                  {selectedPayslip && `${MONTHS[selectedPayslip.period_month - 1]} ${selectedPayslip.period_year}`}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-zinc-500">Gross Pay</span>
                <span>{formatCurrency(monthlyActualCalc.grossPay)}</span>
              </div>
              {monthlyActualCalc.totalBonuses > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-600 dark:text-amber-400 pl-4">incl. bonuses</span>
                  <span className="text-amber-600 dark:text-amber-400">+{formatCurrency(monthlyActualCalc.totalBonuses)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500">Income Tax</span>
                <span className="text-red-600">-{formatCurrency(monthlyActualCalc.incomeTax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">National Insurance</span>
                <span className="text-red-600">-{formatCurrency(monthlyActualCalc.nationalInsurance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Pension</span>
                <span className="text-red-600">-{formatCurrency(monthlyActualCalc.pensionContribution)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Net Pay</span>
                <span>{formatCurrency(monthlyActualCalc.netPay)}</span>
              </div>
            </CardContent>
          </Card>

          {/* New */}
          <Card className={hasChanged ? 'ring-2 ring-blue-500' : ''}>
            <CardHeader>
              <CardTitle className="text-lg">
                {hasChanged ? 'Projected' : 'Current'} ({pensionPercent}%)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-zinc-500">Gross Pay</span>
                <span>{formatCurrency(monthlyNewCalc.grossPay)}</span>
              </div>
              {monthlyNewCalc.totalBonuses > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-600 dark:text-amber-400 pl-4">incl. bonuses</span>
                  <span className="text-amber-600 dark:text-amber-400">+{formatCurrency(monthlyNewCalc.totalBonuses)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500">Income Tax</span>
                <span className="text-red-600">-{formatCurrency(monthlyNewCalc.incomeTax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">National Insurance</span>
                <span className="text-red-600">-{formatCurrency(monthlyNewCalc.nationalInsurance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Pension</span>
                <span className="text-red-600">-{formatCurrency(monthlyNewCalc.pensionContribution)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Net Pay</span>
                <span>{formatCurrency(monthlyNewCalc.netPay)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Comparison Cards - Annual View */}
      {viewMode === 'annual' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Current */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current ({currentPensionPercent}%)</CardTitle>
              <CardDescription>Monthly projection from base salary</CardDescription>
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
              <CardDescription>Monthly projection from base salary</CardDescription>
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
      )}

      {/* Impact Summary */}
      {hasChanged && (
        <Card className="bg-blue-50 dark:bg-blue-950/50">
          <CardHeader>
            <CardTitle className="text-lg">Impact Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white dark:bg-zinc-900 rounded-lg">
                <p className="text-sm text-zinc-500">
                  {viewMode === 'monthly' ? 'Monthly Take-Home Change' : 'Monthly Take-Home Change'}
                </p>
                <p className={`text-2xl font-bold ${(viewMode === 'monthly' ? monthlyNetDifference : netDifference) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(viewMode === 'monthly' ? monthlyNetDifference : netDifference) >= 0 ? '+' : ''}
                  {formatCurrency(viewMode === 'monthly' ? monthlyNetDifference : netDifference)}
                </p>
              </div>
              <div className="text-center p-4 bg-white dark:bg-zinc-900 rounded-lg">
                <p className="text-sm text-zinc-500">Extra Pension/Month</p>
                <p className={`text-2xl font-bold ${(viewMode === 'monthly' ? monthlyPensionDifference : pensionDifference) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {(viewMode === 'monthly' ? monthlyPensionDifference : pensionDifference) >= 0 ? '+' : ''}
                  {formatCurrency(viewMode === 'monthly' ? monthlyPensionDifference : pensionDifference)}
                </p>
              </div>
              <div className="text-center p-4 bg-white dark:bg-zinc-900 rounded-lg">
                <p className="text-sm text-zinc-500">Tax Savings/Month</p>
                <p className={`text-2xl font-bold ${(viewMode === 'monthly' ? monthlyTaxSavings : taxSavings) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(viewMode === 'monthly' ? monthlyTaxSavings : taxSavings) >= 0 ? '+' : ''}
                  {formatCurrency(viewMode === 'monthly' ? monthlyTaxSavings : taxSavings)}
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
                <span className="font-semibold">{formatCurrency(monthlyNewCalc?.netPay || newCalc.netPay)}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Change:</span>
                <span className={monthlyNetDifference >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {monthlyNetDifference >= 0 ? '+' : ''}{formatCurrency(monthlyNetDifference || netDifference)}
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
