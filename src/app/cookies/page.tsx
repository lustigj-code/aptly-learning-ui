import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Learn about how Aptly Learning uses cookies to enhance your learning experience.',
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-light-teal/10 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-teal hover:text-teal-dark font-medium transition-colors mb-8"
        >
          <ArrowLeft size={20} strokeWidth={2} />
          Back to Home
        </Link>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-navy mb-4">Cookie Policy</h1>
          <p className="text-lg text-rich-black/70">
            Last updated: {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          <div className="bg-white rounded-2xl shadow-md p-8 mb-8 border border-light-grey/50">
            <h2 className="text-2xl font-semibold text-navy mb-4">What Are Cookies?</h2>
            <p className="text-rich-black/80 leading-relaxed mb-4">
              Cookies are small text files that are placed on your device when you visit our website.
              They help us provide you with a better learning experience by remembering your preferences,
              analyzing how you use our platform, and personalizing content to match your learning goals.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-8 mb-8 border border-light-grey/50">
            <h2 className="text-2xl font-semibold text-navy mb-4">How We Use Cookies</h2>
            <p className="text-rich-black/80 leading-relaxed mb-6">
              Aptly Learning uses cookies for the following purposes:
            </p>

            <div className="space-y-6">
              {/* Necessary Cookies */}
              <div className="border-l-4 border-teal pl-6">
                <h3 className="text-xl font-semibold text-navy mb-2">Necessary Cookies</h3>
                <p className="text-rich-black/80 leading-relaxed mb-3">
                  These cookies are essential for the website to function properly. Without them,
                  you would not be able to access your account, track your progress, or use core features.
                </p>
                <ul className="list-disc list-inside space-y-2 text-rich-black/70">
                  <li>Authentication and session management</li>
                  <li>Security and fraud prevention</li>
                  <li>Load balancing and performance optimization</li>
                  <li>Remembering your login state</li>
                </ul>
              </div>

              {/* Analytics Cookies */}
              <div className="border-l-4 border-purple pl-6">
                <h3 className="text-xl font-semibold text-navy mb-2">Analytics Cookies</h3>
                <p className="text-rich-black/80 leading-relaxed mb-3">
                  These cookies help us understand how learners interact with our platform so we can
                  improve the user experience and educational content.
                </p>
                <ul className="list-disc list-inside space-y-2 text-rich-black/70">
                  <li>Tracking page views and navigation patterns</li>
                  <li>Measuring learning session duration</li>
                  <li>Analyzing feature usage and engagement</li>
                  <li>Identifying technical issues and bugs</li>
                  <li>A/B testing new features</li>
                </ul>
                <p className="text-sm text-rich-black/60 mt-3">
                  We use services like Google Analytics to collect this data. The information is
                  anonymized and aggregated.
                </p>
              </div>

              {/* Marketing Cookies */}
              <div className="border-l-4 border-yellow pl-6">
                <h3 className="text-xl font-semibold text-navy mb-2">Marketing Cookies</h3>
                <p className="text-rich-black/80 leading-relaxed mb-3">
                  These cookies are used to show you relevant content and advertisements based on
                  your learning interests and goals.
                </p>
                <ul className="list-disc list-inside space-y-2 text-rich-black/70">
                  <li>Personalized course recommendations</li>
                  <li>Targeted advertising on third-party platforms</li>
                  <li>Social media integration and sharing</li>
                  <li>Retargeting campaigns</li>
                </ul>
              </div>

              {/* Preference Cookies */}
              <div className="border-l-4 border-success pl-6">
                <h3 className="text-xl font-semibold text-navy mb-2">Preference Cookies</h3>
                <p className="text-rich-black/80 leading-relaxed mb-3">
                  These cookies remember your settings and preferences to provide a more personalized
                  learning experience.
                </p>
                <ul className="list-disc list-inside space-y-2 text-rich-black/70">
                  <li>Language and region preferences</li>
                  <li>Theme and display settings</li>
                  <li>Learning pace and difficulty level</li>
                  <li>Notification preferences</li>
                  <li>Accessibility settings</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-8 mb-8 border border-light-grey/50">
            <h2 className="text-2xl font-semibold text-navy mb-4">Cookie Duration</h2>
            <p className="text-rich-black/80 leading-relaxed mb-4">
              Cookies may be either session cookies or persistent cookies:
            </p>
            <ul className="space-y-3 text-rich-black/80">
              <li className="flex gap-3">
                <span className="font-semibold text-navy flex-shrink-0">Session Cookies:</span>
                <span>Temporary cookies that expire when you close your browser.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-navy flex-shrink-0">Persistent Cookies:</span>
                <span>Remain on your device for a set period or until you delete them. We use persistent cookies for up to 1 year to remember your preferences and login state.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-8 mb-8 border border-light-grey/50">
            <h2 className="text-2xl font-semibold text-navy mb-4">Managing Your Cookie Preferences</h2>
            <p className="text-rich-black/80 leading-relaxed mb-4">
              You have control over which cookies we use. You can manage your preferences in the
              following ways:
            </p>
            <ul className="space-y-3 text-rich-black/80">
              <li className="flex gap-3">
                <span className="font-semibold text-navy flex-shrink-0">1.</span>
                <span>Use our cookie preference center that appears when you first visit the site.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-navy flex-shrink-0">2.</span>
                <span>Adjust your browser settings to block or delete cookies. Note that this may affect website functionality.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-navy flex-shrink-0">3.</span>
                <span>Use browser extensions or privacy tools to manage cookies across all websites.</span>
              </li>
            </ul>
            <div className="mt-6 p-4 bg-light-teal/30 rounded-lg">
              <p className="text-sm text-rich-black/70">
                <strong className="text-navy">Note:</strong> Blocking necessary cookies may prevent
                you from accessing certain features of the platform, including your learning progress
                and personalized content.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-8 mb-8 border border-light-grey/50">
            <h2 className="text-2xl font-semibold text-navy mb-4">Third-Party Cookies</h2>
            <p className="text-rich-black/80 leading-relaxed mb-4">
              We may use third-party services that place cookies on your device. These include:
            </p>
            <ul className="space-y-2 list-disc list-inside text-rich-black/80">
              <li>Google Analytics (analytics and performance tracking)</li>
              <li>Firebase (authentication and database services)</li>
              <li>Social media platforms (Facebook, Twitter, LinkedIn for sharing)</li>
              <li>Content delivery networks (CDN) for faster loading</li>
            </ul>
            <p className="text-rich-black/80 leading-relaxed mt-4">
              These third parties have their own privacy policies governing their use of cookies.
              We recommend reviewing their policies for more information.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-8 mb-8 border border-light-grey/50">
            <h2 className="text-2xl font-semibold text-navy mb-4">Your Rights</h2>
            <p className="text-rich-black/80 leading-relaxed mb-4">
              Under GDPR (for EU residents) and CCPA (for California residents), you have the right to:
            </p>
            <ul className="space-y-2 list-disc list-inside text-rich-black/80">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict certain processing activities</li>
              <li>Export your data in a portable format</li>
              <li>Withdraw consent for non-essential cookies</li>
            </ul>
            <p className="text-rich-black/80 leading-relaxed mt-4">
              To exercise these rights, please contact us at{' '}
              <a
                href="mailto:privacy@aptlylearning.com"
                className="text-teal hover:text-teal-dark font-medium underline underline-offset-2"
              >
                privacy@aptlylearning.com
              </a>
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-8 mb-8 border border-light-grey/50">
            <h2 className="text-2xl font-semibold text-navy mb-4">Updates to This Policy</h2>
            <p className="text-rich-black/80 leading-relaxed">
              We may update this Cookie Policy from time to time to reflect changes in our practices
              or for legal, regulatory, or operational reasons. We will notify you of any material
              changes by posting the new policy on this page and updating the &ldquo;Last updated&rdquo; date.
              We encourage you to review this policy periodically.
            </p>
          </div>

          <div className="bg-gradient-to-br from-teal/10 to-purple/10 rounded-2xl shadow-md p-8 border border-teal/20">
            <h2 className="text-2xl font-semibold text-navy mb-4">Contact Us</h2>
            <p className="text-rich-black/80 leading-relaxed mb-4">
              If you have any questions about our use of cookies or this Cookie Policy, please contact us:
            </p>
            <div className="space-y-2 text-rich-black/80">
              <p>
                <strong className="text-navy">Email:</strong>{' '}
                <a
                  href="mailto:privacy@aptlylearning.com"
                  className="text-teal hover:text-teal-dark font-medium underline underline-offset-2"
                >
                  privacy@aptlylearning.com
                </a>
              </p>
              <p>
                <strong className="text-navy">Website:</strong>{' '}
                <Link
                  href="/"
                  className="text-teal hover:text-teal-dark font-medium underline underline-offset-2"
                >
                  www.aptlylearning.com
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
