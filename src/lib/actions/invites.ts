'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getUser } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type PendingInvite = {
  id: string;
  organization_id: string;
  role: 'admin' | 'employee';
  invited_at: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  inviter?: {
    full_name: string;
    email: string;
  };
};

// Get pending invites for the current user (in organization_members with NULL accepted_at)
export async function getMyPendingInvites(): Promise<PendingInvite[]> {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();

  // First, get orgs where user is already an accepted member
  const { data: acceptedOrgs } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('profile_id', user.id)
    .not('accepted_at', 'is', null);

  const acceptedOrgIds = (acceptedOrgs || []).map(o => o.organization_id);

  // Get invites from organization_members where accepted_at is null
  // and exclude orgs where user is already an accepted member
  let query = supabase
    .from('organization_members')
    .select(`
      id,
      organization_id,
      role,
      invited_at,
      invited_by,
      organizations (
        id,
        name,
        slug
      )
    `)
    .eq('profile_id', user.id)
    .is('accepted_at', null);

  // Exclude orgs where user is already a member
  if (acceptedOrgIds.length > 0) {
    query = query.not('organization_id', 'in', `(${acceptedOrgIds.join(',')})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching pending invites:', error);
    return [];
  }

  // Get inviter info separately (can't join profiles twice easily)
  const invites = await Promise.all(
    (data || []).map(async (invite) => {
      let inviter = undefined;
      if (invite.invited_by) {
        const { data: inviterData } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', invite.invited_by)
          .single();
        inviter = inviterData || undefined;
      }

      return {
        id: invite.id,
        organization_id: invite.organization_id,
        role: invite.role as 'admin' | 'employee',
        invited_at: invite.invited_at,
        organization: invite.organizations as unknown as { id: string; name: string; slug: string },
        inviter: inviter ? {
          full_name: inviter.full_name || '',
          email: inviter.email || '',
        } : undefined,
      };
    })
  );

  return invites;
}

// Accept an invitation
export async function acceptInvite(inviteId: string) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  const supabase = await createClient();

  // Verify this invite belongs to the current user
  const { data: invite, error: fetchError } = await supabase
    .from('organization_members')
    .select('id, organization_id, profile_id')
    .eq('id', inviteId)
    .eq('profile_id', user.id)
    .is('accepted_at', null)
    .single();

  if (fetchError || !invite) {
    throw new Error('Invite not found or already accepted');
  }

  // Accept the invite
  const { error: updateError } = await supabase
    .from('organization_members')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', inviteId);

  if (updateError) {
    console.error('Error accepting invite:', updateError);
    throw new Error('Failed to accept invite');
  }

  revalidatePath('/invites');
  revalidatePath('/', 'layout');

  // Return the org slug for redirect
  const adminClient = createAdminClient();
  const { data: org } = await adminClient
    .from('organizations')
    .select('slug')
    .eq('id', invite.organization_id)
    .single();

  return { success: true, orgSlug: org?.slug };
}

// Decline an invitation
export async function declineInvite(inviteId: string) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  const supabase = await createClient();

  // Verify this invite belongs to the current user
  const { data: invite, error: fetchError } = await supabase
    .from('organization_members')
    .select('id, profile_id')
    .eq('id', inviteId)
    .eq('profile_id', user.id)
    .is('accepted_at', null)
    .single();

  if (fetchError || !invite) {
    throw new Error('Invite not found or already accepted');
  }

  // Delete the invite
  const { error: deleteError } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', inviteId);

  if (deleteError) {
    console.error('Error declining invite:', deleteError);
    throw new Error('Failed to decline invite');
  }

  revalidatePath('/invites');
  revalidatePath('/', 'layout');

  return { success: true };
}

// Convert pending_invites to organization_members when user signs up
// Called from auth callback
export async function convertPendingInvitesForUser(userId: string, email: string) {
  const adminClient = createAdminClient();

  // Find pending invites for this email
  const { data: pendingInvites, error: fetchError } = await adminClient
    .from('pending_invites')
    .select('*')
    .eq('email', email.toLowerCase());

  if (fetchError || !pendingInvites || pendingInvites.length === 0) {
    return { converted: 0 };
  }

  let converted = 0;

  for (const invite of pendingInvites) {
    // Check if not expired
    if (new Date(invite.expires_at) < new Date()) {
      // Delete expired invite
      await adminClient
        .from('pending_invites')
        .delete()
        .eq('id', invite.id);
      continue;
    }

    // Check if already a member
    const { data: existing } = await adminClient
      .from('organization_members')
      .select('id')
      .eq('organization_id', invite.organization_id)
      .eq('profile_id', userId)
      .single();

    if (existing) {
      // Already a member, delete pending invite
      await adminClient
        .from('pending_invites')
        .delete()
        .eq('id', invite.id);
      continue;
    }

    // Create organization_member record (not yet accepted)
    const { error: insertError } = await adminClient
      .from('organization_members')
      .insert({
        organization_id: invite.organization_id,
        profile_id: userId,
        role: invite.role,
        invited_by: invite.invited_by,
        invited_at: invite.invited_at,
        // Note: accepted_at is NULL - user still needs to accept
      });

    if (!insertError) {
      converted++;
      // Delete the pending invite
      await adminClient
        .from('pending_invites')
        .delete()
        .eq('id', invite.id);
    }
  }

  return { converted };
}

// Get pending invites for an organization (admin view)
export async function getOrgPendingInvites(orgId: string) {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();

  // Get pending organization_members (accepted_at is null)
  const { data: memberInvites, error: memberError } = await supabase
    .from('organization_members')
    .select(`
      id,
      role,
      invited_at,
      profiles:profile_id (
        full_name,
        email
      )
    `)
    .eq('organization_id', orgId)
    .is('accepted_at', null);

  // Get pending_invites (users who haven't signed up)
  const { data: emailInvites, error: emailError } = await supabase
    .from('pending_invites')
    .select('id, email, role, invited_at, expires_at')
    .eq('organization_id', orgId);

  if (memberError) {
    console.error('Error fetching member invites:', memberError);
  }
  if (emailError) {
    console.error('Error fetching email invites:', emailError);
  }

  const existingUserInvites = (memberInvites || []).map((inv) => ({
    id: inv.id,
    type: 'member' as const,
    email: (inv.profiles as unknown as { email: string })?.email || '',
    name: (inv.profiles as unknown as { full_name: string })?.full_name || '',
    role: inv.role,
    invited_at: inv.invited_at,
    expires_at: null,
  }));

  const newUserInvites = (emailInvites || []).map((inv) => ({
    id: inv.id,
    type: 'pending' as const,
    email: inv.email,
    name: null,
    role: inv.role,
    invited_at: inv.invited_at,
    expires_at: inv.expires_at,
  }));

  return [...existingUserInvites, ...newUserInvites];
}

// Cancel a pending invite (admin action)
export async function cancelInvite(inviteId: string, type: 'member' | 'pending', orgId: string) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  const supabase = await createClient();

  if (type === 'member') {
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', inviteId)
      .eq('organization_id', orgId)
      .is('accepted_at', null);

    if (error) {
      console.error('Error canceling invite:', error);
      throw new Error('Failed to cancel invite');
    }
  } else {
    const { error } = await supabase
      .from('pending_invites')
      .delete()
      .eq('id', inviteId)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error canceling invite:', error);
      throw new Error('Failed to cancel invite');
    }
  }

  revalidatePath('/dashboard');
  return { success: true };
}
