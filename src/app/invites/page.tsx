'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Check, X, Loader2, Mail } from 'lucide-react';
import { getMyPendingInvites, declineInvite, type PendingInvite } from '@/lib/actions/invites';
import { Logo } from '@/components/Logo';
import { SignOutButton } from '@/components/auth/SignOutButton';

export default function InvitesPage() {
  const router = useRouter();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadInvites();
  }, []);

  async function loadInvites() {
    try {
      const data = await getMyPendingInvites();
      setInvites(data);
    } catch (err) {
      console.error('Failed to load invites:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(inviteId: string) {
    setProcessing(inviteId);
    try {
      const response = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId }),
      });
      const result = await response.json();
      if (result.success) {
        if (result.orgSlug) {
          window.location.href = `/dashboard/${result.orgSlug}/employee`;
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        console.error('Failed to accept invite:', result.error);
        setProcessing(null);
      }
    } catch (err) {
      console.error('Failed to accept invite:', err);
      setProcessing(null);
    }
  }

  async function handleDecline(inviteId: string) {
    setProcessing(inviteId);
    try {
      await declineInvite(inviteId);
      setInvites(invites.filter((i) => i.id !== inviteId));
    } catch (err) {
      console.error('Failed to decline invite:', err);
    } finally {
      setProcessing(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="absolute top-4 right-4">
          <SignOutButton />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Logo size="lg" className="block mx-auto mb-4" />
            <CardTitle>No Pending Invites</CardTitle>
            <CardDescription>
              You don't have any pending organization invitations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <SignOutButton />
      </div>
      <div className="w-full max-w-md">
        <div className="space-y-4">
          <Card>
            <CardHeader className="text-center">
              <Logo size="lg" className="block mx-auto mb-2" />
              <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Mail className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl">You have been invited!</CardTitle>
              <CardDescription>
                Accept an invitation to join an organization and start managing your payroll.
              </CardDescription>
            </CardHeader>
          </Card>

          {invites.map((invite) => (
            <Card key={invite.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{invite.organization.name}</CardTitle>
                    <CardDescription>
                      {invite.inviter?.full_name || invite.inviter?.email || 'Someone'} invited you
                      as {invite.role === 'admin' ? 'an admin' : 'an employee'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAccept(invite.id)}
                    disabled={processing === invite.id}
                    className="flex-1"
                  >
                    {processing === invite.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Accept
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDecline(invite.id)}
                    disabled={processing === invite.id}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="text-center pt-4">
            <Button variant="ghost" onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
