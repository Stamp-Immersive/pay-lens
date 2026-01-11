'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isOrgAdmin } from './organizations';

export type PaymentPeriod = {
  id: string;
  year: number;
  month: number;
  status: 'approved' | 'processing' | 'processed';
  total_net: number;
  employee_count: number;
  processing_date: string | null;
};

export type PaymentDetail = {
  payslip_id: string;
  employee_id: string;
  full_name: string;
  email: string;
  net_pay: number;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_sort_code: string | null;
  status: string;
};

// Check if current user is admin of the organization
async function requireOrgAdmin(orgId: string) {
  const isAdmin = await isOrgAdmin(orgId);
  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }
}

// Get periods ready for payment (approved) and recently processed
export async function getPaymentPeriods(orgId: string): Promise<PaymentPeriod[]> {
  await requireOrgAdmin(orgId);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payroll_periods')
    .select('id, year, month, status, total_net, employee_count, processing_date')
    .eq('organization_id', orgId)
    .in('status', ['approved', 'processing', 'processed'])
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) {
    console.error('Error fetching payment periods:', error);
    throw new Error('Failed to fetch payment periods');
  }

  return (data || []) as PaymentPeriod[];
}

// Get payment details for a specific period
export async function getPaymentDetails(orgId: string, periodId: string): Promise<{
  period: PaymentPeriod;
  payments: PaymentDetail[];
}> {
  await requireOrgAdmin(orgId);
  const supabase = await createClient();

  // Get period
  const { data: period, error: periodError } = await supabase
    .from('payroll_periods')
    .select('id, year, month, status, total_net, employee_count, processing_date')
    .eq('id', periodId)
    .eq('organization_id', orgId)
    .single();

  if (periodError || !period) {
    throw new Error('Payroll period not found');
  }

  // Get payslips with employee details
  const { data: payslips, error: payslipsError } = await supabase
    .from('payslips')
    .select(`
      id,
      employee_id,
      net_pay,
      status,
      profiles:employee_id (
        full_name,
        email
      )
    `)
    .eq('payroll_period_id', periodId);

  if (payslipsError) {
    console.error('Error fetching payslips:', payslipsError);
    throw new Error('Failed to fetch payslips');
  }

  // Get employee bank details
  const employeeIds = payslips?.map((p) => p.employee_id) || [];
  const { data: bankDetails } = await supabase
    .from('employee_details')
    .select('profile_id, bank_account_name, bank_account_number, bank_sort_code')
    .eq('organization_id', orgId)
    .in('profile_id', employeeIds);

  const bankMap = new Map(
    bankDetails?.map((b) => [b.profile_id, b]) || []
  );

  // Combine data
  const payments: PaymentDetail[] = (payslips || []).map((payslip) => {
    const profile = payslip.profiles as unknown as { full_name: string; email: string } | null;
    const bank = bankMap.get(payslip.employee_id);

    return {
      payslip_id: payslip.id,
      employee_id: payslip.employee_id,
      full_name: profile?.full_name || 'Unknown',
      email: profile?.email || '',
      net_pay: Number(payslip.net_pay),
      bank_account_name: bank?.bank_account_name || null,
      bank_account_number: bank?.bank_account_number || null,
      bank_sort_code: bank?.bank_sort_code || null,
      status: payslip.status,
    };
  });

  return {
    period: period as PaymentPeriod,
    payments,
  };
}

