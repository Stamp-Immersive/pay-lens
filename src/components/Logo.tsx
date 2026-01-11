import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ size = 'md', className }: LogoProps) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  };

  return (
    <span
      className={cn(
        'font-[var(--font-stack-sans-notch)] bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent',
        sizeClasses[size],
        className
      )}
    >
      PayAdjust
    </span>
  );
}
