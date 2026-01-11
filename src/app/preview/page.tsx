'use client';

import { Logo } from '@/components/Logo';
import { useRef, useState } from 'react';

// Simple CSS-only hover glow button
function SimpleGlowButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="relative px-6 py-3 bg-zinc-900 text-white rounded-lg overflow-hidden transition-all duration-300 hover:shadow-[0_0_20px_rgba(161,161,170,0.4)] hover:bg-zinc-800">
      {children}
    </button>
  );
}

// Dynamic mouse-tracking spotlight button
function SpotlightButton({ children }: { children: React.ReactNode }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative px-6 py-3 bg-zinc-900 text-white rounded-lg overflow-hidden transition-colors duration-300 hover:bg-zinc-800"
    >
      {isHovered && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(120px circle at ${position.x}px ${position.y}px, rgba(161,161,170,0.3), transparent 40%)`,
          }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

// Dynamic spotlight card (for larger elements)
function SpotlightCard({ children }: { children: React.ReactNode }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative p-6 bg-zinc-900 text-white rounded-xl overflow-hidden cursor-pointer"
    >
      {isHovered && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(200px circle at ${position.x}px ${position.y}px, rgba(161,161,170,0.15), transparent 40%)`,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default function PreviewPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
      <div className="max-w-2xl mx-auto space-y-12">
        <h1 className="text-xl text-zinc-500 mb-8">Logo Preview</h1>

        {/* Light background */}
        <div className="space-y-6 p-8 bg-white rounded-xl border">
          <p className="text-sm text-zinc-400 mb-4">Light background</p>
          <div className="space-y-4">
            <div><Logo size="sm" /> <span className="text-zinc-400 text-sm ml-4">sm</span></div>
            <div><Logo size="md" /> <span className="text-zinc-400 text-sm ml-4">md</span></div>
            <div><Logo size="lg" /> <span className="text-zinc-400 text-sm ml-4">lg</span></div>
          </div>
        </div>

        {/* Dark background */}
        <div className="space-y-6 p-8 bg-zinc-900 rounded-xl">
          <p className="text-sm text-zinc-500 mb-4">Dark background</p>
          <div className="space-y-4">
            <div><Logo size="sm" /> <span className="text-zinc-500 text-sm ml-4">sm</span></div>
            <div><Logo size="md" /> <span className="text-zinc-500 text-sm ml-4">md</span></div>
            <div><Logo size="lg" /> <span className="text-zinc-500 text-sm ml-4">lg</span></div>
          </div>
        </div>

        {/* Hover Effects Demo */}
        <div className="space-y-8">
          <h2 className="text-xl text-zinc-500">Hover Effects Demo</h2>

          {/* Simple CSS Glow */}
          <div className="space-y-4 p-8 bg-zinc-950 rounded-xl">
            <p className="text-sm text-zinc-500 mb-4">1. Simple CSS Glow (static, centered)</p>
            <div className="flex gap-4 flex-wrap">
              <SimpleGlowButton>Button</SimpleGlowButton>
              <SimpleGlowButton>Click Me</SimpleGlowButton>
              <SimpleGlowButton>Submit</SimpleGlowButton>
            </div>
          </div>

          {/* Dynamic Spotlight */}
          <div className="space-y-4 p-8 bg-zinc-950 rounded-xl">
            <p className="text-sm text-zinc-500 mb-4">2. Dynamic Spotlight (follows cursor)</p>
            <div className="flex gap-4 flex-wrap">
              <SpotlightButton>Button</SpotlightButton>
              <SpotlightButton>Click Me</SpotlightButton>
              <SpotlightButton>Submit</SpotlightButton>
            </div>
          </div>

          {/* Spotlight on Cards */}
          <div className="space-y-4 p-8 bg-zinc-950 rounded-xl">
            <p className="text-sm text-zinc-500 mb-4">3. Dynamic Spotlight on Cards</p>
            <div className="grid grid-cols-2 gap-4">
              <SpotlightCard>
                <h3 className="font-semibold mb-2">Card Title</h3>
                <p className="text-sm text-zinc-400">Move your cursor around to see the spotlight effect.</p>
              </SpotlightCard>
              <SpotlightCard>
                <h3 className="font-semibold mb-2">Another Card</h3>
                <p className="text-sm text-zinc-400">The glow follows your mouse position.</p>
              </SpotlightCard>
            </div>
          </div>
        </div>

        {/* In context - header style */}
        <div className="space-y-6 p-8 bg-white rounded-xl border">
          <p className="text-sm text-zinc-400 mb-4">In header context</p>
          <div className="flex items-center gap-3">
            <Logo />
            <span className="px-2 py-1 bg-zinc-100 rounded text-sm text-zinc-600">Acme Inc</span>
          </div>
        </div>
      </div>
    </div>
  );
}
