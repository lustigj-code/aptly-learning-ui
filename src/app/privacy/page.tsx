'use client';

import { Shield, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Section } from '@/components/layout/AppLayout';

export default function PrivacyPage() {
  const router = useRouter();

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
          <Shield className="text-teal" />
          Privacy & Security
        </h1>
      </Section>

      <Section delay={0.1}>
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>Your Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-rich-black/70">
            <p>
              At Aptly, we take your privacy seriously. Here&apos;s what you need to know:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Your learning progress is stored securely in the cloud</li>
              <li>We never share your personal information with third parties</li>
              <li>You can request deletion of your data at any time</li>
              <li>All communications are encrypted end-to-end</li>
            </ul>
          </CardContent>
        </Card>
      </Section>

      <Section delay={0.2}>
        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-rich-black/60">
              Additional security features coming soon:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-rich-black/70">
              <li>Two-factor authentication</li>
              <li>Login activity history</li>
              <li>Device management</li>
            </ul>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
