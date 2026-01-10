-- PayLens Payroll Schema
-- Run this in Supabase SQL Editor after the initial setup.sql

-- ===========================================
-- EMPLOYEE DETAILS TABLE
-- Extends profiles with payroll-specific info
-- ===========================================
CREATE TABLE IF NOT EXISTS employee_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  annual_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_code VARCHAR(10) NOT NULL DEFAULT '1257L',
  default_pension_percent DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
  employer_pension_percent DECIMAL(5, 2) NOT NULL DEFAULT 3.00,
  -- Bank details (encrypted in production)
  bank_account_name VARCHAR(100),
  bank_account_number VARCHAR(20),
  bank_sort_code VARCHAR(10),
  -- Employment info
  start_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- PAYROLL PERIODS TABLE
-- Represents a month's payroll run
-- ===========================================
CREATE TYPE payroll_status AS ENUM ('draft', 'preview', 'approved', 'processing', 'processed');

CREATE TABLE IF NOT EXISTS payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  status payroll_status NOT NULL DEFAULT 'draft',
  -- Key dates
  preview_start_date DATE, -- When employees can view/adjust
  adjustment_deadline DATE, -- Last day for employee changes
  processing_date DATE, -- When payments will be processed
  -- Totals (cached for dashboard)
  total_gross DECIMAL(14, 2) DEFAULT 0,
  total_net DECIMAL(14, 2) DEFAULT 0,
  total_tax DECIMAL(14, 2) DEFAULT 0,
  total_ni DECIMAL(14, 2) DEFAULT 0,
  total_pension_employee DECIMAL(14, 2) DEFAULT 0,
  total_pension_employer DECIMAL(14, 2) DEFAULT 0,
  employee_count INTEGER DEFAULT 0,
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure unique period per month
  UNIQUE(year, month)
);

-- ===========================================
-- PAYSLIPS TABLE
-- Individual payslip for each employee per period
-- ===========================================
CREATE TYPE payslip_status AS ENUM ('draft', 'preview', 'adjusted', 'approved', 'paid');

CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID REFERENCES payroll_periods(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  -- Earnings
  base_salary DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Monthly base (annual / 12)
  bonus DECIMAL(12, 2) DEFAULT 0,
  other_additions DECIMAL(12, 2) DEFAULT 0,
  gross_pay DECIMAL(12, 2) NOT NULL DEFAULT 0, -- base + bonus + additions
  -- Pension (salary sacrifice - deducted before tax)
  pension_percent DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
  pension_employee DECIMAL(12, 2) NOT NULL DEFAULT 0,
  pension_employer DECIMAL(12, 2) NOT NULL DEFAULT 0,
  -- Taxable amount
  taxable_pay DECIMAL(12, 2) NOT NULL DEFAULT 0, -- gross - pension_employee
  -- Deductions
  income_tax DECIMAL(12, 2) NOT NULL DEFAULT 0,
  national_insurance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  other_deductions DECIMAL(12, 2) DEFAULT 0,
  total_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0,
  -- Final
  net_pay DECIMAL(12, 2) NOT NULL DEFAULT 0,
  -- Status tracking
  status payslip_status NOT NULL DEFAULT 'draft',
  employee_adjusted BOOLEAN DEFAULT false,
  adjustment_note TEXT,
  -- Tax info for display
  tax_code VARCHAR(10),
  tax_bracket VARCHAR(20), -- 'basic', 'higher', 'additional'
  year_to_date_gross DECIMAL(14, 2) DEFAULT 0,
  year_to_date_tax DECIMAL(14, 2) DEFAULT 0,
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- One payslip per employee per period
  UNIQUE(payroll_period_id, employee_id)
);

-- ===========================================
-- PAYSLIP ADJUSTMENTS TABLE
-- History of employee changes to their payslips
-- ===========================================
CREATE TABLE IF NOT EXISTS payslip_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id UUID REFERENCES payslips(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  -- What changed
  previous_pension_percent DECIMAL(5, 2) NOT NULL,
  new_pension_percent DECIMAL(5, 2) NOT NULL,
  previous_net_pay DECIMAL(12, 2) NOT NULL,
  new_net_pay DECIMAL(12, 2) NOT NULL,
  -- Reason (optional)
  reason TEXT,
  -- Status
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- NOTIFICATIONS TABLE
-- Notifications for admins
-- ===========================================
CREATE TYPE notification_type AS ENUM (
  'employee_adjustment',
  'payroll_ready',
  'approval_needed',
  'payment_processed',
  'payment_failed'
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- NULL = all admins
  type notification_type NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  -- Related entities
  related_payslip_id UUID REFERENCES payslips(id) ON DELETE SET NULL,
  related_employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  related_period_id UUID REFERENCES payroll_periods(id) ON DELETE SET NULL,
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX idx_employee_details_profile ON employee_details(profile_id);
CREATE INDEX idx_payroll_periods_status ON payroll_periods(status);
CREATE INDEX idx_payroll_periods_year_month ON payroll_periods(year, month);
CREATE INDEX idx_payslips_period ON payslips(payroll_period_id);
CREATE INDEX idx_payslips_employee ON payslips(employee_id);
CREATE INDEX idx_payslips_status ON payslips(status);
CREATE INDEX idx_adjustments_payslip ON payslip_adjustments(payslip_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read) WHERE is_read = false;

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE employee_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslip_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Employee Details: Admins can do everything, employees can view their own
CREATE POLICY "Admins full access to employee_details" ON employee_details
  FOR ALL USING (is_admin());

CREATE POLICY "Employees view own details" ON employee_details
  FOR SELECT USING (profile_id = auth.uid());

-- Payroll Periods: Admins can do everything, employees can view non-draft periods
CREATE POLICY "Admins full access to payroll_periods" ON payroll_periods
  FOR ALL USING (is_admin());

CREATE POLICY "Employees view active periods" ON payroll_periods
  FOR SELECT USING (status != 'draft');

-- Payslips: Admins can do everything, employees can view/update their own
CREATE POLICY "Admins full access to payslips" ON payslips
  FOR ALL USING (is_admin());

CREATE POLICY "Employees view own payslips" ON payslips
  FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY "Employees update own payslips" ON payslips
  FOR UPDATE USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

-- Payslip Adjustments: Admins can view all, employees can view/create their own
CREATE POLICY "Admins full access to adjustments" ON payslip_adjustments
  FOR ALL USING (is_admin());

CREATE POLICY "Employees view own adjustments" ON payslip_adjustments
  FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY "Employees create own adjustments" ON payslip_adjustments
  FOR INSERT WITH CHECK (employee_id = auth.uid());

-- Notifications: Users can only see their own notifications
CREATE POLICY "Users view own notifications" ON notifications
  FOR SELECT USING (recipient_id = auth.uid() OR (recipient_id IS NULL AND is_admin()));

CREATE POLICY "Users update own notifications" ON notifications
  FOR UPDATE USING (recipient_id = auth.uid() OR (recipient_id IS NULL AND is_admin()));

CREATE POLICY "Admins create notifications" ON notifications
  FOR INSERT WITH CHECK (is_admin());

-- ===========================================
-- TRIGGERS
-- ===========================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_employee_details_updated_at
  BEFORE UPDATE ON employee_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_periods_updated_at
  BEFORE UPDATE ON payroll_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payslips_updated_at
  BEFORE UPDATE ON payslips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
