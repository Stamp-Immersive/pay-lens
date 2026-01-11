import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { inviteId } = body;

    if (!inviteId) {
      return NextResponse.json({ success: false, error: 'Missing inviteId' }, { status: 400 });
    }

    // Use admin client to bypass RLS
    const supabase = createAdminClient();

    // Get the invite and org slug
    const { data: invite, error: fetchError } = await supabase
      .from('organization_members')
      .select('id, organization_id, profile_id, organizations(slug)')
      .eq('id', inviteId)
      .eq('profile_id', user.id)
      .is('accepted_at', null)
      .single();

    if (fetchError || !invite) {
      console.log('Invite not found:', { inviteId, userId: user.id, fetchError });
      return NextResponse.json({ success: false, error: 'Invite not found' }, { status: 404 });
    }

    // Accept the invite by setting accepted_at
    const { data: updated, error: updateError } = await supabase
      .from('organization_members')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', inviteId)
      .select('id, accepted_at')
      .single();

    if (updateError) {
      console.error('Failed to update invite:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to accept invite' }, { status: 500 });
    }

    if (!updated || !updated.accepted_at) {
      console.error('Update did not set accepted_at:', updated);
      return NextResponse.json({ success: false, error: 'Update failed silently' }, { status: 500 });
    }

    console.log('Invite accepted successfully:', { inviteId, orgId: invite.organization_id, accepted_at: updated.accepted_at });

    const org = invite.organizations as unknown as { slug: string } | null;
    return NextResponse.json({ success: true, orgSlug: org?.slug });
  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
