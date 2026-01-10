'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, FileText, CreditCard } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';

export function AdminNav() {
  const pathname = usePathname();
  const { organization } = useOrganization();

  const navItems = [
    {
      title: 'Dashboard',
      href: `/dashboard/${organization.slug}/admin`,
      icon: LayoutDashboard,
    },
    {
      title: 'Employees',
      href: `/dashboard/${organization.slug}/admin/employees`,
      icon: Users,
    },
    {
      title: 'Payroll',
      href: `/dashboard/${organization.slug}/admin/payroll`,
      icon: FileText,
    },
    {
      title: 'Payments',
      href: `/dashboard/${organization.slug}/admin/payments`,
      icon: CreditCard,
    },
  ];

  return (
    <nav className="flex gap-1 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-4">
      {navItems.map((item) => {
        const isActive = pathname === item.href ||
          (item.href !== `/dashboard/${organization.slug}/admin` && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-800'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
