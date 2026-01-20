'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Download,
  ExternalLink,
  Sparkles,
  Zap,
  Users,
  Crown,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Section } from '@/components/layout/AppLayout';
import { useUser } from '@/store/unifiedStore';
import { cn } from '@/lib/utils';
import { SPRING } from '@/lib/motion/springs';

type SubscriptionTier = 'free' | 'pro' | 'teams';

type Invoice = {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  pdfUrl: string;
};

export default function BillingPage() {
  const { user } = useUser();

  // Mock subscription data - replace with Firestore integration later
  const [subscription] = useState<{
    tier: SubscriptionTier;
    billingCycle: 'monthly' | 'yearly';
    nextBillingDate: string | null;
    paymentMethod: {
      type: 'card' | 'paypal' | null;
      last4: string | null;
      brand: string | null;
    };
  }>({
    tier: 'free',
    billingCycle: 'monthly',
    nextBillingDate: null,
    paymentMethod: {
      type: null,
      last4: null,
      brand: null,
    },
  });

  // Mock invoice history
  const [invoices] = useState<Invoice[]>([
    // Empty for free users - will populate when subscription is active
  ]);

  const handleUpgrade = () => {
    // TODO: Integrate with Stripe checkout
    console.log('Navigate to upgrade flow');
  };

  const handleManageSubscription = () => {
    // TODO: Integrate with Stripe billing portal
    console.log('Open Stripe billing portal');
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    console.log('Download invoice:', invoiceId);
  };

  if (!user) return null;

  const isFreeTier = subscription.tier === 'free';
  const isProTier = subscription.tier === 'pro';
  const isTeamsTier = subscription.tier === 'teams';

  return (
    <div className="space-y-6 md:space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <Section delay={0} spacing="tight">
        <h1 className="h2 text-navy">Billing & Subscription</h1>
        <p className="text-rich-black/60 mt-2">
          Manage your subscription and billing information
        </p>
      </Section>

      {/* Current Plan */}
      <Section delay={0.1} spacing="normal">
        <Card variant="glass" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isFreeTier && <Sparkles size={20} className="text-grey" />}
              {isProTier && <Zap size={20} className="text-yellow" />}
              {isTeamsTier && <Crown size={20} className="text-purple" />}
              Current Plan
            </CardTitle>
            <CardDescription>
              {isFreeTier && "You're on the free plan"}
              {isProTier && "You're on Aptly Pro"}
              {isTeamsTier && "You're on Aptly Teams"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="space-y-4">
                {/* Plan Badge */}
                <div>
                  <div
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-lg',
                      isFreeTier && 'bg-light-grey text-grey',
                      isProTier && 'bg-yellow text-navy',
                      isTeamsTier && 'bg-gradient-to-r from-purple to-navy text-white'
                    )}
                  >
                    {isFreeTier && <Sparkles size={18} />}
                    {isProTier && <Zap size={18} />}
                    {isTeamsTier && <Crown size={18} />}
                    {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}
                    {!isFreeTier && (
                      <span className="text-sm opacity-90">
                        • {subscription.billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Plan Details */}
                <div className="space-y-2">
                  {!isFreeTier && (
                    <>
                      <div className="flex items-center gap-2 text-rich-black/70">
                        <Calendar size={16} />
                        <span className="text-sm">
                          Next billing: {subscription.nextBillingDate || 'N/A'}
                        </span>
                      </div>
                      {subscription.paymentMethod.type && (
                        <div className="flex items-center gap-2 text-rich-black/70">
                          <CreditCard size={16} />
                          <span className="text-sm">
                            {subscription.paymentMethod.brand} ending in {subscription.paymentMethod.last4}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {isFreeTier && (
                    <p className="text-sm text-rich-black/60">
                      Upgrade to unlock advanced features and unlimited practice
                    </p>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div>
                {isFreeTier ? (
                  <Button variant="primary" onClick={handleUpgrade} rightIcon={<ArrowRight size={18} />}>
                    Upgrade
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={handleManageSubscription}
                    rightIcon={<ExternalLink size={18} />}
                  >
                    Manage
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* Plan Comparison (only show for free users) */}
      {isFreeTier && (
        <Section delay={0.2} spacing="normal">
          <h2 className="text-xl font-semibold text-navy mb-4">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Pro Plan */}
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              transition={SPRING.gentle}
            >
              <Card variant="elevated" padding="lg" className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="flex items-center gap-2">
                      <Zap size={20} className="text-yellow" />
                      Pro
                    </CardTitle>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-navy">$19</div>
                      <div className="text-xs text-rich-black/60">per month</div>
                    </div>
                  </div>
                  <CardDescription>For serious learners</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    'Unlimited practice sessions',
                    'Advanced AI coach',
                    'Priority support',
                    'Custom study schedules',
                    'Detailed analytics',
                    'Offline mode',
                  ].map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 size={18} className="text-success flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-rich-black/80">{feature}</span>
                    </div>
                  ))}
                </CardContent>
                <CardFooter>
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleUpgrade}
                    rightIcon={<ArrowRight size={18} />}
                  >
                    Upgrade to Pro
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>

            {/* Teams Plan */}
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              transition={SPRING.gentle}
            >
              <Card variant="gradient" padding="lg" className="h-full border border-purple/20">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="flex items-center gap-2">
                      <Users size={20} className="text-purple" />
                      Teams
                    </CardTitle>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-navy">$49</div>
                      <div className="text-xs text-rich-black/60">per month</div>
                    </div>
                  </div>
                  <CardDescription>For training programs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    'Everything in Pro',
                    'Up to 25 team members',
                    'Admin dashboard',
                    'Team progress tracking',
                    'Custom content library',
                    'Dedicated account manager',
                  ].map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 size={18} className="text-purple flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-rich-black/80">{feature}</span>
                    </div>
                  ))}
                </CardContent>
                <CardFooter>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={handleUpgrade}
                    rightIcon={<ArrowRight size={18} />}
                  >
                    Upgrade to Teams
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </div>
        </Section>
      )}

      {/* Payment Method (only show for paid users) */}
      {!isFreeTier && subscription.paymentMethod.type && (
        <Section delay={0.3} spacing="normal">
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard size={20} className="text-teal" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-light-grey/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <CreditCard size={24} className="text-navy" />
                  </div>
                  <div>
                    <p className="font-medium text-navy">
                      {subscription.paymentMethod.brand} ending in {subscription.paymentMethod.last4}
                    </p>
                    <p className="text-sm text-rich-black/60">Expires 12/2027</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleManageSubscription}
                >
                  Update
                </Button>
              </div>
            </CardContent>
          </Card>
        </Section>
      )}

      {/* Invoice History (only show for paid users) */}
      {!isFreeTier && (
        <Section delay={0.4} spacing="normal">
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download size={20} className="text-teal" />
                Invoice History
              </CardTitle>
              <CardDescription>Download past invoices for your records</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-light-grey rounded-full flex items-center justify-center mx-auto mb-4">
                    <Download size={24} className="text-grey" />
                  </div>
                  <p className="text-rich-black/60">No invoices yet</p>
                  <p className="text-sm text-rich-black/40 mt-1">
                    Your invoices will appear here after your first billing cycle
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 rounded-xl hover:bg-light-grey/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full',
                            invoice.status === 'paid' && 'bg-success',
                            invoice.status === 'pending' && 'bg-warning',
                            invoice.status === 'failed' && 'bg-error'
                          )}
                        />
                        <div>
                          <p className="font-medium text-navy">{invoice.date}</p>
                          <p className="text-sm text-rich-black/60">
                            ${invoice.amount.toFixed(2)} • {invoice.status}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadInvoice(invoice.id)}
                        rightIcon={<Download size={16} />}
                      >
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Section>
      )}

      {/* Billing Info Note */}
      <Section delay={0.5} spacing="tight">
        <div className="flex items-start gap-3 p-4 bg-teal/5 border border-teal/20 rounded-xl">
          <AlertCircle size={20} className="text-teal flex-shrink-0 mt-0.5" />
          <div className="text-sm text-rich-black/70">
            <p className="font-medium text-navy mb-1">Secure Billing</p>
            <p>
              All payments are processed securely through Stripe. We never store your payment
              information on our servers.
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}
