'use client'

import { useAuth } from '@/lib/auth-context'
import { HomeScreen } from '@/components/home/HomeScreen'
import { BottomNav } from '@/components/layout/BottomNav'
import { LandingPage } from '@/components/landing/LandingPage'

export default function RootPage() {
  const { user, loading } = useAuth()

  // Hold until auth resolves so there's no flash
  if (loading) return <div className="min-h-screen bg-cream" />

  // Authenticated → the app
  if (user) {
    return (
      <>
        <HomeScreen />
        <BottomNav />
      </>
    )
  }

  // Not authenticated → marketing site
  return <LandingPage />
}
