-- PayLens Pending Invites Table
-- Run this in Supabase SQL Editor after 003_fix_profiles_rls.sql
-- Stores invites for users who haven't signed up yet

-- ===========================================
-- PENDING INVITES TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS pending_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email VARCHAR(255) NOT NULL,
  role org_role NOT NULL DEFAULT 'employee',
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  token UUID DEFAULT gen_random_uuid(), -- For secure email links
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
  -- One invite per email per org
  UNIQUE(organization_id, email)
);

-- ===========================================
-- INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_pending_invites_email ON pending_invites(email);
CREATE INDEX IF NOT EXISTS idx_pending_invites_org ON pending_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_pending_invites_token ON pending_invites(token);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE pending_invites ENABLE ROW LEVEL SECURITY;

-- Org admins can view and manage pending invites for their org
CREATE POLICY "Org admins can view pending invites" ON pending_invites
  FOR SELECT USING (is_org_admin(organization_id));

CREATE POLICY "Org admins can create pending invites" ON pending_invites
  FOR INSERT WITH CHECK (is_org_admin(organization_id));

CREATE POLICY "Org admins can delete pending invites" ON pending_invites
  FOR DELETE USING (is_org_admin(organization_id));

-- ===========================================
-- CLEANUP FUNCTION
-- ===========================================

-- Function to clean up expired invites (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_invites()
RETURNS void AS $$
BEGIN
  DELETE FROM pending_invites WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
