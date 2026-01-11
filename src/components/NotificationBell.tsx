'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Mail, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { acceptInvite, declineInvite, type PendingInvite } from '@/lib/actions/invites';

type NotificationBellProps = {
  pendingInvites: PendingInvite[];
};

export function NotificationBell({ pendingInvites }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [localInvites, setLocalInvites] = useState(pendingInvites);

  // Sync local state when props change (e.g., after navigation)
  useEffect(() => {
    setLocalInvites(pendingInvites);
  }, [pendingInvites]);

  const totalCount = localInvites.length;

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative">
          <Button variant="outline" size="icon" asChild>
            <span>
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </span>
          </Button>
          {totalCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center rounded-full text-xs font-bold px-1 bg-red-500 text-white pointer-events-none">
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <h3 className="font-semibold">Notifications</h3>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {localInvites.length === 0 ? (
            <div className="px-4 py-8 text-center text-zinc-500">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {localInvites.map((invite) => (
                <div key={invite.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        Organization Invitation
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                        <span className="font-medium">{invite.organization.name}</span>
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Role: <span className="capitalize">{invite.role}</span>
                        {invite.inviter && (
                          <> &middot; From {invite.inviter.full_name || invite.inviter.email}</>
                        )}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs"
                          onClick={() => handleAccept(invite.id)}
                          disabled={loading === invite.id}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleDecline(invite.id)}
                          disabled={loading === invite.id}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {localInvites.length > 0 && (
          <div className="border-t px-4 py-2">
            <Button
              variant="ghost"
              className="w-full text-sm h-8"
              onClick={() => {
                setOpen(false);
                router.push('/invites');
              }}
            >
              View all invitations
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
