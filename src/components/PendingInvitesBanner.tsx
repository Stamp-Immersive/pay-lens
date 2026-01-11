'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Check, X, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { acceptInvite, declineInvite, type PendingInvite } from '@/lib/actions/invites';

type PendingInvitesBannerProps = {
  invites: PendingInvite[];
};

export function PendingInvitesBanner({ invites }: PendingInvitesBannerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [localInvites, setLocalInvites] = useState(invites);

  // Sync local state when props change (e.g., after navigation)
  useEffect(() => {
    setLocalInvites(invites);
  }, [invites]);

  if (localInvites.length === 0) {
    return null;
  }

  async function handleAccept(inviteId: string) {
    setLoading(inviteId);
    try {
      const result = await acceptInvite(inviteId);
      setLocalInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
      // Use hard navigation to bypass Next.js Router Cache
      if (result.orgSlug) {
        window.location.href = `/dashboard/${result.orgSlug}/employee`;
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to accept invite:', error);
    } finally {
      setLoading(null);
    }
  }

  async function handleDecline(inviteId: string) {
    setLoading(inviteId);
    try {
      await declineInvite(inviteId);
      setLocalInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
      router.refresh();
    } catch (error) {
      console.error('Failed to decline invite:', error);
    } finally {
      setLoading(null);
    }
  }

  // Show detailed view for 1-2 invites, summarized view for more
  if (localInvites.length <= 2) {
    return (
      <div className="space-y-3 mb-6">
        {localInvites.map((invite) => (
          <Alert
            key={invite.id}
            variant="default"
            className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950"
          >
            <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-800 dark:text-blue-200">
              You&apos;ve been invited to {invite.organization.name}
            </AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              <p className="mb-3">
                {invite.inviter
                  ? `${invite.inviter.full_name || invite.inviter.email} invited you as ${invite.role === 'admin' ? 'an admin' : 'an employee'}.`
                  : `You've been invited to join as ${invite.role === 'admin' ? 'an admin' : 'an employee'}.`}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleAccept(invite.id)}
                  disabled={loading === invite.id}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDecline(invite.id)}
                  disabled={loading === invite.id}
                >
                  <X className="h-4 w-4 mr-1" />
                  Decline
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ))}
      </div>
    );
  }

  // Summarized view for 3+ invites
  return (
    <Alert
      variant="default"
      className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 mb-6"
    >
      <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="text-blue-800 dark:text-blue-200">
        You have {localInvites.length} pending invitations
      </AlertTitle>
      <AlertDescription className="text-blue-700 dark:text-blue-300">
        <p className="mb-3">
          You&apos;ve been invited to join {localInvites.length} organizations.
        </p>
        <Button
          size="sm"
          variant="default"
          onClick={() => router.push('/invites')}
        >
          View invitations
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}
