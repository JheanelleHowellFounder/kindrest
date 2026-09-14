import type { Metadata } from 'next'

/**
 * Link preview for a one-tap invite, shown when a mother texts her link to a
 * friend. Private link: never indexed.
 */
const TITLE = 'A friend thought Kindrest might help'
const DESCRIPTION = 'Daily support for motherhood. One small question a day, and care that fits inside it.'

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
