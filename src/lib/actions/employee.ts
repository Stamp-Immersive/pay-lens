'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getUser } from '@/lib/supabase/server';

export type PayslipBonusItem = {
  id: string;
  description: string;
  amount: number;
};

export type EmployeePayslip = {
  id: string;
  payroll_period_id: string;
  period_year: number;
  period_month: number;
  period_status: string;
  base_salary: number;
  bonus: number;
  other_additions: number;
  gross_pay: number;
  pension_percent: number;
  pension_employee: number;
  pension_employer: number;
  taxable_pay: number;
  income_tax: number;
  national_insurance: number;
  other_deductions: number;
  total_deductions: number;
  net_pay: number;
  status: string;
  employee_adjusted: boolean;
  adjustment_note: string | null;
  tax_code: string;
  created_at: string;
  bonuses: PayslipBonusItem[];
};

export type EmployeeDetails = {
  id: string;
  profile_id: string;
  full_name: string;
  email: string;
  department: string | null;
  annual_salary: number;
  tax_code: string;
  default_pension_percent: number;
  employer_pension_percent: number;
  start_date: string | null;
};

// Check if user is a member of the organization
async function requireOrgMember(orgId: string) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  const supabase = await createClient();
  const { data } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', orgId)
    .eq('profile_id', user.id)
    .single();

  if (!data) {
    throw new Error('Not a member of this organization');
  }

  return user;
}

// Get current authenticated employee's details for an organization
export async function getMyDetails(orgId: string): Promise<EmployeeDetails | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, department')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  const { data: details } = await supabase
    .from('employee_details')
    .select('*')
    .eq('organization_id', orgId)
    .eq('profile_id', user.id)
    .single();

  return {
    id: details?.id || '',
    profile_id: user.id,
    full_name: profile.full_name || '',
    email: profile.email || '',
    department: profile.department,
    annual_salary: Number(details?.annual_salary) || 0,
    tax_code: details?.tax_code || '1257L',
    default_pension_percent: Number(details?.default_pension_percent) || 5,
    employer_pension_percent: Number(details?.employer_pension_percent) || 3,
    start_date: details?.start_date || null,
  };
}

// Get employee's payslips for an organization
export async function getMyPayslips(orgId: string): Promise<EmployeePayslip[]> {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payslips')
    .select(`
      *,
      payroll_periods!inner (
        year,
        month,
        status,
        organization_id
      ),
      payslip_bonuses (
        id,
        description,
        amount
      )
    `)
    .eq('employee_id', user.id)
    .eq('payroll_periods.organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching payslips:', error);
    return [];
  }

  return (data || []).map((payslip) => {
    const period = payslip.payroll_periods as { year: number; month: number; status: string; organization_id: string };
    const bonuses = (payslip.payslip_bonuses || []) as { id: string; description: string; amount: number }[];
    return {
      id: payslip.id,
      payroll_period_id: payslip.payroll_period_id,
      period_year: period.year,
      period_month: period.month,
      period_status: period.status,
      base_salary: Number(payslip.base_salary),
      bonus: Number(payslip.bonus),
      other_additions: Number(payslip.other_additions),
      gross_pay: Number(payslip.gross_pay),
      pension_percent: Number(payslip.pension_percent),
      pension_employee: Number(payslip.pension_employee),
      pension_employer: Number(payslip.pension_employer),
      taxable_pay: Number(payslip.taxable_pay),
      income_tax: Number(payslip.income_tax),
      national_insurance: Number(payslip.national_insurance),
      other_deductions: Number(payslip.other_deductions),
      total_deductions: Number(payslip.total_deductions),
      net_pay: Number(payslip.net_pay),
      status: payslip.status,
      employee_adjusted: payslip.employee_adjusted,
      adjustment_note: payslip.adjustment_note,
      tax_code: payslip.tax_code,
      created_at: payslip.created_at,
      bonuses: bonuses.map((b) => ({
        id: b.id,
        description: b.description,
        amount: Number(b.amount),
      })),
    };
  });
}

