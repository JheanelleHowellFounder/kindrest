import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { SidebarNav } from '@/components/layout/SidebarNav'

export const metadata: Metadata = {
  title: 'Kindrest',
  description: 'Meet yourself again — personalized wellness for mothers.',
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
          {/* Desktop: sidebar + content side by side. Mobile: just the shell. */}
          <SidebarNav />
          <main className="md:ml-[240px] md:flex md:justify-center md:min-h-screen md:bg-[#e8e0d8]">
            <div className="mobile-shell">
              {children}
            </div>
          </main>
        </AuthProvider>
      </body>
    </html>
  )
}
