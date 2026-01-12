import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Aptly Learning',
    short_name: 'Aptly',
    description: 'Master social media marketing with your personal AI coach. Prepare for the Meta Social Media Marketing Professional Certificate with an engaging, gamified learning experience.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1a2744',
    orientation: 'portrait-primary',
    scope: '/',
    id: '/',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/dashboard.png',
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Dashboard view of Aptly Learning',
      },
      {
        src: '/screenshots/mobile.png',
        sizes: '750x1334',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Mobile view of Aptly Learning',
      },
    ],
    categories: ['education', 'productivity'],
    prefer_related_applications: false,
    shortcuts: [
      {
        name: 'Continue Learning',
        short_name: 'Learn',
        description: 'Resume your learning journey',
        url: '/learn',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        description: 'View your progress',
        url: '/dashboard',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'AI Coach',
        short_name: 'Coach',
        description: 'Chat with your AI coach',
        url: '/coach',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  }
}