// Get the current/latest payslip (preview or most recent paid)
export async function getCurrentPayslip(orgId: string): Promise<EmployeePayslip | null> {
  const payslips = await getMyPayslips(orgId);

  // First, check for a preview payslip
  const previewPayslip = payslips.find((p) => p.period_status === 'preview');
  if (previewPayslip) return previewPayslip;

  // Otherwise, return the most recent one
  return payslips[0] || null;
}

// Check if pension adjustment is allowed (only during preview period)
export async function canAdjustPension(orgId: string, payslipId: string): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;

  const supabase = await createClient();

  const { data: payslip } = await supabase
    .from('payslips')
    .select(`
      employee_id,
      payroll_periods!inner (
        status,
        adjustment_deadline,
        organization_id
      )
    `)
    .eq('id', payslipId)
    .single();

  if (!payslip || payslip.employee_id !== user.id) return false;

  const periodData = payslip.payroll_periods as unknown as { status: string; adjustment_deadline: string | null; organization_id: string } | { status: string; adjustment_deadline: string | null; organization_id: string }[];
  const period = Array.isArray(periodData) ? periodData[0] : periodData;

  // Must belong to the correct organization
  if (period.organization_id !== orgId) return false;

  // Must be in preview status
  if (period.status !== 'preview') return false;

  // Check deadline if set
  if (period.adjustment_deadline) {
    const deadline = new Date(period.adjustment_deadline);
    if (new Date() > deadline) return false;
  }

  return true;
}

// Adjust pension contribution
export async function adjustPension(
  orgId: string,
  payslipId: string,
  newPensionPercent: number,
  reason?: string
) {
  const user = await requireOrgMember(orgId);

  const canAdjust = await canAdjustPension(orgId, payslipId);
  if (!canAdjust) {
    throw new Error('Pension adjustment is not allowed for this payslip');
  }

  // Validate pension range (3-10%)
  if (newPensionPercent < 3 || newPensionPercent > 10) {
    throw new Error('Pension must be between 3% and 10%');
  }

  const supabase = await createClient();

  // Get current payslip with org verification
  const { data: currentPayslip } = await supabase
    .from('payslips')
    .select(`
      *,
      employee_details:employee_id(annual_salary, employer_pension_percent, organization_id),
      payroll_periods!inner(organization_id)
    `)
    .eq('id', payslipId)
    .eq('employee_id', user.id)
    .eq('payroll_periods.organization_id', orgId)
    .single();

  if (!currentPayslip) {
    throw new Error('Payslip not found');
  }

  const empDetails = currentPayslip.employee_details as unknown as { annual_salary: number; employer_pension_percent: number; organization_id: string } | null;
  const employerPensionPercent = Number(empDetails?.employer_pension_percent) || 3;

  // Recalculate payslip with new pension
  const monthlyGross = currentPayslip.gross_pay;
  const newPensionEmployee = monthlyGross * (newPensionPercent / 100);
  const newPensionEmployer = monthlyGross * (employerPensionPercent / 100);
  const newTaxablePay = monthlyGross - newPensionEmployee;

  // Recalculate tax (simplified - using annual projection)
  const annualTaxablePay = newTaxablePay * 12;
  const newMonthlyTax = calculateMonthlyTax(annualTaxablePay, currentPayslip.tax_code);

  const newTotalDeductions = newPensionEmployee + newMonthlyTax + currentPayslip.national_insurance + currentPayslip.other_deductions;
  const newNetPay = monthlyGross - newTotalDeductions;

  // Record the adjustment
  await supabase.from('payslip_adjustments').insert({
    payslip_id: payslipId,
    employee_id: user.id,
    previous_pension_percent: currentPayslip.pension_percent,
    new_pension_percent: newPensionPercent,
    previous_net_pay: currentPayslip.net_pay,
    new_net_pay: newNetPay,
    reason: reason || null,
  });

  // Update the payslip
  const { error } = await supabase
    .from('payslips')
    .update({
      pension_percent: newPensionPercent,
      pension_employee: round(newPensionEmployee),
      pension_employer: round(newPensionEmployer),
      taxable_pay: round(newTaxablePay),
      income_tax: round(newMonthlyTax),
      total_deductions: round(newTotalDeductions),
      net_pay: round(newNetPay),
      status: 'adjusted',
      employee_adjusted: true,
      adjustment_note: reason || null,
    })
    .eq('id', payslipId)
    .eq('employee_id', user.id);

  if (error) {
    console.error('Error adjusting pension:', error);
    throw new Error('Failed to save pension adjustment');
  }

  // Update default pension in employee_details for future payslips
  await supabase
    .from('employee_details')
    .update({ default_pension_percent: newPensionPercent })
    .eq('organization_id', orgId)
    .eq('profile_id', user.id);

  revalidatePath('/dashboard/[orgSlug]/employee', 'page');
  return { success: true, newNetPay: round(newNetPay) };
}

