'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function PayrollError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Payroll error:', error);
  }, [error]);

  return (
    <Card className="border-red-200 dark:border-red-900">
      <CardHeader>
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5" />
          <CardTitle>Something went wrong</CardTitle>
        </div>
        <CardDescription>
          An error occurred while loading the payroll page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-red-50 dark:bg-red-950 p-4 rounded-md">
          <p className="text-sm font-mono text-red-800 dark:text-red-200">
            {error.message || 'Unknown error'}
          </p>
          {error.digest && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        <Button onClick={reset}>Try again</Button>
      </CardContent>
    </Card>
  );
}
