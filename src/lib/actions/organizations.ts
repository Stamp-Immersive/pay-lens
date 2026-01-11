'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getUser } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type Organization = {
  id: string;
  name: string;
  slug: string;
  default_employer_pension_percent: number;
  created_at: string;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  profile_id: string;
  role: 'owner' | 'admin' | 'employee';
  invited_at: string;
  accepted_at: string | null;
  profile?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
};

export type UserOrganization = {
  organization: Organization;
  role: 'owner' | 'admin' | 'employee';
};

// Get all organizations the current user belongs to
export async function getMyOrganizations(): Promise<UserOrganization[]> {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      role,
      organizations (
        id,
        name,
        slug,
        default_employer_pension_percent,
        created_at
      )
    `)
    .eq('profile_id', user.id)
    .not('accepted_at', 'is', null);

  if (error) {
    console.error('Error fetching organizations:', error);
    return [];
  }

  return (data || []).map((item) => ({
    organization: item.organizations as unknown as Organization,
    role: item.role as 'owner' | 'admin' | 'employee',
  }));
}

// Get a single organization by ID
export async function getOrganization(orgId: string): Promise<Organization | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (error) {
    console.error('Error fetching organization:', error);
    return null;
  }

  return data;
}

// Get organization by slug
export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Error fetching organization by slug:', error);
    return null;
  }

  return data;
}

// Get user's role in an organization
export async function getMyRole(orgId: string): Promise<'owner' | 'admin' | 'employee' | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('profile_id', user.id)
    .single();

  if (error || !data) return null;

  return data.role as 'owner' | 'admin' | 'employee';
}

// Check if user is admin of organization
export async function isOrgAdmin(orgId: string): Promise<boolean> {
  const role = await getMyRole(orgId);
  return role === 'owner' || role === 'admin';
}

// Create a new organization
export async function createOrganization(name: string, slug: string): Promise<{ success: boolean; error?: string; org?: { id: string; slug: string; name: string } }> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const supabase = await createClient();

  // Validate slug format
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(slug)) {
    return { success: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' };
  }

  // Check if slug is taken
  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .single();

  if (existing) {
    return { success: false, error: 'This slug is already taken' };
  }

  // Use admin client for org creation (bypasses RLS, but we've verified user above)
  const adminClient = createAdminClient();

  // Verify user has a profile
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Profile not found for user:', user.id, profileError);
    return { success: false, error: 'User profile not found. Please sign out and sign in again.' };
  }

  // Create organization
  const { data: org, error: orgError } = await adminClient
    .from('organizations')
    .insert({
      name,
      slug,
      created_by: user.id,
    })
    .select('id, slug, name')
    .single();

  if (orgError) {
    console.error('Error creating organization:', orgError, 'User ID:', user.id);
    return { success: false, error: 'Failed to create organization' };
  }

  // Add creator as owner
  const { error: memberError } = await adminClient
    .from('organization_members')
    .insert({
      organization_id: org.id,
      profile_id: user.id,
      role: 'owner',
      invited_by: user.id,
      accepted_at: new Date().toISOString(),
    });

  if (memberError) {
    console.error('Error adding owner:', memberError);
    // Rollback org creation
    await adminClient.from('organizations').delete().eq('id', org.id);
    return { success: false, error: 'Failed to create organization' };
  }

  revalidatePath('/dashboard');
  return { success: true, org: { id: org.id, slug: org.slug || slug, name: org.name || name } };
}

// Update organization settings
export async function updateOrganization(
  orgId: string,
  data: {
    name?: string;
    default_employer_pension_percent?: number;
  }
) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  const isAdmin = await isOrgAdmin(orgId);
  if (!isAdmin) throw new Error('Not authorized');

  const supabase = await createClient();

  const { error } = await supabase
    .from('organizations')
    .update(data)
    .eq('id', orgId);

  if (error) {
    console.error('Error updating organization:', error);
    throw new Error('Failed to update organization');
  }

  revalidatePath('/dashboard');
  return { success: true };
}

// Get organization members
export async function getOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      id,
      organization_id,
      profile_id,
      role,
      invited_at,
      accepted_at,
      profiles:profile_id (
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('organization_id', orgId)
    .order('role');

  if (error) {
    console.error('Error fetching members:', error);
    return [];
  }

  return (data || []).map((item) => {
    const profile = item.profiles as unknown as { full_name: string; email: string; avatar_url: string | null };
    return {
      id: item.id,
      organization_id: item.organization_id,
      profile_id: item.profile_id,
      role: item.role as 'owner' | 'admin' | 'employee',
      invited_at: item.invited_at,
      accepted_at: item.accepted_at,
      profile: profile ? {
        full_name: profile.full_name || '',
        email: profile.email || '',
        avatar_url: profile.avatar_url,
      } : undefined,
    };
  });
}

// Invite a member to organization
export async function inviteMember(orgId: string, email: string, role: 'admin' | 'employee') {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  const isAdmin = await isOrgAdmin(orgId);
  if (!isAdmin) throw new Error('Not authorized');

  const adminClient = createAdminClient();
  const normalizedEmail = email.toLowerCase().trim();

  // Prevent inviting yourself
  if (user.email?.toLowerCase() === normalizedEmail) {
    throw new Error('You cannot invite yourself to an organization');
  }

  // Get organization details for the email
  const { data: org } = await adminClient
    .from('organizations')
    .select('name, slug')
    .eq('id', orgId)
    .single();

  if (!org) throw new Error('Organization not found');

  // Get inviter name
  const { data: inviter } = await adminClient
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single();

  const inviterName = inviter?.full_name || inviter?.email || 'Someone';

  // Find profile by email
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .single();

  // Import email functions
  const { sendEmail } = await import('@/lib/email/resend');
  const { getInviteEmailHtml } = await import('@/lib/email/templates/invite');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!profile) {
    // User doesn't exist yet - create pending invite
    // Check if already invited
    const { data: existingInvite } = await adminClient
      .from('pending_invites')
      .select('id')
      .eq('organization_id', orgId)
      .eq('email', normalizedEmail)
      .single();

    if (existingInvite) {
      throw new Error('An invitation has already been sent to this email');
    }

    // Create pending invite
    const { data: invite, error: inviteError } = await adminClient
      .from('pending_invites')
      .insert({
        organization_id: orgId,
        email: normalizedEmail,
        role,
        invited_by: user.id,
      })
      .select('token')
      .single();

    if (inviteError) {
      console.error('Error creating pending invite:', inviteError);
      throw new Error('Failed to send invitation');
    }

    // Send email with signup link
    const signupUrl = `${baseUrl}/login?invite=${invite.token}`;
    const emailHtml = getInviteEmailHtml({
      organizationName: org.name,
      inviterName,
      role,
      acceptUrl: signupUrl,
      isNewUser: true,
    });

    await sendEmail({
      to: normalizedEmail,
      subject: `You're invited to join ${org.name} on PayAdjust`,
      html: emailHtml,
    });

    revalidatePath('/dashboard');
    return { success: true, isNewUser: true };
  }

  // User exists - check if already a member
  const { data: existing } = await adminClient
    .from('organization_members')
    .select('id, accepted_at')
    .eq('organization_id', orgId)
    .eq('profile_id', profile.id)
    .single();

  if (existing) {
    if (existing.accepted_at) {
      throw new Error('User is already a member of this organization');
    } else {
      throw new Error('An invitation has already been sent to this user');
    }
  }

  // Add member with pending status (no accepted_at)
  const { error } = await adminClient
    .from('organization_members')
    .insert({
      organization_id: orgId,
      profile_id: profile.id,
      role,
      invited_by: user.id,
      // Note: accepted_at is NULL - user needs to accept
    });

  if (error) {
    console.error('Error inviting member:', error);
    throw new Error('Failed to invite member');
  }

  // Send email with invite link
  const inviteUrl = `${baseUrl}/invites`;
  const emailHtml = getInviteEmailHtml({
    organizationName: org.name,
    inviterName,
    role,
    acceptUrl: inviteUrl,
    isNewUser: false,
  });

  await sendEmail({
    to: normalizedEmail,
    subject: `You're invited to join ${org.name} on PayAdjust`,
    html: emailHtml,
  });

  revalidatePath('/dashboard');
  return { success: true, isNewUser: false };
}