// Helper functions (duplicated from payroll.ts to avoid export issues)
function round(num: number): number {
  return Math.round(num * 100) / 100;
}

function calculateMonthlyTax(annualTaxablePay: number, taxCode: string): number {
  const TAX_YEAR = {
    personalAllowance: 12570,
    basicRateLimit: 50270,
    higherRateLimit: 125140,
    basicRate: 0.20,
    higherRate: 0.40,
    additionalRate: 0.45,
  };

  let personalAllowance = TAX_YEAR.personalAllowance;

  if (taxCode === 'BR') {
    return (annualTaxablePay * TAX_YEAR.basicRate) / 12;
  } else if (taxCode === 'D0') {
    return (annualTaxablePay * TAX_YEAR.higherRate) / 12;
  } else if (taxCode === 'D1') {
    return (annualTaxablePay * TAX_YEAR.additionalRate) / 12;
  } else if (taxCode === 'NT' || taxCode === '0T') {
    personalAllowance = taxCode === 'NT' ? Infinity : 0;
  } else {
    const match = taxCode.match(/^(\d+)/);
    if (match) {
      personalAllowance = parseInt(match[1]) * 10;
    }
  }

  if (annualTaxablePay > 100000) {
    const reduction = Math.floor((annualTaxablePay - 100000) / 2);
    personalAllowance = Math.max(0, personalAllowance - reduction);
  }

  const taxableIncome = Math.max(0, annualTaxablePay - personalAllowance);
  let annualTax = 0;

  if (taxableIncome <= TAX_YEAR.basicRateLimit - TAX_YEAR.personalAllowance) {
    annualTax = taxableIncome * TAX_YEAR.basicRate;
  } else if (taxableIncome <= TAX_YEAR.higherRateLimit - TAX_YEAR.personalAllowance) {
    const basicAmount = TAX_YEAR.basicRateLimit - TAX_YEAR.personalAllowance;
    annualTax = basicAmount * TAX_YEAR.basicRate;
    annualTax += (taxableIncome - basicAmount) * TAX_YEAR.higherRate;
  } else {
    const basicAmount = TAX_YEAR.basicRateLimit - TAX_YEAR.personalAllowance;
    const higherAmount = TAX_YEAR.higherRateLimit - TAX_YEAR.basicRateLimit;
    annualTax = basicAmount * TAX_YEAR.basicRate;
    annualTax += higherAmount * TAX_YEAR.higherRate;
    annualTax += (taxableIncome - basicAmount - higherAmount) * TAX_YEAR.additionalRate;
  }

  return annualTax / 12;
}

// Get payslip history for display
export async function getPayslipHistory(orgId: string): Promise<{
  year: number;
  month: number;
  status: string;
  net_pay: number;
  id: string;
}[]> {
  const payslips = await getMyPayslips(orgId);

  return payslips.map((p) => ({
    year: p.period_year,
    month: p.period_month,
    status: p.status,
    net_pay: p.net_pay,
    id: p.id,
  }));
}
