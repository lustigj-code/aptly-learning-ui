'use client'

import { FileText, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Section } from '@/components/layout/AppLayout'

export default function TermsPage() {
  const router = useRouter()

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
          <FileText className="text-teal" />
          Terms of Service
        </h1>
        <p className="text-rich-black/60 mt-2">Last updated: January 2025</p>
      </Section>

      <Section delay={0.1}>
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>1. Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-rich-black/70">
            <p>
              By accessing or using Aptly Learning, you agree to be bound by these Terms
              of Service. If you do not agree to these terms, please do not use our
              service.
            </p>
          </CardContent>
        </Card>
      </Section>

      <Section delay={0.15}>
        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle>2. Description of Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-rich-black/70">
            <p>
              Aptly Learning provides an AI-powered learning platform designed to help
              users prepare for the Meta Social Media Marketing Professional Certificate.
              Our service includes:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Interactive learning modules and quizzes</li>
              <li>Progress tracking and achievements</li>
              <li>AI-powered coaching and feedback</li>
              <li>Gamification features to enhance engagement</li>
            </ul>
          </CardContent>
        </Card>
      </Section>

      <Section delay={0.2}>
        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle>3. User Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-rich-black/70">
            <p>To use Aptly Learning, you must:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Be at least 13 years of age</li>
              <li>Provide accurate account information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
          </CardContent>
        </Card>
      </Section>

      <Section delay={0.25}>
        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle>4. Acceptable Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-rich-black/70">
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Share your account with others</li>
              <li>Attempt to circumvent any security features</li>
              <li>Use the service for any unlawful purpose</li>
              <li>Interfere with the proper functioning of the service</li>
              <li>Copy, reproduce, or distribute our content without permission</li>
            </ul>
          </CardContent>
        </Card>
      </Section>

      <Section delay={0.3}>
        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle>5. Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-rich-black/70">
            <p>
              All content on Aptly Learning, including but not limited to text, graphics,
              logos, and software, is the property of Aptly Learning or its licensors and
              is protected by intellectual property laws.
            </p>
            <p>
              Meta and the Meta Social Media Marketing Professional Certificate are
              trademarks of Meta Platforms, Inc. Aptly Learning is not affiliated with,
              endorsed by, or sponsored by Meta.
            </p>
          </CardContent>
        </Card>
      </Section>

      <Section delay={0.35}>
        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle>6. Disclaimer of Warranties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-rich-black/70">
            <p>
              Aptly Learning is provided &quot;as is&quot; without warranties of any kind. We do
              not guarantee that using our service will result in certification or any
              particular outcome.
            </p>
          </CardContent>
        </Card>
      </Section>

      <Section delay={0.4}>
        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle>7. Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-rich-black/70">
            <p>
              To the maximum extent permitted by law, Aptly Learning shall not be liable
              for any indirect, incidental, special, consequential, or punitive damages
              arising from your use of the service.
            </p>
          </CardContent>
        </Card>
      </Section>

      <Section delay={0.45}>
        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle>8. Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-rich-black/70">
            <p>
              We may modify these terms at any time. Continued use of the service after
              changes constitutes acceptance of the modified terms. We will notify users
              of significant changes via email or in-app notification.
            </p>
          </CardContent>
        </Card>
      </Section>

      <Section delay={0.5}>
        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle>9. Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-rich-black/70">
            <p>
              If you have any questions about these Terms of Service, please contact us
              at support@aptlylearning.com.
            </p>
          </CardContent>
        </Card>
      </Section>
    </div>
  )
}
