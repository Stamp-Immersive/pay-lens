-- Fix organization INSERT policy
-- The original policy only checks auth.uid() IS NOT NULL
-- We need to ensure created_by matches the authenticated user

DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;

CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );
