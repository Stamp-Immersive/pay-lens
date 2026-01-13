'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { ArrowRight, Calculator, Clock, Shield, Users } from 'lucide-react';

export function LandingPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo size="md" />
            <Button
              onClick={handleGoogleLogin}
              variant="outline"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="py-20 sm:py-32">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Take control of your{' '}
                <span className="bg-gradient-to-r from-zinc-600 to-zinc-400 bg-clip-text text-transparent">
                  payroll
                </span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Preview your payslip before payday. Adjust pension contributions and see the real-time impact on your take-home pay and tax savings.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={handleGoogleLogin}
                  size="lg"
                  className="text-base"
                  disabled={isLoading}
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-base"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-white dark:bg-zinc-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-100">
                How it works
              </h2>
              <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                Simple, transparent payroll management for modern teams
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureCard
                icon={Clock}
                title="Preview Window"
                description="See your payslip 7 days before payday with full breakdown of earnings and deductions."
              />
              <FeatureCard
                icon={Calculator}
                title="Real-time Calculator"
                description="Adjust your pension contribution and instantly see the impact on take-home pay and tax."
              />
              <FeatureCard
                icon={Shield}
                title="UK Tax Compliant"
                description="Accurate calculations for Income Tax, National Insurance, and salary sacrifice pensions."
              />
              <FeatureCard
                icon={Users}
                title="Multi-Organization"
                description="Manage payroll across multiple companies from a single dashboard."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-zinc-900 dark:bg-zinc-800 rounded-2xl p-8 sm:p-12 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Ready to get started?
              </h2>
              <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
                Join organizations using PayAdjust to give employees visibility and control over their pay.
              </p>
              <Button
                onClick={handleGoogleLogin}
                size="lg"
                className="mt-8 bg-white text-zinc-900 hover:bg-zinc-100"
                disabled={isLoading}
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Logo size="sm" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Payroll management for modern teams
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center p-6">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 mb-4">
        <Icon className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
        {title}
      </h3>
      <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}
