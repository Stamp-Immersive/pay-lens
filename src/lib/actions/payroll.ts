'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getUser } from '@/lib/supabase/server';
import { isOrgAdmin } from './organizations';

// UK Tax Year 2024/25 constants
const TAX_YEAR = {
  personalAllowance: 12570,
  basicRateLimit: 50270,
  higherRateLimit: 125140,
  basicRate: 0.20,
  higherRate: 0.40,
  additionalRate: 0.45,
};

// National Insurance 2024/25 constants
const NI = {
  primaryThreshold: 12570,
  upperEarningsLimit: 50270,
  employeeRate: 0.08,
  employeeUpperRate: 0.02,
  employerRate: 0.138,
  employerThreshold: 9100,
};

export type PayrollPeriod = {
  id: string;
  organization_id: string;
  year: number;
  month: number;
  status: 'draft' | 'preview' | 'approved' | 'processing' | 'processed';
  preview_start_date: string | null;
  adjustment_deadline: string | null;
  processing_date: string | null;
  total_gross: number;
  total_net: number;
  total_tax: number;
  total_ni: number;
  total_pension_employee: number;
  total_pension_employer: number;
  employee_count: number;
  created_at: string;
};

export type PayslipWithEmployee = {
  id: string;
  payroll_period_id: string;
  employee_id: string;
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
  status: 'draft' | 'preview' | 'adjusted' | 'approved' | 'paid';
  employee_adjusted: boolean;
  tax_code: string;
  profiles: {
    full_name: string;
    email: string;
    department: string | null;
  };
};

// Check if current user is admin of the organization
async function requireOrgAdmin(orgId: string) {
  const isAdmin = await isOrgAdmin(orgId);
  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }
}

