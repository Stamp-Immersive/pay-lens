import { NextRequest, NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase/server';

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

    const supabase = await createClient();

    // Get the invite and org slug
    const { data: invite, error: fetchError } = await supabase
      .from('organization_members')
      .select('id, organization_id, organizations(slug)')
      .eq('id', inviteId)
      .eq('profile_id', user.id)
      .is('accepted_at', null)
      .single();

    if (fetchError || !invite) {
      return NextResponse.json({ success: false, error: 'Invite not found' }, { status: 404 });
    }

    // Check if user is already an accepted member of this org
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', invite.organization_id)
      .eq('profile_id', user.id)
      .not('accepted_at', 'is', null)
      .neq('id', inviteId)
      .maybeSingle();

    if (existingMember) {
      // User already in org - delete this duplicate pending invite
      await supabase
        .from('organization_members')
        .delete()
        .eq('id', inviteId);
    } else {
      // Accept the invite normally
      const { error: updateError } = await supabase
        .from('organization_members')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', inviteId)
        .eq('profile_id', user.id);

      if (updateError) {
        return NextResponse.json({ success: false, error: 'Failed to accept invite' }, { status: 500 });
      }
    }

    const org = invite.organizations as unknown as { slug: string } | null;
    return NextResponse.json({ success: true, orgSlug: org?.slug });
  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
