import { cn } from '@/lib/utils';
import { stackSansNotch } from '@/lib/fonts';

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
        stackSansNotch.className,
        'bg-gradient-to-br from-zinc-900 via-zinc-500 to-zinc-400 bg-clip-text text-transparent',
        sizeClasses[size],
        className
      )}
    >
      PayAdjust
    </span>
  );
}
