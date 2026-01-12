'use client';

import { useState, useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { calculateMonthlyPay, formatCurrency, type CalculatePayOptions } from '@/lib/tax-calculator';

interface ContributionCalculatorProps {
  annualSalary: number;
  currentPensionPercentage: number;
  studentLoanPlan?: 'plan1' | 'plan2' | 'plan4' | 'postgrad' | null;
  minPension?: number;
  maxPension?: number;
}

export function ContributionCalculator({
  annualSalary,
  currentPensionPercentage,
  studentLoanPlan = null,
  minPension = 3,
  maxPension = 100,
}: ContributionCalculatorProps) {
  const [pensionPercentage, setPensionPercentage] = useState(currentPensionPercentage);

  const currentCalculation = useMemo(() => {
    const options: CalculatePayOptions = {
      annualGrossSalary: annualSalary,
      pensionPercentage: currentPensionPercentage,
      studentLoanPlan,
    };
    return calculateMonthlyPay(options);
  }, [annualSalary, currentPensionPercentage, studentLoanPlan]);

  const newCalculation = useMemo(() => {
    const options: CalculatePayOptions = {
      annualGrossSalary: annualSalary,
      pensionPercentage,
      studentLoanPlan,
    };
    return calculateMonthlyPay(options);
  }, [annualSalary, pensionPercentage, studentLoanPlan]);

  const difference = newCalculation.netPay - currentCalculation.netPay;
  const pensionDifference = newCalculation.pensionContribution - currentCalculation.pensionContribution;
  const taxSavings = currentCalculation.incomeTax - newCalculation.incomeTax;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Adjust Your Pension Contribution</CardTitle>
          <CardDescription>
            See how changing your pension contribution affects your take-home pay
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Salary Display */}
          <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Annual Salary</span>
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
                  value={pensionPercentage}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= minPension && val <= maxPension) {
                      setPensionPercentage(val);
                    }
                  }}
                  className="w-20 text-right"
                  min={minPension}
                  max={maxPension}
                  step={0.5}
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
            <Slider
              value={[pensionPercentage]}
              onValueChange={(value) => setPensionPercentage(value[0])}
              min={minPension}
              max={maxPension}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Min: {minPension}%</span>
              <span>Max: {maxPension}%</span>
            </div>
          </div>

          {currentPensionPercentage !== pensionPercentage && (
            <Badge variant="outline" className="w-full justify-center py-2">
              Changed from {currentPensionPercentage}% to {pensionPercentage}%
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Comparison Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Current */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current ({currentPensionPercentage}%)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Pay</span>
              <span>{formatCurrency(currentCalculation.grossPay)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Income Tax</span>
              <span className="text-red-600">-{formatCurrency(currentCalculation.incomeTax)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">National Insurance</span>
              <span className="text-red-600">-{formatCurrency(currentCalculation.nationalInsurance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pension</span>
              <span className="text-red-600">-{formatCurrency(currentCalculation.pensionContribution)}</span>
            </div>
            {currentCalculation.studentLoanRepayment > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Student Loan</span>
                <span className="text-red-600">-{formatCurrency(currentCalculation.studentLoanRepayment)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Net Pay</span>
              <span>{formatCurrency(currentCalculation.netPay)}</span>
            </div>
          </CardContent>
        </Card>

        {/* New */}
        <Card className={pensionPercentage !== currentPensionPercentage ? 'ring-2 ring-primary' : ''}>
          <CardHeader>
            <CardTitle className="text-lg">
              {pensionPercentage !== currentPensionPercentage ? 'New' : 'Current'} ({pensionPercentage}%)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Pay</span>
              <span>{formatCurrency(newCalculation.grossPay)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Income Tax</span>
              <span className="text-red-600">-{formatCurrency(newCalculation.incomeTax)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">National Insurance</span>
              <span className="text-red-600">-{formatCurrency(newCalculation.nationalInsurance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pension</span>
              <span className="text-red-600">-{formatCurrency(newCalculation.pensionContribution)}</span>
            </div>
            {newCalculation.studentLoanRepayment > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Student Loan</span>
                <span className="text-red-600">-{formatCurrency(newCalculation.studentLoanRepayment)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Net Pay</span>
              <span>{formatCurrency(newCalculation.netPay)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Impact Summary */}
      {pensionPercentage !== currentPensionPercentage && (
        <Card className="bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Impact Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground">Monthly Take-Home Change</p>
                <p className={`text-2xl font-bold ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
                </p>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground">Extra Pension/Month</p>
                <p className={`text-2xl font-bold ${pensionDifference >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {pensionDifference >= 0 ? '+' : ''}{formatCurrency(pensionDifference)}
                </p>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground">Tax Savings/Month</p>
                <p className={`text-2xl font-bold ${taxSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {taxSavings >= 0 ? '+' : ''}{formatCurrency(taxSavings)}
                </p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                Annual Impact: Take-home {difference >= 0 ? 'increases' : 'decreases'} by{' '}
                <strong>{formatCurrency(Math.abs(difference * 12))}</strong>,
                Pension {pensionDifference >= 0 ? 'increases' : 'decreases'} by{' '}
                <strong>{formatCurrency(Math.abs(pensionDifference * 12))}</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
