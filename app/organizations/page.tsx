import type { Metadata } from 'next'
import { OrganizationsPage } from '@/components/organizations/OrganizationsPage'

const DESCRIPTION =
  'Maternal wellbeing for the workplace. Support the mothers on your team through postpartum ' +
  'and the years of motherhood after leave, when the weight is heaviest and the least visible.'

// The preview image used to point at og-organizations.jpg on the apex domain,
// which didn't exist and redirected before 404ing, so every shared link to this
// page rendered with no image. Paths are now relative to metadataBase (www).
export const metadata: Metadata = {
  title: { absolute: 'Kindrest for Organizations | Maternal Wellbeing at Work' },
  description: DESCRIPTION,
  alternates: { canonical: '/organizations' },
  openGraph: {
    title: 'Kindrest for Organizations',
    description: DESCRIPTION,
    url: '/organizations',
    siteName: 'Kindrest',
    images: [{ url: '/og-organizations.jpg', width: 1200, height: 630, alt: 'Kindrest for Organizations' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kindrest for Organizations',
    description: DESCRIPTION,
    images: ['/og-organizations.jpg'],
  },
}

export default function Page() {
  return <OrganizationsPage />
}
