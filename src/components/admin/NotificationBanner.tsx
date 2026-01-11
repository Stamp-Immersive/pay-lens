'use client';

import { AlertCircle, Users, FileText, CreditCard } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { type AdminNotificationDetails } from '@/lib/actions/organizations';

type NotificationBannerProps = {
  details: AdminNotificationDetails;
  page: 'employees' | 'payroll' | 'payments';
};

export function NotificationBanner({ details, page }: NotificationBannerProps) {
  const notifications: { icon: React.ElementType; title: string; description: string }[] = [];

  if (page === 'employees') {
    if (details.employees.needingSetup > 0) {
      notifications.push({
        icon: Users,
        title: `${details.employees.needingSetup} employee${details.employees.needingSetup > 1 ? 's' : ''} need setup`,
        description: 'These employees have joined but don\'t have payroll details configured yet.',
      });
    }
    if (details.employees.pendingInvites > 0) {
      notifications.push({
        icon: Users,
        title: `${details.employees.pendingInvites} pending invite${details.employees.pendingInvites > 1 ? 's' : ''}`,
        description: 'Invitations have been sent but not yet accepted.',
      });
    }
  }

  if (page === 'payroll') {
    if (details.payroll.draftPeriods > 0) {
      notifications.push({
        icon: FileText,
        title: `${details.payroll.draftPeriods} draft period${details.payroll.draftPeriods > 1 ? 's' : ''}`,
        description: 'Payroll periods in draft need payslips generated and moved to preview.',
      });
    }
    if (details.payroll.expiredPreviewPeriods > 0) {
      notifications.push({
        icon: AlertCircle,
        title: `${details.payroll.expiredPreviewPeriods} period${details.payroll.expiredPreviewPeriods > 1 ? 's' : ''} past deadline`,
        description: 'The adjustment deadline has passed. These periods should be approved for payment.',
      });
    }
  }

  if (page === 'payments') {
    if (details.payments.readyForPayment > 0) {
      notifications.push({
        icon: CreditCard,
        title: `${details.payments.readyForPayment} period${details.payments.readyForPayment > 1 ? 's' : ''} ready for payment`,
        description: 'Approved payroll periods are waiting to be processed and paid.',
      });
    }
  }

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {notifications.map((notification, index) => (
        <Alert key={index} variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <notification.icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">{notification.title}</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            {notification.description}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