// Update member role
export async function updateMemberRole(memberId: string, newRole: 'admin' | 'employee') {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  const supabase = await createClient();

  // Get member to check org
  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('id', memberId)
    .single();

  if (!member) throw new Error('Member not found');
  if (member.role === 'owner') throw new Error('Cannot change owner role');

  const isAdmin = await isOrgAdmin(member.organization_id);
  if (!isAdmin) throw new Error('Not authorized');

  const { error } = await supabase
    .from('organization_members')
    .update({ role: newRole })
    .eq('id', memberId);

  if (error) {
    console.error('Error updating role:', error);
    throw new Error('Failed to update role');
  }

  revalidatePath('/dashboard');
  return { success: true };
}

// Remove member from organization
export async function removeMember(memberId: string) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  const supabase = await createClient();

  // Get member to check org
  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id, profile_id, role')
    .eq('id', memberId)
    .single();

  if (!member) throw new Error('Member not found');
  if (member.role === 'owner') throw new Error('Cannot remove owner');

  const isAdmin = await isOrgAdmin(member.organization_id);
  if (!isAdmin && member.profile_id !== user.id) {
    throw new Error('Not authorized');
  }

  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    console.error('Error removing member:', error);
    throw new Error('Failed to remove member');
  }

  revalidatePath('/dashboard');
  return { success: true };
}

