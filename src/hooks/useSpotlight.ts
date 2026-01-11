'use client';

import { useState, useCallback, useRef } from 'react';

interface SpotlightState {
  x: number;
  y: number;
  isHovered: boolean;
}

interface UseSpotlightReturn {
  ref: React.RefObject<HTMLElement | null>;
  spotlightStyle: React.CSSProperties | undefined;
  handlers: {
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
}

interface UseSpotlightOptions {
  size?: number;
  opacity?: number;
  color?: string;
}

export function useSpotlight(
  options: UseSpotlightOptions = {}
): UseSpotlightReturn {
  const { size = 120, opacity = 0.25, color = '161,161,170' } = options;
  const ref = useRef<HTMLElement | null>(null);

  const [state, setState] = useState<SpotlightState>({
    x: 0,
    y: 0,
    isHovered: false,
  });

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setState((prev) => ({
      ...prev,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }));
  }, []);

  const onMouseEnter = useCallback(() => {
    setState((prev) => ({ ...prev, isHovered: true }));
  }, []);

  const onMouseLeave = useCallback(() => {
    setState((prev) => ({ ...prev, isHovered: false }));
  }, []);

  const spotlightStyle: React.CSSProperties | undefined = state.isHovered
    ? {
        position: 'absolute' as const,
        inset: 0,
        pointerEvents: 'none' as const,
        background: `radial-gradient(${size}px circle at ${state.x}px ${state.y}px, rgba(${color},${opacity}), transparent 40%)`,
        zIndex: 1,
      }
    : undefined;

  return {
    ref,
    spotlightStyle,
    handlers: {
      onMouseMove,
      onMouseEnter,
      onMouseLeave,
    },
  };
}
