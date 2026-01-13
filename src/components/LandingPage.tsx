'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { ArrowRight, Building2, CheckCircle2, Clock, FileText, PiggyBank, Shield, Users } from 'lucide-react';

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
                Modern payroll that{' '}
                <span className="bg-gradient-to-r from-zinc-600 to-zinc-400 bg-clip-text text-transparent">
                  empowers your team
                </span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Give your employees visibility into their pay before payday. Reduce payroll queries, boost engagement, and streamline pension adjustments.
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
                  onClick={() => document.getElementById('benefits')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="benefits" className="py-20 bg-white dark:bg-zinc-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-100">
                Benefits for everyone
              </h2>
              <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                A better payroll experience for employers and employees alike
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
              {/* Employer Benefits */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-900 dark:bg-zinc-700">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                    For Employers
                  </h3>
                </div>
                <ul className="space-y-4">
                  <BenefitItem text="Reduce payroll queries with transparent payslip previews" />
                  <BenefitItem text="Streamline pension contribution changes before processing" />
                  <BenefitItem text="Export BACS-ready payment files in seconds" />
                  <BenefitItem text="Manage multiple organizations from one dashboard" />
                  <BenefitItem text="Full UK tax and NI compliance built in" />
                </ul>
              </div>

              {/* Employee Benefits */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-900 dark:bg-zinc-700">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                    For Employees
                  </h3>
                </div>
                <ul className="space-y-4">
                  <BenefitItem text="Preview payslips 7 days before payday" />
                  <BenefitItem text="Adjust pension contributions with real-time tax impact" />
                  <BenefitItem text="Understand exactly how pay is calculated" />
                  <BenefitItem text="Access payslip history anytime" />
                  <BenefitItem text="No more waiting to see deduction changes" />
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-100">
                How it works
              </h2>
              <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                Simple setup, powerful payroll management
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureCard
                icon={Users}
                title="Add Employees"
                description="Invite your team via email. They'll get access to their personalized dashboard."
              />
              <FeatureCard
                icon={FileText}
                title="Generate Payslips"
                description="Create payroll periods and auto-generate payslips with accurate UK tax calculations."
              />
              <FeatureCard
                icon={Clock}
                title="Preview Window"
                description="Employees review their payslip and make pension adjustments before you process."
              />
              <FeatureCard
                icon={Shield}
                title="Approve & Pay"
                description="Review changes, approve the payroll, and export BACS files for payment."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-zinc-900 dark:bg-zinc-800 rounded-2xl p-8 sm:p-12 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Ready to modernize your payroll?
              </h2>
              <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
                Set up your organization in minutes. Start giving your team the payroll transparency they deserve.
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

function BenefitItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
      <span className="text-zinc-700 dark:text-zinc-300">{text}</span>
    </li>
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
