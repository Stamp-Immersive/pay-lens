import { Payslip } from '@/types/payslip';

export const mockPayslips: Payslip[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    employeeName: 'John Smith',
    payPeriod: 'January 2026',
    payDate: '2026-01-31',

    basicSalary: 4166.67,
    earnings: [
      { name: 'Basic Salary', amount: 4166.67 },
      { name: 'Performance Bonus', amount: 500.00 },
    ],
    grossPay: 4666.67,

    deductions: [
      {
        name: 'Pension',
        amount: 233.33,
        isPercentage: true,
        percentage: 5,
        isAdjustable: true,
        minPercentage: 3,
        maxPercentage: 10,
      },
      {
        name: 'Income Tax',
        amount: 653.33,
        isPercentage: false,
      },
      {
        name: 'National Insurance',
        amount: 373.33,
        isPercentage: false,
      },
      {
        name: 'Student Loan (Plan 2)',
        amount: 95.00,
        isPercentage: false,
      },
    ],
    totalDeductions: 1355.00,

    netPay: 3311.67,

    taxCode: '1257L',
    nationalInsurance: 373.33,
    incomeTax: 653.33,

    ytdGross: 4666.67,
    ytdTax: 653.33,
    ytdNI: 373.33,
    ytdNet: 3311.67,
  },
  {
    id: '2',
    employeeId: 'EMP001',
    employeeName: 'John Smith',
    payPeriod: 'December 2025',
    payDate: '2025-12-31',

    basicSalary: 4166.67,
    earnings: [
      { name: 'Basic Salary', amount: 4166.67 },
    ],
    grossPay: 4166.67,

    deductions: [
      {
        name: 'Pension',
        amount: 208.33,
        isPercentage: true,
        percentage: 5,
        isAdjustable: true,
        minPercentage: 3,
        maxPercentage: 10,
      },
      {
        name: 'Income Tax',
        amount: 553.33,
        isPercentage: false,
      },
      {
        name: 'National Insurance',
        amount: 323.33,
        isPercentage: false,
      },
      {
        name: 'Student Loan (Plan 2)',
        amount: 50.00,
        isPercentage: false,
      },
    ],
    totalDeductions: 1135.00,

    netPay: 3031.67,

    taxCode: '1257L',
    nationalInsurance: 323.33,
    incomeTax: 553.33,

    ytdGross: 50000.00,
    ytdTax: 6640.00,
    ytdNI: 3880.00,
    ytdNet: 36380.00,
  },
];

export const getCurrentPayslip = (): Payslip => mockPayslips[0];

export const getPayslipHistory = (): Payslip[] => mockPayslips;