// Generate CSV export for payments
export async function generatePaymentCSV(orgId: string, periodId: string): Promise<string> {
  const { payments } = await getPaymentDetails(orgId, periodId);

  const headers = [
    'Employee Name',
    'Email',
    'Sort Code',
    'Account Number',
    'Account Name',
    'Amount',
    'Reference',
  ];

  const rows = payments.map((p) => [
    p.full_name,
    p.email,
    p.bank_sort_code || '',
    p.bank_account_number || '',
    p.bank_account_name || p.full_name,
    p.net_pay.toFixed(2),
    `SALARY-${p.payslip_id.slice(0, 8).toUpperCase()}`,
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  return csv;
}

// Generate BACS format export (Standard 18 format)
export async function generateBACSExport(orgId: string, periodId: string): Promise<string> {
  await requireOrgAdmin(orgId);
  const { period, payments } = await getPaymentDetails(orgId, periodId);

  const validPayments = payments.filter(
    (p) => p.bank_sort_code && p.bank_account_number
  );

  if (validPayments.length === 0) {
    throw new Error('No payments with valid bank details');
  }

  const lines: string[] = [];

  const processingDate = period.processing_date
    ? new Date(period.processing_date)
    : new Date();
  const dateStr = processingDate.toISOString().slice(2, 10).replace(/-/g, '');

  lines.push(`VOL1PAYADJUST             ${dateStr}`);

  validPayments.forEach((payment) => {
    const sortCode = (payment.bank_sort_code || '').replace(/-/g, '').padEnd(6, '0');
    const accountNum = (payment.bank_account_number || '').padEnd(8, '0');
    const amount = Math.round(payment.net_pay * 100).toString().padStart(11, '0');
    const name = (payment.bank_account_name || payment.full_name)
      .toUpperCase()
      .slice(0, 18)
      .padEnd(18, ' ');
    const ref = `SALARY`.padEnd(18, ' ');

    lines.push(`99${sortCode}${accountNum}0${amount}${name}${ref}`);
  });

  const totalAmount = validPayments.reduce((sum, p) => sum + p.net_pay, 0);
  const totalStr = Math.round(totalAmount * 100).toString().padStart(13, '0');
  lines.push(`EOF${validPayments.length.toString().padStart(7, '0')}${totalStr}`);

  return lines.join('\n');
}

// Mark period as processing
export async function markAsProcessing(orgId: string, periodId: string) {
  await requireOrgAdmin(orgId);
  const supabase = await createClient();

  const { error } = await supabase
    .from('payroll_periods')
    .update({ status: 'processing' })
    .eq('id', periodId)
    .eq('organization_id', orgId)
    .eq('status', 'approved');

  if (error) {
    console.error('Error updating status:', error);
    throw new Error('Failed to update status');
  }

  revalidatePath('/dashboard/[orgSlug]/admin/payments', 'page');
  return { success: true };
}

// Mark period as processed
export async function markAsProcessed(orgId: string, periodId: string) {
  await requireOrgAdmin(orgId);
  const supabase = await createClient();

  const { error: periodError } = await supabase
    .from('payroll_periods')
    .update({ status: 'processed' })
    .eq('id', periodId)
    .eq('organization_id', orgId);

  if (periodError) {
    console.error('Error updating period:', periodError);
    throw new Error('Failed to update period');
  }

  const { error: payslipsError } = await supabase
    .from('payslips')
    .update({ status: 'paid' })
    .eq('payroll_period_id', periodId);

  if (payslipsError) {
    console.error('Error updating payslips:', payslipsError);
    throw new Error('Failed to update payslips');
  }

  revalidatePath('/dashboard/[orgSlug]/admin/payments', 'page');
  revalidatePath('/dashboard/[orgSlug]/admin/payroll', 'page');
  return { success: true };
}

// Get payment statistics
export async function getPaymentStats(orgId: string) {
  await requireOrgAdmin(orgId);
  const supabase = await createClient();

  const { data: pending } = await supabase
    .from('payroll_periods')
    .select('total_net')
    .eq('organization_id', orgId)
    .eq('status', 'approved');

  const pendingTotal = pending?.reduce((sum, p) => sum + Number(p.total_net), 0) || 0;
  const pendingCount = pending?.length || 0;

  const currentYear = new Date().getFullYear();
  const { data: processed } = await supabase
    .from('payroll_periods')
    .select('total_net')
    .eq('organization_id', orgId)
    .eq('status', 'processed')
    .eq('year', currentYear);

  const processedTotal = processed?.reduce((sum, p) => sum + Number(p.total_net), 0) || 0;

  return {
    pendingTotal,
    pendingCount,
    processedThisYear: processedTotal,
  };
}
