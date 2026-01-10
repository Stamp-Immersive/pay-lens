-- PayLens Multi-Organization Support
-- Run this in Supabase SQL Editor after 001_payroll_schema.sql

-- ===========================================
-- ORGANIZATIONS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  -- Settings
  default_employer_pension_percent DECIMAL(5, 2) DEFAULT 3.00,
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- ORGANIZATION MEMBERS TABLE
-- Junction table for profiles <-> organizations
-- ===========================================
CREATE TYPE org_role AS ENUM ('owner', 'admin', 'employee');

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role org_role NOT NULL DEFAULT 'employee',
  -- Invitation tracking
  invited_by UUID REFERENCES profiles(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- One membership per user per org
  UNIQUE(organization_id, profile_id)
);

-- ===========================================
-- ADD ORGANIZATION_ID TO EXISTING TABLES
-- ===========================================

-- Add to employee_details
ALTER TABLE employee_details
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Remove the old unique constraint on profile_id (one employee record per org now)
ALTER TABLE employee_details DROP CONSTRAINT IF EXISTS employee_details_profile_id_key;

-- Add new unique constraint: one employee_details per profile per org
ALTER TABLE employee_details
  ADD CONSTRAINT employee_details_org_profile_unique UNIQUE(organization_id, profile_id);

-- Add to payroll_periods
ALTER TABLE payroll_periods
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Update unique constraint: unique period per month per org
ALTER TABLE payroll_periods DROP CONSTRAINT IF EXISTS payroll_periods_year_month_key;
ALTER TABLE payroll_periods
  ADD CONSTRAINT payroll_periods_org_year_month_unique UNIQUE(organization_id, year, month);

-- Add to notifications
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- ===========================================
-- INDEXES FOR NEW COLUMNS
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_profile ON organization_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_employee_details_org ON employee_details(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_org ON payroll_periods(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);

-- ===========================================
-- HELPER FUNCTIONS FOR RLS
-- ===========================================

-- Check if user is a member of an organization
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND profile_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is an admin (or owner) of an organization
CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND profile_id = auth.uid()
    AND role IN ('admin', 'owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is the owner of an organization
CREATE OR REPLACE FUNCTION is_org_owner(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND profile_id = auth.uid()
    AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's role in an organization
CREATE OR REPLACE FUNCTION get_org_role(org_id UUID)
RETURNS org_role AS $$
DECLARE
  user_role org_role;
BEGIN
  SELECT role INTO user_role
  FROM organization_members
  WHERE organization_id = org_id
  AND profile_id = auth.uid();

  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- ROW LEVEL SECURITY FOR NEW TABLES
-- ===========================================

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Organizations: Members can view, admins can update
CREATE POLICY "Members can view their organizations" ON organizations
  FOR SELECT USING (is_org_member(id));

CREATE POLICY "Admins can update their organizations" ON organizations
  FOR UPDATE USING (is_org_admin(id));

CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners can delete organizations" ON organizations
  FOR DELETE USING (is_org_owner(id));

-- Organization Members: Members can view all members, admins can manage
CREATE POLICY "Members can view org members" ON organization_members
  FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY "Admins can add members" ON organization_members
  FOR INSERT WITH CHECK (is_org_admin(organization_id));

CREATE POLICY "Admins can update members" ON organization_members
  FOR UPDATE USING (is_org_admin(organization_id));

CREATE POLICY "Admins can remove members" ON organization_members
  FOR DELETE USING (is_org_admin(organization_id));

-- ===========================================
-- UPDATE EXISTING RLS POLICIES
-- ===========================================

-- Drop old policies
DROP POLICY IF EXISTS "Admins full access to employee_details" ON employee_details;
DROP POLICY IF EXISTS "Employees view own details" ON employee_details;
DROP POLICY IF EXISTS "Admins full access to payroll_periods" ON payroll_periods;
DROP POLICY IF EXISTS "Employees view active periods" ON payroll_periods;
DROP POLICY IF EXISTS "Admins full access to payslips" ON payslips;
DROP POLICY IF EXISTS "Employees view own payslips" ON payslips;
DROP POLICY IF EXISTS "Employees update own payslips" ON payslips;
DROP POLICY IF EXISTS "Admins full access to adjustments" ON payslip_adjustments;
DROP POLICY IF EXISTS "Employees view own adjustments" ON payslip_adjustments;
DROP POLICY IF EXISTS "Employees create own adjustments" ON payslip_adjustments;
DROP POLICY IF EXISTS "Users view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins create notifications" ON notifications;

-- Employee Details: Org admins can manage, employees can view their own
CREATE POLICY "Org admins manage employee_details" ON employee_details
  FOR ALL USING (is_org_admin(organization_id));

CREATE POLICY "Employees view own details in org" ON employee_details
  FOR SELECT USING (
    profile_id = auth.uid()
    AND is_org_member(organization_id)
  );

-- Payroll Periods: Org admins can manage, employees can view non-draft
CREATE POLICY "Org admins manage payroll_periods" ON payroll_periods
  FOR ALL USING (is_org_admin(organization_id));

CREATE POLICY "Org employees view active periods" ON payroll_periods
  FOR SELECT USING (
    is_org_member(organization_id)
    AND status != 'draft'
  );

-- Payslips: Org admins can manage, employees can view/update their own
CREATE POLICY "Org admins manage payslips" ON payslips
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM payroll_periods pp
      WHERE pp.id = payroll_period_id
      AND is_org_admin(pp.organization_id)
    )
  );

CREATE POLICY "Employees view own payslips in org" ON payslips
  FOR SELECT USING (
    employee_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM payroll_periods pp
      WHERE pp.id = payroll_period_id
      AND is_org_member(pp.organization_id)
    )
  );

