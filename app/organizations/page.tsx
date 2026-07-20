import type { Metadata } from 'next'
import { OrganizationsPage } from '@/components/organizations/OrganizationsPage'

export const metadata: Metadata = {
  title: 'Kindrest for Organizations',
  description: 'Support the mothers on your team through the years after leave, when the weight is heaviest and the least visible.',
  openGraph: {
    title: 'Kindrest for Organizations',
    description: 'Support the mothers on your team through the years after leave, when the weight is heaviest and the least visible.',
    url: 'https://kindrest.co/organizations',
    siteName: 'Kindrest',
    images: [
      {
        url: 'https://kindrest.co/og-organizations.jpg',
        width: 1200,
        height: 630,
        alt: 'Kindrest for Organizations',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kindrest for Organizations',
    description: 'Support the mothers on your team through the years after leave, when the weight is heaviest and the least visible.',
    images: ['https://kindrest.co/og-organizations.jpg'],
  },
}

export default function Page() {
  return <OrganizationsPage />
}
