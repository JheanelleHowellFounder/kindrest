import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { AppShell } from '@/components/layout/AppShell'
import { Analytics } from '@vercel/analytics/next'
import { GrowthTracking } from '@/components/shared/GrowthTracking'

const SITE = 'https://www.kindrest.co'
const DESCRIPTION =
  'Kindrest is a daily support app for postpartum and motherhood. One small question a day, ' +
  'maternal wellness care that fits the time you actually have, and room for the hard days.'

/**
 * Site-wide SEO and link-preview defaults.
 *
 * Search terms chosen by the founder: postpartum, motherhood, maternal. They are
 * worked into the title and description as plain language rather than a keyword
 * list, which search engines ignore and mothers notice.
 *
 * `metadataBase` is www because kindrest.co 307-redirects there, and some link
 * scrapers (LinkedIn among them) don't follow redirects for preview images.
 *
 * Child pages set a plain `title` and get " | Kindrest" appended by the template.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'Kindrest | Postpartum & Motherhood Support, One Day at a Time',
    template: '%s | Kindrest',
  },
  description: DESCRIPTION,
  keywords: ['postpartum support', 'motherhood', 'maternal wellness', 'maternal mental health', 'postpartum app', 'mothers'],
  applicationName: 'Kindrest',
  manifest: '/manifest.json',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Kindrest',
    url: '/',
    title: 'Kindrest | You’ve been taking care of everyone. This part is for you.',
    description: DESCRIPTION,
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: "Kindrest: daily support for postpartum and motherhood" }],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kindrest | You’ve been taking care of everyone. This part is for you.',
    description: DESCRIPTION,
    images: ['/og.jpg'],
  },
  robots: { index: true, follow: true },
}

/**
 * Structured data, so search engines understand what Kindrest is and can show
 * the name and logo properly. Deliberately factual: no ratings, no review counts,
 * no medical claims.
 */
const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE}/#organization`,
      name: 'Kindrest',
      url: SITE,
      logo: `${SITE}/icon-512.png`,
      email: 'hello@kindrest.co',
      founder: { '@type': 'Person', name: 'Jheanelle Howell' },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE}/#website`,
      url: SITE,
      name: 'Kindrest',
      description: DESCRIPTION,
      publisher: { '@id': `${SITE}/#organization` },
      inLanguage: 'en-US',
    },
    {
      '@type': 'WebApplication',
      name: 'Kindrest',
      url: SITE,
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Web, iOS, Android',
      description: DESCRIPTION,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@id': `${SITE}/#organization` },
    },
  ],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f8f2ee',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Serif:wght@400;700&family=Poppins:wght@400;600;700&family=Open+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
        <Analytics />
        <GrowthTracking />
      </body>
    </html>
  )
}
