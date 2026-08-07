import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { WalletProvider } from '@/lib/wallet-context'
import { AppShell } from '@/components/layout/AppShell'

export const metadata: Metadata = {
  title: 'Kindrest',
  description: 'Meet yourself again. Personalized wellness for mothers.',
  manifest: '/manifest.json',
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
        <AuthProvider>
          <WalletProvider>
            <AppShell>{children}</AppShell>
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