CREATE POLICY "Employees update own payslips in org" ON payslips
  FOR UPDATE USING (
    employee_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM payroll_periods pp
      WHERE pp.id = payroll_period_id
      AND is_org_member(pp.organization_id)
    )
  );

-- Payslip Adjustments: Org admins can view all, employees can view/create their own
CREATE POLICY "Org admins manage adjustments" ON payslip_adjustments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM payslips ps
      JOIN payroll_periods pp ON pp.id = ps.payroll_period_id
      WHERE ps.id = payslip_id
      AND is_org_admin(pp.organization_id)
    )
  );

CREATE POLICY "Employees view own adjustments in org" ON payslip_adjustments
  FOR SELECT USING (
    employee_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM payslips ps
      JOIN payroll_periods pp ON pp.id = ps.payroll_period_id
      WHERE ps.id = payslip_id
      AND is_org_member(pp.organization_id)
    )
  );

CREATE POLICY "Employees create own adjustments in org" ON payslip_adjustments
  FOR INSERT WITH CHECK (
    employee_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM payslips ps
      JOIN payroll_periods pp ON pp.id = ps.payroll_period_id
      WHERE ps.id = payslip_id
      AND is_org_member(pp.organization_id)
    )
  );

-- Notifications: Org-scoped access
CREATE POLICY "View own org notifications" ON notifications
  FOR SELECT USING (
    is_org_member(organization_id)
    AND (recipient_id = auth.uid() OR (recipient_id IS NULL AND is_org_admin(organization_id)))
  );

CREATE POLICY "Update own org notifications" ON notifications
  FOR UPDATE USING (
    is_org_member(organization_id)
    AND (recipient_id = auth.uid() OR (recipient_id IS NULL AND is_org_admin(organization_id)))
  );

CREATE POLICY "Org admins create notifications" ON notifications
  FOR INSERT WITH CHECK (is_org_admin(organization_id));

-- ===========================================
-- TRIGGERS
-- ===========================================

-- Auto-update updated_at for organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- REMOVE OLD ROLE FROM PROFILES
-- ===========================================
-- The 'role' column in profiles is now deprecated
-- Roles are per-organization in organization_members
-- We'll keep it for backwards compatibility but it's not used

-- Add a comment to indicate deprecation
COMMENT ON COLUMN profiles.role IS 'DEPRECATED: Use organization_members.role instead. Kept for backwards compatibility.';
