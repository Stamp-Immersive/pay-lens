'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Building2, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getMyOrganizations, type UserOrganization } from '@/lib/actions/organizations';

export function OrganizationSwitcher() {
  const { organization, role, isAdmin } = useOrganization();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);

  useEffect(() => {
    getMyOrganizations().then(setOrganizations);
  }, []);

  const handleSwitch = (slug: string, newRole: string) => {
    startTransition(() => {
      if (newRole === 'owner' || newRole === 'admin') {
        router.push(`/dashboard/${slug}/admin`);
      } else {
        router.push(`/dashboard/${slug}/employee`);
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2"
          disabled={isPending}
        >
          <Building2 className="h-4 w-4" />
          {organization.name}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.organization.id}
            onClick={() => handleSwitch(org.organization.slug, org.role)}
            className="flex items-center justify-between"
          >
            <span className="truncate">{org.organization.name}</span>
            <span className="text-xs text-muted-foreground capitalize">
              {org.role}
            </span>
          </DropdownMenuItem>
        ))}
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push('/onboarding')}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Organization
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
