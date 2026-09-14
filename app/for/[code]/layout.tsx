import type { Metadata } from 'next'

/**
 * Link preview for a Love Note link — what her mother sees when the link is
 * texted to her, before she taps it.
 *
 * The page itself is a client component and loads the mother's name in the
 * browser, so the preview can't include her name. It is written to work without
 * it. Private link: never indexed.
 */
const TITLE = 'Leave her a Love Note'
const DESCRIPTION = 'Someone who loves you asked for a note. No sign-up, and it takes a second.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  // The root layout's canonical is '/'. Inherited here it would tell search
  // engines every personal link is a copy of the homepage.
  alternates: { canonical: null },
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
