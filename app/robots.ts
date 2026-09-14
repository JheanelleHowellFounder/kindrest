import type { MetadataRoute } from 'next'

/**
 * Crawl rules. Public marketing pages are open; everything behind a login, and
 * every personal link, is not.
 *
 * /for/<code> (Love Notes), /i/<code> (invites) and /join/<slug> (org cohorts)
 * are private links meant for specific people. They also carry `noindex` in
 * their own metadata, because robots.txt only asks crawlers not to visit — a
 * link shared publicly can still be indexed without noindex.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/organizations', '/terms', '/privacy'],
      disallow: [
        '/api/', '/admin', '/for/', '/i/', '/join/',
        '/onboarding', '/signin', '/set-password', '/forgot-password', '/auth/',
        '/check-in', '/journal', '/history', '/library', '/profile',
        '/glimmers', '/rest-card', '/village',
      ],
    },
    sitemap: 'https://www.kindrest.co/sitemap.xml',
    host: 'https://www.kindrest.co',
  }
}
