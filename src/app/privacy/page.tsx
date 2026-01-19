'use client';

import { Shield, ArrowLeft, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Section } from '@/components/layout/AppLayout';

const LAST_UPDATED = '2026-01-18';

const tableOfContents = [
  { id: 'data-collection', title: 'Data Collection' },
  { id: 'data-use', title: 'How We Use Your Data' },
  { id: 'data-storage', title: 'Data Storage and Security' },
  { id: 'third-party', title: 'Third-Party Services' },
  { id: 'your-rights', title: 'Your Rights (GDPR)' },
  { id: 'california-rights', title: 'California Privacy Rights (CCPA)' },
  { id: 'cookies', title: 'Cookies and Tracking' },
  { id: 'children', title: 'Children\'s Privacy' },
  { id: 'retention', title: 'Data Retention' },
  { id: 'contact', title: 'Contact Information' },
  { id: 'updates', title: 'Updates to This Policy' },
];

export default function PrivacyPage() {
  const router = useRouter();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
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
        <div className="flex items-start justify-between flex-wrap gap-4">
          <h1 className="h2 text-navy flex items-center gap-3">
            <Shield className="text-teal" />
            Privacy Policy
          </h1>
          <div className="flex items-center gap-2 text-sm text-rich-black/60">
            <Calendar size={16} />
            <span>Last Updated: {LAST_UPDATED}</span>
          </div>
        </div>
        <p className="mt-4 text-rich-black/70">
          Aptly Learning is committed to protecting your privacy and ensuring transparency about how we collect, use, and protect your personal information. This Privacy Policy explains our practices in accordance with GDPR and CCPA requirements.
        </p>
      </Section>

      {/* Table of Contents */}
      <Section delay={0.1}>
        <Card variant="outlined" padding="lg">
          <CardHeader>
            <CardTitle>Table of Contents</CardTitle>
          </CardHeader>
          <CardContent>
            <nav className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {tableOfContents.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="text-left text-teal hover:text-navy transition-colors px-3 py-2 rounded hover:bg-light-grey"
                >
                  {index + 1}. {item.title}
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>
      </Section>

      {/* 1. Data Collection */}
      <Section delay={0.15}>
        <Card id="data-collection" variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>1. Data Collection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-rich-black/70">
            <p>
              We collect the following types of information to provide and improve our educational services:
            </p>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-navy mb-2">Account Information</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Email address (required for account creation)</li>
                  <li>Display name (optional)</li>
                  <li>Profile photo (optional)</li>
                  <li>Password (encrypted, never stored in plain text)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Learning Data</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Course enrollments and progress</li>
                  <li>Quiz responses and scores</li>
                  <li>Learning activity timestamps</li>
                  <li>Skill mastery levels (BKT/FSRS calculations)</li>
                  <li>Study streaks and XP points</li>
                  <li>AI coach conversation history</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Technical Data</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>IP address (for security and analytics)</li>
                  <li>Device type and browser information</li>
                  <li>Session data and cookies</li>
                  <li>Error logs and performance metrics</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Usage Analytics</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Time spent on learning activities</li>
                  <li>Feature usage patterns</li>
                  <li>Navigation paths through the application</li>
                  <li>Struggle detection signals (for adaptive learning)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* 2. How We Use Your Data */}
      <Section delay={0.2}>
        <Card id="data-use" variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>2. How We Use Your Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-rich-black/70">
            <p>We use your personal information for the following purposes:</p>

            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-navy mb-2">Providing Educational Services</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Deliver personalized learning experiences</li>
                  <li>Track and display your progress</li>
                  <li>Generate adaptive content recommendations</li>
                  <li>Calculate mastery levels using BKT and FSRS algorithms</li>
                  <li>Provide AI-powered coaching and feedback</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Improving Our Platform</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Analyze learning patterns to enhance our algorithms</li>
                  <li>Identify and fix technical issues</li>
                  <li>Develop new features based on usage data</li>
                  <li>Conduct A/B testing for educational effectiveness</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Communication</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Send important service announcements</li>
                  <li>Respond to support requests</li>
                  <li>Send optional learning reminders (if enabled)</li>
                  <li>Notify you about policy changes</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Legal Compliance</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Comply with legal obligations</li>
                  <li>Prevent fraud and abuse</li>
                  <li>Enforce our Terms of Service</li>
                  <li>Protect user safety and security</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* 3. Data Storage and Security */}
      <Section delay={0.25}>
        <Card id="data-storage" variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>3. Data Storage and Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-rich-black/70">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-navy mb-2">Storage Infrastructure</h3>
                <p>
                  Your data is stored securely using Google Firebase infrastructure, which provides enterprise-grade security and reliability:
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Firestore (NoSQL database) for user profiles and learning progress</li>
                  <li>Firebase Storage for uploaded media files</li>
                  <li>Firebase Authentication for secure identity management</li>
                  <li>Data centers located in the United States</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Security Measures</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Encryption:</strong> All data is encrypted in transit (TLS 1.3) and at rest (AES-256)</li>
                  <li><strong>Authentication:</strong> Secure password hashing using industry-standard bcrypt</li>
                  <li><strong>Access Control:</strong> Firestore security rules limit access to authorized users only</li>
                  <li><strong>Session Management:</strong> Secure HTTP-only cookies with expiration</li>
                  <li><strong>Regular Audits:</strong> Periodic security reviews and vulnerability assessments</li>
                  <li><strong>Monitoring:</strong> Automated detection of suspicious activity</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Data Backup and Recovery</h3>
                <p>
                  Firebase provides automatic backups and point-in-time recovery to protect against data loss. Your learning progress is continuously synchronized to prevent any loss of work.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* 4. Third-Party Services */}
      <Section delay={0.3}>
        <Card id="third-party" variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>4. Third-Party Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-rich-black/70">
            <p>We use the following third-party services to operate our platform:</p>

            <div className="space-y-4">
              <div className="border-l-4 border-teal pl-4">
                <h3 className="font-semibold text-navy mb-1">Google Firebase</h3>
                <p className="text-sm mb-2">
                  <strong>Purpose:</strong> Authentication, database, storage, hosting
                </p>
                <p className="text-sm mb-2">
                  <strong>Data Shared:</strong> Email, user ID, learning progress, uploaded files
                </p>
                <p className="text-sm">
                  <strong>Privacy Policy:</strong>{' '}
                  <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" className="text-teal hover:underline">
                    firebase.google.com/support/privacy
                  </a>
                </p>
              </div>

              <div className="border-l-4 border-teal pl-4">
                <h3 className="font-semibold text-navy mb-1">Google Gemini AI</h3>
                <p className="text-sm mb-2">
                  <strong>Purpose:</strong> AI coaching, content generation, adaptive feedback
                </p>
                <p className="text-sm mb-2">
                  <strong>Data Shared:</strong> Learning context, conversation history, anonymized interaction data
                </p>
                <p className="text-sm">
                  <strong>Privacy Policy:</strong>{' '}
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-teal hover:underline">
                    policies.google.com/privacy
                  </a>
                </p>
              </div>

              <div className="border-l-4 border-teal pl-4">
                <h3 className="font-semibold text-navy mb-1">HuggingFace (Sage Model)</h3>
                <p className="text-sm mb-2">
                  <strong>Purpose:</strong> Fallback AI model for coaching (fine-tuned educational model)
                </p>
                <p className="text-sm mb-2">
                  <strong>Data Shared:</strong> Learning queries, conversation context (when Gemini is unavailable)
                </p>
                <p className="text-sm">
                  <strong>Privacy Policy:</strong>{' '}
                  <a href="https://huggingface.co/privacy" target="_blank" rel="noopener noreferrer" className="text-teal hover:underline">
                    huggingface.co/privacy
                  </a>
                </p>
              </div>

              <div className="bg-yellow/10 border border-yellow/30 rounded-lg p-4">
                <p className="text-sm font-semibold text-navy mb-2">Important Note on AI Services:</p>
                <p className="text-sm">
                  Conversations with our AI coach are used to improve the learning experience. We anonymize this data before using it for model improvement. You can opt out of AI features in your settings, though this will limit personalization capabilities.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* 5. Your Rights (GDPR) */}
      <Section delay={0.35}>
        <Card id="your-rights" variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>5. Your Rights (GDPR)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-rich-black/70">
            <p>
              If you are in the European Economic Area (EEA), you have the following rights under the General Data Protection Regulation (GDPR):
            </p>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-navy mb-2">Right to Access</h3>
                <p>
                  You can request a copy of all personal data we hold about you. Go to Settings → Privacy → Download My Data to export your information in JSON format.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Right to Rectification</h3>
                <p>
                  You can update or correct your personal information at any time through your account settings. If you find inaccuracies you cannot fix yourself, contact us at privacy@aptlylearning.com.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Right to Erasure (&quot;Right to be Forgotten&quot;)</h3>
                <p>
                  You can request deletion of your account and all associated data at any time. Go to Settings → Privacy → Delete Account. This action is permanent and cannot be undone. We will delete your data within 30 days, except where we are legally required to retain certain information.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Right to Data Portability</h3>
                <p>
                  You can export your learning data in a machine-readable format (JSON) and transfer it to another service. Use the Download My Data feature in Settings.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Right to Restrict Processing</h3>
                <p>
                  You can request that we limit how we use your data. For example, you can disable AI coaching features or opt out of analytics while continuing to use core learning features.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Right to Object</h3>
                <p>
                  You can object to processing of your data for certain purposes, such as marketing communications or analytics. We do not currently send marketing emails, but you can control analytics preferences in Settings.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Right to Withdraw Consent</h3>
                <p>
                  Where we process data based on your consent, you can withdraw that consent at any time. This won&apos;t affect the lawfulness of processing before the withdrawal.
                </p>
              </div>

              <div className="bg-teal/10 border border-teal/30 rounded-lg p-4">
                <p className="text-sm font-semibold text-navy mb-2">How to Exercise Your Rights:</p>
                <ul className="text-sm list-disc pl-5 space-y-1">
                  <li>Use the self-service tools in Settings → Privacy</li>
                  <li>Email us at privacy@aptlylearning.com</li>
                  <li>We will respond within 30 days</li>
                  <li>We may request verification of your identity for security purposes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* 6. California Privacy Rights (CCPA) */}
      <Section delay={0.4}>
        <Card id="california-rights" variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>6. California Privacy Rights (CCPA)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-rich-black/70">
            <p>
              If you are a California resident, the California Consumer Privacy Act (CCPA) provides you with specific rights regarding your personal information:
            </p>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-navy mb-2">Right to Know</h3>
                <p>You have the right to request:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Categories of personal information we&apos;ve collected about you</li>
                  <li>Categories of sources from which we collected the information</li>
                  <li>Our business or commercial purpose for collecting the information</li>
                  <li>Categories of third parties with whom we share personal information</li>
                  <li>Specific pieces of personal information we&apos;ve collected about you</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Right to Delete</h3>
                <p>
                  You have the right to request deletion of your personal information, subject to certain exceptions (e.g., legal compliance, fraud prevention).
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Right to Opt-Out of Sale</h3>
                <p className="font-semibold text-success">
                  We do NOT sell your personal information to third parties. We never have and never will.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Right to Non-Discrimination</h3>
                <p>
                  We will not discriminate against you for exercising any of your CCPA rights. You will not receive different pricing, service quality, or features based on exercising these rights.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Categories of Personal Information We Collect</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-grey/20 mt-2">
                    <thead>
                      <tr className="bg-light-grey">
                        <th className="border border-grey/20 px-4 py-2 text-left">Category</th>
                        <th className="border border-grey/20 px-4 py-2 text-left">Examples</th>
                        <th className="border border-grey/20 px-4 py-2 text-left">Collected</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-grey/20 px-4 py-2">Identifiers</td>
                        <td className="border border-grey/20 px-4 py-2">Email, name, user ID</td>
                        <td className="border border-grey/20 px-4 py-2 text-success font-semibold">Yes</td>
                      </tr>
                      <tr>
                        <td className="border border-grey/20 px-4 py-2">Personal Information (Cal. Civ. Code § 1798.80)</td>
                        <td className="border border-grey/20 px-4 py-2">Name, email</td>
                        <td className="border border-grey/20 px-4 py-2 text-success font-semibold">Yes</td>
                      </tr>
                      <tr>
                        <td className="border border-grey/20 px-4 py-2">Commercial Information</td>
                        <td className="border border-grey/20 px-4 py-2">Course purchases (future feature)</td>
                        <td className="border border-grey/20 px-4 py-2 text-error font-semibold">No</td>
                      </tr>
                      <tr>
                        <td className="border border-grey/20 px-4 py-2">Internet Activity</td>
                        <td className="border border-grey/20 px-4 py-2">Learning interactions, navigation</td>
                        <td className="border border-grey/20 px-4 py-2 text-success font-semibold">Yes</td>
                      </tr>
                      <tr>
                        <td className="border border-grey/20 px-4 py-2">Education Information</td>
                        <td className="border border-grey/20 px-4 py-2">Course progress, quiz scores</td>
                        <td className="border border-grey/20 px-4 py-2 text-success font-semibold">Yes</td>
                      </tr>
                      <tr>
                        <td className="border border-grey/20 px-4 py-2">Inferences</td>
                        <td className="border border-grey/20 px-4 py-2">Learning preferences, skill predictions</td>
                        <td className="border border-grey/20 px-4 py-2 text-success font-semibold">Yes</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-teal/10 border border-teal/30 rounded-lg p-4">
                <p className="text-sm font-semibold text-navy mb-2">How to Exercise Your CCPA Rights:</p>
                <ul className="text-sm list-disc pl-5 space-y-1">
                  <li>Email: privacy@aptlylearning.com</li>
                  <li>Subject line: &quot;CCPA Request&quot;</li>
                  <li>We will verify your identity and respond within 45 days</li>
                  <li>You may designate an authorized agent to make requests on your behalf</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* 7. Cookies and Tracking */}
      <Section delay={0.45}>
        <Card id="cookies" variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>7. Cookies and Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-rich-black/70">
            <p>
              We use cookies and similar tracking technologies to enhance your experience and analyze platform usage.
            </p>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-navy mb-2">Types of Cookies We Use</h3>
                <div className="space-y-3">
                  <div className="border-l-4 border-success pl-4">
                    <h4 className="font-semibold text-sm">Essential Cookies (Required)</h4>
                    <p className="text-sm mt-1">
                      Necessary for authentication and core functionality. These cannot be disabled without breaking the platform.
                    </p>
                    <ul className="text-sm list-disc pl-5 mt-2 space-y-1">
                      <li>Session authentication cookie (HTTP-only)</li>
                      <li>CSRF protection tokens</li>
                      <li>Security cookies</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-teal pl-4">
                    <h4 className="font-semibold text-sm">Functional Cookies (Optional)</h4>
                    <p className="text-sm mt-1">
                      Enhance your experience by remembering preferences.
                    </p>
                    <ul className="text-sm list-disc pl-5 mt-2 space-y-1">
                      <li>Theme preference (light/dark mode)</li>
                      <li>Language selection</li>
                      <li>UI preferences (sidebar state, etc.)</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-warning pl-4">
                    <h4 className="font-semibold text-sm">Analytics Cookies (Optional)</h4>
                    <p className="text-sm mt-1">
                      Help us understand how you use the platform to improve it.
                    </p>
                    <ul className="text-sm list-disc pl-5 mt-2 space-y-1">
                      <li>Learning interaction events</li>
                      <li>Feature usage tracking</li>
                      <li>Performance monitoring</li>
                      <li>A/B test assignments</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Local Storage</h3>
                <p>
                  We use browser local storage to:
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Cache learning content for offline access</li>
                  <li>Store sync queue for offline progress</li>
                  <li>Persist user preferences</li>
                  <li>Enable Progressive Web App (PWA) functionality</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Managing Cookies</h3>
                <p>
                  You can control cookies through:
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Browser settings (disable third-party cookies, clear all cookies)</li>
                  <li>Settings → Privacy → Cookie Preferences (in our app)</li>
                  <li>Do Not Track signals (we honor DNT headers)</li>
                </ul>
              </div>

              <div className="bg-yellow/10 border border-yellow/30 rounded-lg p-4">
                <p className="text-sm">
                  <strong>Note:</strong> Disabling essential cookies will prevent you from logging in. Disabling analytics cookies will not affect core functionality but may reduce personalization.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* 8. Children's Privacy */}
      <Section delay={0.5}>
        <Card id="children" variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>8. Children&apos;s Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-rich-black/70">
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
              <p className="font-semibold text-navy mb-2">Age Requirement: 13+</p>
              <p>
                Aptly Learning is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13.
              </p>
            </div>

            <div className="space-y-3">
              <p>
                If you are under 18 years old, we encourage you to use Aptly Learning with parental or guardian supervision.
              </p>

              <div>
                <h3 className="font-semibold text-navy mb-2">If We Discover We Have Collected Data from a Child Under 13</h3>
                <p>
                  We will take the following steps immediately:
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Delete the account and all associated data</li>
                  <li>Prevent future access to the platform</li>
                  <li>Notify parents/guardians if we have contact information</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">For Parents and Guardians</h3>
                <p>
                  If you believe your child under 13 has created an account on Aptly Learning, please contact us immediately at privacy@aptlylearning.com. We will promptly delete the account and all associated information.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Educational Use</h3>
                <p>
                  If you are an educator interested in using Aptly Learning with students under 13, please contact us at education@aptlylearning.com to discuss COPPA-compliant solutions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* 9. Data Retention */}
      <Section delay={0.55}>
        <Card id="retention" variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>9. Data Retention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-rich-black/70">
            <p>
              We retain your personal information only as long as necessary to provide our services and comply with legal obligations.
            </p>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-navy mb-2">Active Accounts</h3>
                <p>
                  While your account is active, we retain all your data to provide continuous service and track your learning progress.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Inactive Accounts</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Accounts inactive for 3+ years may be flagged for deletion</li>
                  <li>We will email you 30 days before any deletion</li>
                  <li>You can prevent deletion by logging in</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Deleted Accounts</h3>
                <p>
                  When you delete your account:
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li><strong>Immediate:</strong> Account is deactivated and inaccessible</li>
                  <li><strong>Within 30 days:</strong> All personal data is permanently deleted from active systems</li>
                  <li><strong>Within 90 days:</strong> All data removed from backups</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Data We May Retain After Deletion</h3>
                <p>
                  We may retain certain data for legal and operational purposes:
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Anonymized analytics (no personal identifiers)</li>
                  <li>Transaction records (if applicable for tax/legal compliance)</li>
                  <li>Security logs for fraud prevention (6 months)</li>
                  <li>Legal hold data (if required by court order)</li>
                </ul>
              </div>

              <div className="overflow-x-auto">
                <h3 className="font-semibold text-navy mb-2">Retention Periods by Data Type</h3>
                <table className="w-full border-collapse border border-grey/20 mt-2">
                  <thead>
                    <tr className="bg-light-grey">
                      <th className="border border-grey/20 px-4 py-2 text-left">Data Type</th>
                      <th className="border border-grey/20 px-4 py-2 text-left">Retention Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-grey/20 px-4 py-2">Account information</td>
                      <td className="border border-grey/20 px-4 py-2">Until account deletion + 30 days</td>
                    </tr>
                    <tr>
                      <td className="border border-grey/20 px-4 py-2">Learning progress</td>
                      <td className="border border-grey/20 px-4 py-2">Until account deletion + 30 days</td>
                    </tr>
                    <tr>
                      <td className="border border-grey/20 px-4 py-2">Coach conversations</td>
                      <td className="border border-grey/20 px-4 py-2">Until account deletion + 30 days</td>
                    </tr>
                    <tr>
                      <td className="border border-grey/20 px-4 py-2">Analytics (anonymized)</td>
                      <td className="border border-grey/20 px-4 py-2">5 years</td>
                    </tr>
                    <tr>
                      <td className="border border-grey/20 px-4 py-2">Security logs</td>
                      <td className="border border-grey/20 px-4 py-2">6 months</td>
                    </tr>
                    <tr>
                      <td className="border border-grey/20 px-4 py-2">Backup copies</td>
                      <td className="border border-grey/20 px-4 py-2">90 days after deletion</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* 10. Contact Information */}
      <Section delay={0.6}>
        <Card id="contact" variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>10. Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-rich-black/70">
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:
            </p>

            <div className="space-y-4">
              <div className="bg-teal/10 border border-teal/30 rounded-lg p-6">
                <h3 className="font-semibold text-navy mb-4">Privacy Contact</h3>
                <div className="space-y-2">
                  <p><strong>Email:</strong> privacy@aptlylearning.com</p>
                  <p><strong>Data Protection Officer:</strong> dpo@aptlylearning.com</p>
                  <p><strong>General Support:</strong> support@aptlylearning.com</p>
                  <p><strong>Mailing Address:</strong><br />
                    Aptly Learning, Inc.<br />
                    Attn: Privacy Officer<br />
                    [Address to be added]<br />
                    United States
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Response Time</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>General inquiries: Within 5 business days</li>
                  <li>GDPR requests: Within 30 days</li>
                  <li>CCPA requests: Within 45 days</li>
                  <li>Urgent security concerns: Within 24 hours</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Supervisory Authority</h3>
                <p>
                  If you are in the EEA and believe we have not addressed your privacy concerns adequately, you have the right to lodge a complaint with your local data protection supervisory authority.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* 11. Updates to This Policy */}
      <Section delay={0.65}>
        <Card id="updates" variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>11. Updates to This Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-rich-black/70">
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors.
            </p>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-navy mb-2">How We Notify You</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Minor changes:</strong> Updated date at the top of this page</li>
                  <li><strong>Material changes:</strong> Email notification + in-app banner for 30 days</li>
                  <li><strong>Significant changes affecting your rights:</strong> Require re-acceptance before continued use</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Your Acceptance</h3>
                <p>
                  By continuing to use Aptly Learning after changes are posted, you accept the updated Privacy Policy. If you do not agree with changes, you may delete your account.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-2">Version History</h3>
                <p>
                  We maintain a history of significant changes to this policy:
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li><strong>2026-01-18:</strong> Initial comprehensive GDPR/CCPA compliant policy</li>
                </ul>
              </div>

              <div className="bg-teal/10 border border-teal/30 rounded-lg p-4">
                <p className="text-sm">
                  <strong>Bookmark this page:</strong> We recommend checking this Privacy Policy periodically for updates, especially if you have concerns about how your data is used.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* Final Note */}
      <Section delay={0.7}>
        <Card variant="outlined" padding="lg">
          <CardContent className="text-center space-y-3">
            <p className="text-rich-black/70">
              Thank you for trusting Aptly Learning with your educational journey. We are committed to protecting your privacy and being transparent about our data practices.
            </p>
            <p className="text-sm text-rich-black/60">
              Questions? Contact us at privacy@aptlylearning.com
            </p>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
