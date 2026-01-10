export interface PayslipEarning {
  name: string;
  amount: number;
}

export interface PayslipDeduction {
  name: string;
  amount: number;
  isPercentage?: boolean;
  percentage?: number;
  isAdjustable?: boolean;
  minPercentage?: number;
  maxPercentage?: number;
}

export interface Payslip {
  id: string;
  employeeId: string;
  employeeName: string;
  payPeriod: string;
  payDate: string;

  // Earnings
  basicSalary: number;
  earnings: PayslipEarning[];
  grossPay: number;

  // Deductions
  deductions: PayslipDeduction[];
  totalDeductions: number;

  // Net
  netPay: number;

  // Tax info
  taxCode: string;
  nationalInsurance: number;
  incomeTax: number;

  // Year to date
  ytdGross: number;
  ytdTax: number;
  ytdNI: number;
  ytdNet: number;
}

export interface ContributionSettings {
  pensionPercentage: number;
  studentLoanPlan?: 'plan1' | 'plan2' | 'plan4' | 'postgrad' | null;
  additionalVoluntaryContribution?: number;
}

export interface PayCalculation {
  grossPay: number;
  incomeTax: number;
  nationalInsurance: number;
  pensionContribution: number;
  studentLoanRepayment: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
}
