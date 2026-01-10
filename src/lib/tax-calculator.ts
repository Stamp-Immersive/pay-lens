import { PayCalculation } from '@/types/payslip';

// UK Tax rates 2025/26 (simplified)
const TAX_FREE_ALLOWANCE = 12570;
const BASIC_RATE_THRESHOLD = 50270;
const HIGHER_RATE_THRESHOLD = 125140;

const BASIC_RATE = 0.20;
const HIGHER_RATE = 0.40;
const ADDITIONAL_RATE = 0.45;

// National Insurance rates 2025/26
const NI_PRIMARY_THRESHOLD = 12570;
const NI_UPPER_LIMIT = 50270;
const NI_RATE_BELOW_UPPER = 0.08;
const NI_RATE_ABOVE_UPPER = 0.02;

// Student loan thresholds (annual)
const STUDENT_LOAN_THRESHOLDS = {
  plan1: 24990,
  plan2: 27295,
  plan4: 31395,
  postgrad: 21000,
};

const STUDENT_LOAN_RATES = {
  plan1: 0.09,
  plan2: 0.09,
  plan4: 0.09,
  postgrad: 0.06,
};

export function calculateAnnualIncomeTax(grossAnnual: number, pensionContribution: number): number {
  // Pension reduces taxable income
  const taxableIncome = Math.max(0, grossAnnual - pensionContribution - TAX_FREE_ALLOWANCE);

  let tax = 0;

  if (taxableIncome <= 0) {
    return 0;
  }

  // Basic rate band
  const basicBand = Math.min(taxableIncome, BASIC_RATE_THRESHOLD - TAX_FREE_ALLOWANCE);
  tax += basicBand * BASIC_RATE;

  // Higher rate band
  if (taxableIncome > BASIC_RATE_THRESHOLD - TAX_FREE_ALLOWANCE) {
    const higherBand = Math.min(
      taxableIncome - (BASIC_RATE_THRESHOLD - TAX_FREE_ALLOWANCE),
      HIGHER_RATE_THRESHOLD - BASIC_RATE_THRESHOLD
    );
    tax += higherBand * HIGHER_RATE;
  }

  // Additional rate band
  if (taxableIncome > HIGHER_RATE_THRESHOLD - TAX_FREE_ALLOWANCE) {
    const additionalBand = taxableIncome - (HIGHER_RATE_THRESHOLD - TAX_FREE_ALLOWANCE);
    tax += additionalBand * ADDITIONAL_RATE;
  }

  return tax;
}

export function calculateAnnualNI(grossAnnual: number): number {
  if (grossAnnual <= NI_PRIMARY_THRESHOLD) {
    return 0;
  }

  let ni = 0;

  // Below upper limit
  const belowUpper = Math.min(grossAnnual, NI_UPPER_LIMIT) - NI_PRIMARY_THRESHOLD;
  ni += Math.max(0, belowUpper) * NI_RATE_BELOW_UPPER;

  // Above upper limit
  if (grossAnnual > NI_UPPER_LIMIT) {
    ni += (grossAnnual - NI_UPPER_LIMIT) * NI_RATE_ABOVE_UPPER;
  }

  return ni;
}

export function calculateStudentLoanRepayment(
  grossAnnual: number,
  plan: 'plan1' | 'plan2' | 'plan4' | 'postgrad' | null
): number {
  if (!plan) return 0;

  const threshold = STUDENT_LOAN_THRESHOLDS[plan];
  const rate = STUDENT_LOAN_RATES[plan];

  if (grossAnnual <= threshold) {
    return 0;
  }

  return (grossAnnual - threshold) * rate;
}

export interface CalculatePayOptions {
  annualGrossSalary: number;
  pensionPercentage: number;
  studentLoanPlan: 'plan1' | 'plan2' | 'plan4' | 'postgrad' | null;
  additionalDeductions?: number;
}

export function calculateMonthlyPay(options: CalculatePayOptions): PayCalculation {
  const { annualGrossSalary, pensionPercentage, studentLoanPlan, additionalDeductions = 0 } = options;

  const monthlyGross = annualGrossSalary / 12;
  const annualPension = annualGrossSalary * (pensionPercentage / 100);
  const monthlyPension = annualPension / 12;

  const annualTax = calculateAnnualIncomeTax(annualGrossSalary, annualPension);
  const monthlyTax = annualTax / 12;

  const annualNI = calculateAnnualNI(annualGrossSalary);
  const monthlyNI = annualNI / 12;

  const annualStudentLoan = calculateStudentLoanRepayment(annualGrossSalary, studentLoanPlan);
  const monthlyStudentLoan = annualStudentLoan / 12;

  const totalDeductions = monthlyTax + monthlyNI + monthlyPension + monthlyStudentLoan + additionalDeductions;
  const netPay = monthlyGross - totalDeductions;

  return {
    grossPay: Math.round(monthlyGross * 100) / 100,
    incomeTax: Math.round(monthlyTax * 100) / 100,
    nationalInsurance: Math.round(monthlyNI * 100) / 100,
    pensionContribution: Math.round(monthlyPension * 100) / 100,
    studentLoanRepayment: Math.round(monthlyStudentLoan * 100) / 100,
    otherDeductions: additionalDeductions,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netPay: Math.round(netPay * 100) / 100,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}
