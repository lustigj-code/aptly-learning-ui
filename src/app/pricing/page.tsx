'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SPRING } from '@/lib/motion/springs';
import {
  Check,
  Sparkles,
  Users,
  BookOpen,
  MessageSquare,
  BarChart3,
  Shield,
  Zap,
  Award,
  ChevronDown,
  Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type BillingInterval = 'monthly' | 'yearly';

interface PricingTier {
  name: string;
  price: {
    monthly: number;
    yearly: number;
  };
  description: string;
  icon: React.ElementType;
  features: string[];
  highlighted?: boolean;
  cta: string;
  ctaLink: string;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    description: 'Perfect for trying out Aptly',
    icon: BookOpen,
    features: [
      '5 lessons per month',
      'Basic AI coach (limited)',
      'Progress tracking',
      'Community support',
      'Mobile app access',
    ],
    cta: 'Get Started Free',
    ctaLink: '/signup',
  },
  {
    name: 'Pro',
    price: { monthly: 49, yearly: 468 }, // $468/year = 20% savings
    description: 'For serious learners',
    icon: Sparkles,
    highlighted: true,
    features: [
      'Unlimited lessons',
      'Full AI coach access',
      'All courses & content',
      'Professional certificates',
      'Priority support',
      'Advanced analytics',
      'Personalized learning paths',
      'Exam readiness tracking',
      'Offline mode',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/signup?plan=pro',
  },
  {
    name: 'Teams',
    price: { monthly: 149, yearly: 1428 }, // 20% savings
    description: 'For teams & organizations',
    icon: Users,
    features: [
      'Everything in Pro',
      '5 team seats included',
      'Admin dashboard',
      'Team analytics',
      'Custom integrations',
      'Dedicated support',
      'SSO & advanced security',
      'Custom content upload',
      'Usage reports',
    ],
    cta: 'Contact Sales',
    ctaLink: '/signup?plan=teams',
  },
];

const faqs = [
  {
    question: 'Can I switch plans anytime?',
    answer:
      'Yes! You can upgrade, downgrade, or cancel your plan at any time. Changes take effect at the start of your next billing cycle.',
  },
  {
    question: 'Is there a free trial?',
    answer:
      'Pro and Teams plans come with a 14-day free trial. No credit card required to start. You can cancel anytime during the trial period.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards (Visa, Mastercard, American Express, Discover) and PayPal. Team plans also support ACH transfers and invoicing.',
  },
  {
    question: 'How does the AI coach work?',
    answer:
      'Our AI coach uses advanced language models to provide personalized tutoring, answer questions, and guide you through difficult concepts using Socratic methods. Pro users get unlimited access with faster response times.',
  },
  {
    question: 'Can I get a refund?',
    answer:
      'Yes! We offer a 30-day money-back guarantee. If you\'re not satisfied with Aptly, contact our support team within 30 days for a full refund.',
  },
  {
    question: 'What courses are included?',
    answer:
      'Pro and Teams plans include access to all courses, including Meta Social Media Marketing, Digital Marketing Fundamentals, and more. We add new courses regularly.',
  },
];

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-purple to-navy">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-navy/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-teal to-yellow bg-clip-text text-transparent">
                Aptly
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-white/80 hover:text-white transition-colors text-sm font-medium"
              >
                Sign In
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING.gentle}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...SPRING.gentle, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow/20 border border-yellow/30 text-yellow mb-6"
          >
            <Crown className="w-4 h-4" />
            <span className="text-sm font-medium">14-day free trial on Pro & Teams</span>
          </motion.div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Learn faster with{' '}
            <span className="bg-gradient-to-r from-teal to-yellow bg-clip-text text-transparent">
              AI-powered coaching
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto">
            Choose the perfect plan for your learning journey. Upgrade, downgrade, or cancel anytime.
          </p>
        </motion.div>
      </section>

      {/* Billing Toggle */}
      <section className="pb-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING.gentle, delay: 0.2 }}
          className="max-w-md mx-auto"
        >
          <div className="flex items-center justify-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-2">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={cn(
                'flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-200',
                billingInterval === 'monthly'
                  ? 'bg-white text-navy shadow-lg'
                  : 'text-white/70 hover:text-white'
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={cn(
                'flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-200 relative',
                billingInterval === 'yearly'
                  ? 'bg-white text-navy shadow-lg'
                  : 'text-white/70 hover:text-white'
              )}
            >
              Yearly
              <span className="absolute -top-2 -right-2 bg-yellow text-navy text-xs font-bold px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </motion.div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingTiers.map((tier, index) => {
              const Icon = tier.icon;
              const price =
                billingInterval === 'monthly' ? tier.price.monthly : tier.price.yearly / 12;
              const annualPrice = tier.price.yearly;

              return (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING.gentle, delay: 0.1 * index }}
                  className={cn(
                    'relative',
                    tier.highlighted && 'md:-mt-4 md:mb-4'
                  )}
                >
                  {tier.highlighted && (
                    <div className="absolute -top-5 left-0 right-0 flex justify-center">
                      <div className="bg-gradient-to-r from-yellow to-warning text-navy text-sm font-bold px-4 py-1.5 rounded-full shadow-lg">
                        Most Popular
                      </div>
                    </div>
                  )}

                  <Card
                    variant={tier.highlighted ? 'glass' : 'elevated'}
                    padding="lg"
                    className={cn(
                      'h-full flex flex-col',
                      tier.highlighted
                        ? 'border-2 border-yellow/50 shadow-[0_0_40px_rgba(255,222,0,0.2)]'
                        : 'border border-white/10'
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
                        tier.highlighted
                          ? 'bg-gradient-to-br from-yellow to-warning'
                          : 'bg-white/10'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-6 h-6',
                          tier.highlighted ? 'text-navy' : 'text-white'
                        )}
                      />
                    </div>

                    {/* Name & Description */}
                    <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                    <p className="text-white/60 text-sm mb-6">{tier.description}</p>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold text-white">
                          ${Math.floor(price)}
                        </span>
                        <span className="text-white/60">/month</span>
                      </div>
                      {billingInterval === 'yearly' && tier.price.yearly > 0 && (
                        <p className="text-sm text-white/50 mt-2">
                          ${annualPrice}/year • Save ${tier.price.monthly * 12 - annualPrice}
                        </p>
                      )}
                    </div>

                    {/* CTA Button */}
                    <Link href={tier.ctaLink} className="block mb-8">
                      <Button
                        variant={tier.highlighted ? 'celebration' : 'secondary'}
                        size="lg"
                        fullWidth
                      >
                        {tier.cta}
                      </Button>
                    </Link>

                    {/* Features */}
                    <div className="space-y-4 flex-1">
                      {tier.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-start gap-3">
                          <Check
                            className={cn(
                              'w-5 h-5 flex-shrink-0 mt-0.5',
                              tier.highlighted ? 'text-yellow' : 'text-teal'
                            )}
                          />
                          <span className="text-white/80 text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={SPRING.gentle}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Aptly combines cutting-edge AI with proven learning science to help you master new skills faster.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: MessageSquare,
                title: 'AI-Powered Coach',
                description:
                  'Get personalized tutoring and instant feedback from your AI learning companion.',
              },
              {
                icon: Zap,
                title: 'Adaptive Learning',
                description:
                  'Content automatically adjusts to your pace and skill level for optimal learning.',
              },
              {
                icon: Award,
                title: 'Earn Certificates',
                description:
                  'Receive professional certificates recognized by top employers.',
              },
              {
                icon: BarChart3,
                title: 'Track Progress',
                description:
                  'Visualize your learning journey with detailed analytics and mastery tracking.',
              },
              {
                icon: Shield,
                title: 'Proven Methods',
                description:
                  'Built on research-backed techniques like spaced repetition and mastery learning.',
              },
              {
                icon: Users,
                title: 'Team Learning',
                description:
                  'Collaborate with peers and track team progress with our Teams plan.',
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...SPRING.gentle, delay: 0.05 * index }}
              >
                <Card variant="glass" padding="lg" className="h-full border border-white/10">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-white/60">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 border-t border-white/10">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={SPRING.gentle}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-white/70">
              Have questions? We have answers.
            </p>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...SPRING.gentle, delay: 0.05 * index }}
              >
                <Card variant="glass" padding="none" className="border border-white/10 overflow-hidden">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors"
                  >
                    <span className="font-semibold text-white">{faq.question}</span>
                    <motion.div
                      animate={{ rotate: expandedFaq === index ? 180 : 0 }}
                      transition={SPRING.snappy}
                    >
                      <ChevronDown className="w-5 h-5 text-white/60" />
                    </motion.div>
                  </button>
                  <motion.div
                    initial={false}
                    animate={{
                      height: expandedFaq === index ? 'auto' : 0,
                      opacity: expandedFaq === index ? 1 : 0,
                    }}
                    transition={SPRING.gentle}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 text-white/70">{faq.answer}</div>
                  </motion.div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={SPRING.gentle}
          className="max-w-4xl mx-auto"
        >
          <Card
            variant="glass"
            padding="xl"
            className="text-center border-2 border-yellow/30 shadow-[0_0_60px_rgba(255,222,0,0.15)]"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow to-warning flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-navy" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to start learning?
            </h2>
            <p className="text-lg text-white/70 mb-8 max-w-2xl mx-auto">
              Join thousands of learners already mastering new skills with Aptly. Start your free trial today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button variant="celebration" size="xl">Start Free Trial</Button>
              </Link>
              <Link href="/demo/card-renderer">
                <Button variant="ghost" size="xl" className="text-white hover:bg-white/10">
                  View Demo
                </Button>
              </Link>
            </div>
            <p className="text-sm text-white/50 mt-6">
              No credit card required • Cancel anytime
            </p>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Link href="/terms" className="text-white/60 hover:text-white text-sm transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="text-white/60 hover:text-white text-sm transition-colors">
                Privacy
              </Link>
              <Link href="/help" className="text-white/60 hover:text-white text-sm transition-colors">
                Help
              </Link>
            </div>
            <p className="text-white/40 text-sm">
              © {new Date().getFullYear()} Aptly Learning. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
