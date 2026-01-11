-- PayLens Payslip Bonuses
-- Adds support for multiple bonuses per payslip with descriptions

-- ===========================================
-- PAYSLIP BONUSES TABLE
-- Stores individual bonus items for each payslip
-- ===========================================
CREATE TABLE IF NOT EXISTS payslip_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id UUID REFERENCES payslips(id) ON DELETE CASCADE NOT NULL,
  description VARCHAR(200) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX idx_payslip_bonuses_payslip ON payslip_bonuses(payslip_id);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================
ALTER TABLE payslip_bonuses ENABLE ROW LEVEL SECURITY;

-- Org admins can manage bonuses (same pattern as payslips)
CREATE POLICY "Org admins manage payslip_bonuses" ON payslip_bonuses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM payslips ps
      JOIN payroll_periods pp ON pp.id = ps.payroll_period_id
      WHERE ps.id = payslip_id
      AND is_org_admin(pp.organization_id)
    )
  );

-- Employees can view bonuses on their own payslips
CREATE POLICY "Employees view own payslip_bonuses" ON payslip_bonuses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM payslips ps
      JOIN payroll_periods pp ON pp.id = ps.payroll_period_id
      WHERE ps.id = payslip_id
      AND ps.employee_id = auth.uid()
      AND is_org_member(pp.organization_id)
    )
  );
