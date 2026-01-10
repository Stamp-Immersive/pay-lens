-- Re-enable RLS on organizations and organization_members tables
-- Security is now handled via admin client in server actions

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
