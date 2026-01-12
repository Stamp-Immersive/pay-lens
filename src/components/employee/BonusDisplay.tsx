'use client';

import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Gift, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

type Bonus = {
  id: string;
  description: string;
  amount: number;
};

type BonusDisplayProps = {
  bonuses: Bonus[];
  legacyBonus?: number;
  showConfetti?: boolean;
  className?: string;
};

export function BonusDisplay({ bonuses, legacyBonus = 0, showConfetti = true, className }: BonusDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const hasBonuses = bonuses.length > 0 || legacyBonus > 0;
  const totalBonus = bonuses.reduce((sum, b) => sum + b.amount, 0) + (bonuses.length === 0 ? legacyBonus : 0);

  // Trigger confetti when bonuses are first displayed
  useEffect(() => {
    if (!hasBonuses || !showConfetti || hasTriggeredConfetti) return;

    const timer = setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;

        // Gold/amber colored confetti for bonuses
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { x, y },
          colors: ['#f59e0b', '#fbbf24', '#fcd34d', '#fef3c7', '#d97706'],
          ticks: 100,
          gravity: 1.2,
          scalar: 0.8,
          shapes: ['circle', 'square'],
        });
      }
      setHasTriggeredConfetti(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [hasBonuses, showConfetti, hasTriggeredConfetti]);

  // Trigger mini confetti on hover
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (containerRef.current && hasBonuses) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;

      confetti({
        particleCount: 15,
        spread: 30,
        origin: { x, y },
        colors: ['#f59e0b', '#fbbf24', '#fcd34d'],
        ticks: 50,
        gravity: 1.5,
        scalar: 0.6,
        shapes: ['circle'],
      });
    }
  };

  if (!hasBonuses) return null;

  const displayBonuses = bonuses.length > 0 ? bonuses : [{ id: 'legacy', description: 'Bonus', amount: legacyBonus }];

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden rounded-lg border-2 transition-all duration-300',
        isHovered
          ? 'border-amber-400 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/50 dark:to-yellow-950/50 shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30'
          : 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30',
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Sparkle background effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn(
          'absolute top-1 right-2 transition-all duration-300',
          isHovered ? 'opacity-100 animate-pulse' : 'opacity-50'
        )}>
          <Sparkles className="h-4 w-4 text-amber-400" />
        </div>
        <div className={cn(
          'absolute bottom-1 left-2 transition-all duration-500 delay-100',
          isHovered ? 'opacity-100 animate-pulse' : 'opacity-30'
        )}>
          <Sparkles className="h-3 w-3 text-yellow-400" />
        </div>
      </div>

      <div className="relative p-3 space-y-2">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className={cn(
            'p-1.5 rounded-full transition-all duration-300',
            isHovered
              ? 'bg-amber-400 text-white scale-110'
              : 'bg-amber-200 text-amber-700 dark:bg-amber-800 dark:text-amber-200'
          )}>
            <Gift className="h-4 w-4" />
          </div>
          <span className={cn(
            'font-semibold transition-colors duration-300',
            isHovered
              ? 'text-amber-700 dark:text-amber-300'
              : 'text-amber-600 dark:text-amber-400'
          )}>
            Bonuses
          </span>
          <div className="flex-1" />
          <span className={cn(
            'text-lg font-bold transition-all duration-300',
            isHovered
              ? 'text-amber-700 dark:text-amber-300 scale-105'
              : 'text-amber-600 dark:text-amber-400'
          )}>
            +{formatCurrency(totalBonus)}
          </span>
        </div>

        {/* Individual bonuses */}
        {displayBonuses.length > 1 && (
          <div className="space-y-1 pt-1 border-t border-amber-200/50 dark:border-amber-700/50">
            {displayBonuses.map((bonus) => (
              <div
                key={bonus.id}
                className={cn(
                  'flex justify-between items-center text-sm transition-all duration-200 pl-2',
                  isHovered ? 'translate-x-1' : ''
                )}
              >
                <span className="text-amber-700/80 dark:text-amber-300/80">{bonus.description}</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  +{formatCurrency(bonus.amount)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Single bonus description */}
        {displayBonuses.length === 1 && displayBonuses[0].description !== 'Bonus' && (
          <p className="text-sm text-amber-700/80 dark:text-amber-300/80 pl-8">
            {displayBonuses[0].description}
          </p>
        )}
      </div>
    </div>
  );
}
