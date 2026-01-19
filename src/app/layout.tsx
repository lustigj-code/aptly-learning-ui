import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'
import { SkipLink } from '@/components/ui/SkipLink'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aptlylearning.com'
const APP_NAME = 'Aptly Learning'
const APP_DESCRIPTION =
  'Master social media marketing with your personal AI coach. Prepare for the Meta Social Media Marketing Professional Certificate with an engaging, gamified learning experience.'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} - AI-Powered Learning`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: [
    'learning platform',
    'meta certification',
    'social media marketing',
    'AI coach',
    'professional development',
    'online learning',
    'marketing certification',
    'meta marketing',
    'digital marketing',
    'career development',
  ],
  authors: [{ name: 'Aptly Learning' }],
  creator: 'Aptly Learning',
  publisher: 'Aptly Learning',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} - AI-Powered Learning`,
    description: APP_DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Aptly Learning - Master Social Media Marketing',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} - AI-Powered Learning`,
    description: APP_DESCRIPTION,
    images: ['/og-image.png'],
    creator: '@aptlylearning',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  // manifest is auto-generated from src/app/manifest.ts
  alternates: {
    canonical: APP_URL,
  },
  category: 'education',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a2744' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased safe-area-x">
        <SkipLink />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
