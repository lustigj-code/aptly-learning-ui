import { NextResponse } from 'next/server'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://aptlylearning.com'

/**
 * Dynamic sitemap generation for SEO
 */
export async function GET() {
  const staticPages = [
    { url: '/', priority: 1.0, changefreq: 'weekly' },
    { url: '/login', priority: 0.8, changefreq: 'monthly' },
    { url: '/register', priority: 0.8, changefreq: 'monthly' },
    { url: '/learn', priority: 0.9, changefreq: 'weekly' },
    { url: '/dashboard', priority: 0.9, changefreq: 'daily' },
    { url: '/progress', priority: 0.7, changefreq: 'daily' },
    { url: '/achievements', priority: 0.7, changefreq: 'daily' },
    { url: '/settings', priority: 0.5, changefreq: 'monthly' },
    { url: '/terms', priority: 0.3, changefreq: 'yearly' },
    { url: '/privacy', priority: 0.3, changefreq: 'yearly' },
  ]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    (page) => `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
