'use client';

import { HelpCircle, ArrowLeft, MessageCircle, Mail, Book } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Section } from '@/components/layout/AppLayout';

export default function HelpPage() {
  const router = useRouter();

  const faqs = [
    {
      question: 'How do I track my progress?',
      answer: 'Your progress is automatically saved as you complete lessons. Visit the Progress page to see detailed analytics.',
    },
    {
      question: 'What happens if I miss a day?',
      answer: 'You have streak freezes available that can protect your streak. You can also earn more freezes through achievements.',
    },
    {
      question: 'Can I download lessons for offline use?',
      answer: 'Offline mode is coming soon! We\'re working on making lessons available without an internet connection.',
    },
    {
      question: 'How do I contact support?',
      answer: 'You can reach our support team at support@aptly.com or use the AI Coach for instant help.',
    },
  ];

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <Section delay={0}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
        <h1 className="h2 text-navy flex items-center gap-3">
          <HelpCircle className="text-teal" />
          Help & Support
        </h1>
        <p className="text-rich-black/60 mt-2">
          Get help with your learning journey
        </p>
      </Section>

      <Section delay={0.1}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card variant="interactive" padding="md" className="text-center">
            <CardContent className="pt-4">
              <MessageCircle size={32} className="mx-auto text-teal mb-3" />
              <h3 className="font-semibold text-navy">Ask Coach</h3>
              <p className="text-sm text-rich-black/60 mt-1">Get instant AI help</p>
            </CardContent>
          </Card>
          <Card variant="interactive" padding="md" className="text-center">
            <CardContent className="pt-4">
              <Mail size={32} className="mx-auto text-purple mb-3" />
              <h3 className="font-semibold text-navy">Email Us</h3>
              <p className="text-sm text-rich-black/60 mt-1">support@aptly.com</p>
            </CardContent>
          </Card>
          <Card variant="interactive" padding="md" className="text-center">
            <CardContent className="pt-4">
              <Book size={32} className="mx-auto text-yellow mb-3" />
              <h3 className="font-semibold text-navy">Guides</h3>
              <p className="text-sm text-rich-black/60 mt-1">Browse tutorials</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section delay={0.2}>
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>Quick answers to common questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="p-4 bg-light-grey rounded-xl">
                <h4 className="font-semibold text-navy">{faq.question}</h4>
                <p className="text-sm text-rich-black/70 mt-2">{faq.answer}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
