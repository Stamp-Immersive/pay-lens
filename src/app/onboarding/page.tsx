'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Loader2, Check, X, Mail } from 'lucide-react';
import { createOrganization } from '@/lib/actions/organizations';
import { getMyPendingInvites, declineInvite, type PendingInvite } from '@/lib/actions/invites';
import { Logo } from '@/components/Logo';
import { SignOutButton } from '@/components/auth/SignOutButton';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<'loading' | 'invites' | 'welcome' | 'create'>('loading');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  });

  useEffect(() => {
    loadInvites();
  }, []);

  async function loadInvites() {
    try {
      const data = await getMyPendingInvites();
      setInvites(data);
      setStep(data.length > 0 ? 'invites' : 'welcome');
    } catch (err) {
      console.error('Failed to load invites:', err);
      setStep('welcome');
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
      if (result.success && result.orgSlug) {
        window.location.href = `/dashboard/${result.orgSlug}/employee`;
      } else {
        window.location.href = '/dashboard';
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
      const newInvites = invites.filter((i) => i.id !== inviteId);
      setInvites(newInvites);
      if (newInvites.length === 0) {
        setStep('welcome');
      }
    } catch (err) {
      console.error('Failed to decline invite:', err);
    } finally {
      setProcessing(null);
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await createOrganization(formData.name, formData.slug);
      if (result.success && result.org) {
        window.location.href = `/dashboard/${result.org.slug}/admin`;
      } else {
        setError(result.error || 'Failed to create organization');
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <SignOutButton />
      </div>
      <div className="w-full max-w-md">
        {step === 'invites' && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Mail className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl">You have been invited!</CardTitle>
                <CardDescription>
                  Accept an invitation to join an organization.
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
              <Button variant="ghost" onClick={() => setStep('welcome')}>
                Or create your own organization
              </Button>
            </div>
          </div>
        )}

        {step === 'welcome' && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Building2 className="h-6 w-6" />
              </div>
              <Logo size="lg" className="block mx-auto mb-2" />
              <CardDescription>
                Get started by creating your organization or wait for an invitation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => setStep('create')} className="w-full">
                Create Organization
              </Button>
              <div className="text-center text-sm text-zinc-500">
                <p>
                  If you were invited to an organization, ask your administrator
                  to add you using your email address.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'create' && (
          <Card>
            <CardHeader>
              <CardTitle>Create Organization</CardTitle>
              <CardDescription>
                Set up your company to start managing payroll.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({
                        name: e.target.value,
                        slug: generateSlug(e.target.value),
                      });
                    }}
                    placeholder="Acme Inc."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <div className="flex items-center">
                    <span className="text-sm text-zinc-500 mr-1">payadjust.com/</span>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({ ...formData, slug: e.target.value.toLowerCase() })
                      }
                      placeholder="acme"
                      required
                      pattern="[a-z0-9-]+"
                    />
                  </div>
                  <p className="text-xs text-zinc-500">
                    Only lowercase letters, numbers, and hyphens.
                  </p>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('welcome')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
