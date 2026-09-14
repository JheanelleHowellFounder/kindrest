import type { Metadata } from 'next'

/**
 * Link preview for an organization's cohort link (flyer QR codes, HR emails).
 * Private to that cohort: never indexed.
 */
const TITLE = 'Join Kindrest through your organization'
const DESCRIPTION = 'Your organization is offering Kindrest: daily support for the years of motherhood after leave.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  alternates: { canonical: null },   // don't inherit the homepage canonical
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'Kindrest',
    type: 'website',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Kindrest' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/og.jpg'] },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