// Get first organization for a user (for default redirect)
export async function getDefaultOrganization(): Promise<Organization | null> {
  const orgs = await getMyOrganizations();
  if (orgs.length === 0) return null;

  // Prefer admin/owner orgs first
  const adminOrg = orgs.find((o) => o.role === 'owner' || o.role === 'admin');
  return adminOrg?.organization || orgs[0].organization;
}

// Get notification counts for admin nav badges
export type AdminNotificationCounts = {
  employeesNeedingSetup: number;
  pendingInvites: number;
  pendingPayroll: number; // draft periods OR preview periods past deadline
  readyForPayment: number; // approved periods
};

export type AdminNotificationDetails = {
  employees: {
    needingSetup: number;
    pendingInvites: number;
  };
  payroll: {
    draftPeriods: number;
    expiredPreviewPeriods: number;
  };
  payments: {
    readyForPayment: number;
  };
};

export async function getAdminNotificationCounts(orgId: string): Promise<AdminNotificationCounts> {
  const details = await getAdminNotificationDetails(orgId);
  return {
    employeesNeedingSetup: details.employees.needingSetup,
    pendingInvites: details.employees.pendingInvites,
    pendingPayroll: details.payroll.draftPeriods + details.payroll.expiredPreviewPeriods,
    readyForPayment: details.payments.readyForPayment,
  };
}

export async function getAdminNotificationDetails(orgId: string): Promise<AdminNotificationDetails> {
  const user = await getUser();
  if (!user) return {
    employees: { needingSetup: 0, pendingInvites: 0 },
    payroll: { draftPeriods: 0, expiredPreviewPeriods: 0 },
    payments: { readyForPayment: 0 },
  };

  const supabase = await createClient();

  // Get employees needing setup (members with role=employee but no employee_details)
  const { data: members } = await supabase
    .from('organization_members')
    .select('profile_id')
    .eq('organization_id', orgId)
    .eq('role', 'employee')
    .not('accepted_at', 'is', null);

  const profileIds = members?.map((m) => m.profile_id) || [];

  let employeesNeedingSetup = 0;
  if (profileIds.length > 0) {
    const { data: details } = await supabase
      .from('employee_details')
      .select('profile_id')
      .eq('organization_id', orgId)
      .in('profile_id', profileIds);

    const setupProfileIds = new Set(details?.map((d) => d.profile_id) || []);
    employeesNeedingSetup = profileIds.filter((id) => !setupProfileIds.has(id)).length;
  }

  // Get pending invites (organization_members with null accepted_at + pending_invites)
  const { count: memberInvites } = await supabase
    .from('organization_members')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .is('accepted_at', null);

  const { count: emailInvites } = await supabase
    .from('pending_invites')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  const pendingInvites = (memberInvites || 0) + (emailInvites || 0);

  // Get payroll periods needing attention:
  // 1. Draft periods (need payslips generated)
  const { count: draftPeriods } = await supabase
    .from('payroll_periods')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('status', 'draft');

  // 2. Preview periods past adjustment deadline (need approval)
  const today = new Date().toISOString().split('T')[0];
  const { count: expiredPreviewPeriods } = await supabase
    .from('payroll_periods')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('status', 'preview')
    .not('adjustment_deadline', 'is', null)
    .lt('adjustment_deadline', today);

  // Get approved periods ready for payment
  const { count: readyForPayment } = await supabase
    .from('payroll_periods')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('status', 'approved');

  return {
    employees: {
      needingSetup: employeesNeedingSetup,
      pendingInvites,
    },
    payroll: {
      draftPeriods: draftPeriods || 0,
      expiredPreviewPeriods: expiredPreviewPeriods || 0,
    },
    payments: {
      readyForPayment: readyForPayment || 0,
    },
  };
}