// Calculate monthly tax based on tax code and annual salary
function calculateMonthlyTax(annualTaxablePay: number, taxCode: string): number {
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

// Calculate monthly National Insurance
function calculateMonthlyNI(annualGrossPay: number): { employee: number; employer: number } {
  let employeeNI = 0;
  let employerNI = 0;

  if (annualGrossPay > NI.primaryThreshold) {
    if (annualGrossPay <= NI.upperEarningsLimit) {
      employeeNI = (annualGrossPay - NI.primaryThreshold) * NI.employeeRate;
    } else {
      employeeNI = (NI.upperEarningsLimit - NI.primaryThreshold) * NI.employeeRate;
      employeeNI += (annualGrossPay - NI.upperEarningsLimit) * NI.employeeUpperRate;
    }
  }

  if (annualGrossPay > NI.employerThreshold) {
    employerNI = (annualGrossPay - NI.employerThreshold) * NI.employerRate;
  }

  return {
    employee: employeeNI / 12,
    employer: employerNI / 12,
  };
}

// Calculate a complete payslip (internal helper)
function calculatePayslip(
  annualSalary: number,
  taxCode: string,
  pensionPercent: number,
  employerPensionPercent: number,
  bonus: number = 0,
  otherAdditions: number = 0,
  otherDeductions: number = 0
) {
  const monthlyBase = annualSalary / 12;
  const grossPay = monthlyBase + bonus + otherAdditions;

  const pensionEmployee = grossPay * (pensionPercent / 100);
  const pensionEmployer = grossPay * (employerPensionPercent / 100);

  const taxablePay = grossPay - pensionEmployee;
  const annualTaxablePay = taxablePay * 12;

  const incomeTax = calculateMonthlyTax(annualTaxablePay, taxCode);

  const annualGrossForNI = grossPay * 12;
  const ni = calculateMonthlyNI(annualGrossForNI);

  const totalDeductions = pensionEmployee + incomeTax + ni.employee + otherDeductions;
  const netPay = grossPay - totalDeductions;

  return {
    base_salary: round(monthlyBase),
    bonus: round(bonus),
    other_additions: round(otherAdditions),
    gross_pay: round(grossPay),
    pension_percent: pensionPercent,
    pension_employee: round(pensionEmployee),
    pension_employer: round(pensionEmployer),
    taxable_pay: round(taxablePay),
    income_tax: round(incomeTax),
    national_insurance: round(ni.employee),
    employer_ni: round(ni.employer),
    other_deductions: round(otherDeductions),
    total_deductions: round(totalDeductions),
    net_pay: round(netPay),
  };
}

function round(num: number): number {
  return Math.round(num * 100) / 100;
}

// Get all payroll periods for an organization
export async function getPayrollPeriods(orgId: string): Promise<PayrollPeriod[]> {
  try {
    await requireOrgAdmin(orgId);
  } catch (error) {
    console.error('Admin check failed in getPayrollPeriods:', error);
    throw new Error(`Authorization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('organization_id', orgId)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) {
    console.error('Error fetching payroll periods:', error);
    throw new Error(`Failed to fetch payroll periods: ${error.message}`);
  }

  return data || [];
}

// Get a single payroll period with its payslips
export async function getPayrollPeriod(orgId: string, periodId: string) {
  await requireOrgAdmin(orgId);
  const supabase = await createClient();

  const { data: period, error: periodError } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('id', periodId)
    .eq('organization_id', orgId)
    .single();

  if (periodError || !period) {
    return null;
  }

  const { data: payslips, error: payslipsError } = await supabase
    .from('payslips')
    .select(`
      *,
      profiles:employee_id (
        full_name,
        email,
        department
      )
    `)
    .eq('payroll_period_id', periodId)
    .order('created_at');

  if (payslipsError) {
    console.error('Error fetching payslips:', payslipsError);
    throw new Error('Failed to fetch payslips');
  }

  return {
    period: period as PayrollPeriod,
    payslips: (payslips || []) as PayslipWithEmployee[],
  };
}

// Create a new payroll period
export async function createPayrollPeriod(orgId: string, year: number, month: number): Promise<{ data?: PayrollPeriod; error?: string }> {
  try {
    await requireOrgAdmin(orgId);
  } catch (error) {
    console.error('Admin check failed:', error);
    return { error: `Authorization failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }

  const user = await getUser();
  const supabase = await createClient();

  // Check if period already exists
  const { data: existing, error: checkError } = await supabase
    .from('payroll_periods')
    .select('id')
    .eq('organization_id', orgId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (checkError) {
    console.error('Error checking existing period:', checkError);
    return { error: `Database error: ${checkError.message}` };
  }

  if (existing) {
    return { error: `Payroll period for ${month}/${year} already exists` };
  }

  const { data, error } = await supabase
    .from('payroll_periods')
    .insert({
      organization_id: orgId,
      year,
      month,
      status: 'draft',
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating payroll period:', error);
    return { error: `Failed to create payroll period: ${error.message}` };
  }

  revalidatePath('/dashboard/[orgSlug]/admin/payroll', 'page');
  return { data };
}

// Generate payslips for all active employees
export async function generatePayslips(orgId: string, periodId: string): Promise<{ count?: number; error?: string }> {
  try {
    await requireOrgAdmin(orgId);
  } catch (error) {
    console.error('Admin check failed in generatePayslips:', error);
    return { error: `Authorization failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }

  const supabase = await createClient();

  // Get the period
  const { data: period, error: periodError } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('id', periodId)
    .eq('organization_id', orgId)
    .single();

  if (periodError || !period) {
    return { error: `Payroll period not found: ${periodError?.message || 'No data'}` };
  }

  if (period.status !== 'draft') {
    return { error: 'Can only generate payslips for draft periods' };
  }

  // Get all active employees with details for this org
  const { data: employees, error: empError } = await supabase
    .from('employee_details')
    .select(`
      profile_id,
      annual_salary,
      tax_code,
      default_pension_percent,
      employer_pension_percent
    `)
    .eq('organization_id', orgId)
    .eq('is_active', true);

  if (empError) {
    console.error('Error fetching employees:', empError);
    return { error: `Failed to fetch employees: ${empError.message}` };
  }

  if (!employees || employees.length === 0) {
    return { error: 'No active employees found. Please add employees with payroll details first.' };
  }

  // Delete existing payslips for this period
  const { error: deleteError } = await supabase
    .from('payslips')
    .delete()
    .eq('payroll_period_id', periodId);

  if (deleteError) {
    console.error('Error deleting existing payslips:', deleteError);
    return { error: `Failed to clear existing payslips: ${deleteError.message}` };
  }

  // Generate payslips
  const payslips = employees.map((emp) => {
    const calc = calculatePayslip(
      Number(emp.annual_salary),
      emp.tax_code,
      Number(emp.default_pension_percent),
      Number(emp.employer_pension_percent)
    );

    // Remove employer_ni as it's not stored in payslips table (it's a company cost, not employee deduction)
    const { employer_ni: _employerNi, ...payslipData } = calc;

    return {
      payroll_period_id: periodId,
      employee_id: emp.profile_id,
      ...payslipData,
      status: 'draft',
      tax_code: emp.tax_code,
    };
  });

  const { error: insertError } = await supabase
    .from('payslips')
    .insert(payslips);

  if (insertError) {
    console.error('Error inserting payslips:', insertError);
    return { error: `Failed to generate payslips: ${insertError.message}` };
  }

  // Update period totals
  const totals = payslips.reduce(
    (acc, p) => ({
      total_gross: acc.total_gross + p.gross_pay,
      total_net: acc.total_net + p.net_pay,
      total_tax: acc.total_tax + p.income_tax,
      total_ni: acc.total_ni + p.national_insurance,
      total_pension_employee: acc.total_pension_employee + p.pension_employee,
      total_pension_employer: acc.total_pension_employer + p.pension_employer,
    }),
    {
      total_gross: 0,
      total_net: 0,
      total_tax: 0,
      total_ni: 0,
      total_pension_employee: 0,
      total_pension_employer: 0,
    }
  );

  await supabase
    .from('payroll_periods')
    .update({
      ...totals,
      employee_count: payslips.length,
    })
    .eq('id', periodId);

  revalidatePath('/dashboard/[orgSlug]/admin/payroll', 'page');
  revalidatePath(`/dashboard/[orgSlug]/admin/payroll/${periodId}`, 'page');
  return { count: payslips.length };
}

// Update payroll period status
export async function updatePayrollStatus(
  orgId: string,
  periodId: string,
  status: 'draft' | 'preview' | 'approved' | 'processing' | 'processed',
  dates?: {
    preview_start_date?: string;
    adjustment_deadline?: string;
    processing_date?: string;
  }
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireOrgAdmin(orgId);
  } catch (error) {
    console.error('Admin check failed in updatePayrollStatus:', error);
    return { error: `Authorization failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }

  const supabase = await createClient();

  const updateData: Record<string, unknown> = { status };
  if (dates) {
    Object.assign(updateData, dates);
  }

  if (status === 'preview') {
    await supabase
      .from('payslips')
      .update({ status: 'preview' })
      .eq('payroll_period_id', periodId);
  }

  if (status === 'approved') {
    await supabase
      .from('payslips')
      .update({ status: 'approved' })
      .eq('payroll_period_id', periodId)
      .in('status', ['preview', 'adjusted']);
  }

  if (status === 'processed') {
    await supabase
      .from('payslips')
      .update({ status: 'paid' })
      .eq('payroll_period_id', periodId);
  }

  const { error } = await supabase
    .from('payroll_periods')
    .update(updateData)
    .eq('id', periodId)
    .eq('organization_id', orgId);

  if (error) {
    console.error('Error updating payroll status:', error);
    return { error: `Failed to update payroll status: ${error.message}` };
  }

  revalidatePath('/dashboard/[orgSlug]/admin/payroll', 'page');
  revalidatePath(`/dashboard/[orgSlug]/admin/payroll/${periodId}`, 'page');
  return { success: true };
}

// Delete a payroll period (draft or preview)
export async function deletePayrollPeriod(
  orgId: string,
  periodId: string,
  force: boolean = false
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireOrgAdmin(orgId);
  } catch (error) {
    console.error('Admin check failed in deletePayrollPeriod:', error);
    return { error: `Authorization failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }

  const supabase = await createClient();

  const { data: period } = await supabase
    .from('payroll_periods')
    .select('status')
    .eq('id', periodId)
    .eq('organization_id', orgId)
    .single();

  // Allow deletion of draft periods, or preview periods with force flag
  if (period?.status !== 'draft' && period?.status !== 'preview') {
    return { error: 'Can only delete draft or preview payroll periods' };
  }

  if (period?.status === 'preview' && !force) {
    return { error: 'Preview period deletion requires confirmation' };
  }

  const { error } = await supabase
    .from('payroll_periods')
    .delete()
    .eq('id', periodId)
    .eq('organization_id', orgId);

  if (error) {
    console.error('Error deleting payroll period:', error);
    return { error: `Failed to delete payroll period: ${error.message}` };
  }

  revalidatePath('/dashboard/[orgSlug]/admin/payroll', 'page');
  return { success: true };
}

// Recalculate period totals
export async function recalculatePeriodTotals(orgId: string, periodId: string) {
  await requireOrgAdmin(orgId);
  const supabase = await createClient();

  const { data: payslips } = await supabase
    .from('payslips')
    .select('gross_pay, net_pay, income_tax, national_insurance, pension_employee, pension_employer')
    .eq('payroll_period_id', periodId);

  if (!payslips) return;

  const totals = payslips.reduce(
    (acc, p) => ({
      total_gross: acc.total_gross + Number(p.gross_pay),
      total_net: acc.total_net + Number(p.net_pay),
      total_tax: acc.total_tax + Number(p.income_tax),
      total_ni: acc.total_ni + Number(p.national_insurance),
      total_pension_employee: acc.total_pension_employee + Number(p.pension_employee),
      total_pension_employer: acc.total_pension_employer + Number(p.pension_employer),
    }),
    {
      total_gross: 0,
      total_net: 0,
      total_tax: 0,
      total_ni: 0,
      total_pension_employee: 0,
      total_pension_employer: 0,
    }
  );

  await supabase
    .from('payroll_periods')
    .update({
      ...totals,
      employee_count: payslips.length,
    })
    .eq('id', periodId)
    .eq('organization_id', orgId);

  revalidatePath('/dashboard/[orgSlug]/admin/payroll', 'page');
  revalidatePath(`/dashboard/[orgSlug]/admin/payroll/${periodId}`, 'page');
}

// Revert a payroll period from preview back to draft
export async function revertPayrollToDraft(
  orgId: string,
  periodId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireOrgAdmin(orgId);
  } catch (error) {
    console.error('Admin check failed in revertPayrollToDraft:', error);
    return { error: `Authorization failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }

  const supabase = await createClient();

  // Verify the period is in preview status
  const { data: period } = await supabase
    .from('payroll_periods')
    .select('status')
    .eq('id', periodId)
    .eq('organization_id', orgId)
    .single();

  if (!period) {
    return { error: 'Payroll period not found' };
  }

  if (period.status !== 'preview') {
    return { error: 'Can only revert preview periods to draft' };
  }

  // Update period status to draft
  const { error: periodError } = await supabase
    .from('payroll_periods')
    .update({
      status: 'draft',
      preview_start_date: null,
      adjustment_deadline: null,
    })
    .eq('id', periodId)
    .eq('organization_id', orgId);

  if (periodError) {
    console.error('Error reverting payroll period:', periodError);
    return { error: `Failed to revert payroll period: ${periodError.message}` };
  }

  // Revert all payslips to draft status
  const { error: payslipsError } = await supabase
    .from('payslips')
    .update({
      status: 'draft',
      employee_adjusted: false,
    })
    .eq('payroll_period_id', periodId);

  if (payslipsError) {
    console.error('Error reverting payslips:', payslipsError);
    return { error: `Failed to revert payslips: ${payslipsError.message}` };
  }

  revalidatePath('/dashboard/[orgSlug]/admin/payroll', 'page');
  revalidatePath(`/dashboard/[orgSlug]/admin/payroll/${periodId}`, 'page');
  return { success: true };
}

// Delete a single payslip
export async function deletePayslip(
  orgId: string,
  periodId: string,
  payslipId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireOrgAdmin(orgId);
  } catch (error) {
    console.error('Admin check failed in deletePayslip:', error);
    return { error: `Authorization failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }

  const supabase = await createClient();

  // Verify the period is in draft or preview status
  const { data: period } = await supabase
    .from('payroll_periods')
    .select('status')
    .eq('id', periodId)
    .eq('organization_id', orgId)
    .single();

  if (!period) {
    return { error: 'Payroll period not found' };
  }

  if (period.status !== 'draft' && period.status !== 'preview') {
    return { error: 'Can only delete payslips from draft or preview periods' };
  }

  // Delete the payslip
  const { error } = await supabase
    .from('payslips')
    .delete()
    .eq('id', payslipId)
    .eq('payroll_period_id', periodId);

  if (error) {
    console.error('Error deleting payslip:', error);
    return { error: `Failed to delete payslip: ${error.message}` };
  }

  // Recalculate period totals
  await recalculatePeriodTotals(orgId, periodId);

  return { success: true };
}

// Regenerate a single employee's payslip
export async function regeneratePayslip(
  orgId: string,
  periodId: string,
  employeeId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    await requireOrgAdmin(orgId);
  } catch (error) {
    console.error('Admin check failed in regeneratePayslip:', error);
    return { error: `Authorization failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }

  const supabase = await createClient();

  // Verify the period is in draft or preview status
  const { data: period } = await supabase
    .from('payroll_periods')
    .select('status')
    .eq('id', periodId)
    .eq('organization_id', orgId)
    .single();

  if (!period) {
    return { error: 'Payroll period not found' };
  }

  if (period.status !== 'draft' && period.status !== 'preview') {
    return { error: 'Can only regenerate payslips in draft or preview periods' };
  }

  // Get employee details
  const { data: employee, error: empError } = await supabase
    .from('employee_details')
    .select(`
      profile_id,
      annual_salary,
      tax_code,
      default_pension_percent,
      employer_pension_percent
    `)
    .eq('organization_id', orgId)
    .eq('profile_id', employeeId)
    .single();

  if (empError || !employee) {
    console.error('Error fetching employee:', empError);
    return { error: 'Employee not found or not active' };
  }

  // Calculate new payslip
  const calc = calculatePayslip(
    Number(employee.annual_salary),
    employee.tax_code,
    Number(employee.default_pension_percent),
    Number(employee.employer_pension_percent)
  );

  const { employer_ni: _employerNi, ...payslipData } = calc;

  // Delete existing payslip for this employee in this period
  await supabase
    .from('payslips')
    .delete()
    .eq('payroll_period_id', periodId)
    .eq('employee_id', employeeId);

  // Create new payslip
  const { error: insertError } = await supabase
    .from('payslips')
    .insert({
      payroll_period_id: periodId,
      employee_id: employeeId,
      ...payslipData,
      status: period.status === 'preview' ? 'preview' : 'draft',
      tax_code: employee.tax_code,
    });

  if (insertError) {
    console.error('Error inserting payslip:', insertError);
    return { error: `Failed to regenerate payslip: ${insertError.message}` };
  }

  // Recalculate period totals
  await recalculatePeriodTotals(orgId, periodId);

  return { success: true };
}
