'use client';

import { Logo } from '@/components/Logo';

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
