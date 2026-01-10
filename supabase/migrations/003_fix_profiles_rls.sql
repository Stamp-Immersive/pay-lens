-- PayLens Profiles RLS Fix
-- Run this in Supabase SQL Editor after 002_multi_org.sql
-- Fixes: Org members can now see profiles of fellow org members

-- ===========================================
-- DROP OUTDATED POLICIES
-- ===========================================

-- The old policy uses deprecated profiles.role column
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
-- Drop existing policy if re-running this migration
DROP POLICY IF EXISTS "Org members can view fellow members" ON profiles;

-- ===========================================
-- NEW ORG-BASED PROFILE VISIBILITY
-- ===========================================

-- Org members can view profiles of anyone in their organizations
-- This allows seeing team member names/emails in the org member list
CREATE POLICY "Org members can view fellow members" ON profiles
  FOR SELECT USING (
    -- User can always see their own profile
    auth.uid() = id
    OR
    -- User can see profiles of people in the same organization(s)
    EXISTS (
      SELECT 1 FROM organization_members my_orgs
      JOIN organization_members their_orgs ON my_orgs.organization_id = their_orgs.organization_id
      WHERE my_orgs.profile_id = auth.uid()
      AND their_orgs.profile_id = profiles.id
    )
  );

-- ===========================================
-- VERIFICATION QUERY (optional - run to test)
-- ===========================================
-- After running the above, you can verify with:
--
-- SELECT polname, polcmd, polroles, polqual
-- FROM pg_policy
-- WHERE polrelid = 'profiles'::regclass;
