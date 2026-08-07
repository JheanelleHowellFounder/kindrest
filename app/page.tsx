'use client'

import { useAuth } from '@/lib/auth-context'
import { HomeScreen } from '@/components/home/HomeScreen'
import { GlimmerHome } from '@/components/glimmer/GlimmerHome'
import { BottomNav } from '@/components/layout/BottomNav'
import { LandingPage } from '@/components/landing/LandingPage'
import { FLAGS } from '@/lib/flags'

export default function RootPage() {
  const { user, loading } = useAuth()

  // Hold until auth resolves so there's no flash
  if (loading) return <div className="min-h-screen bg-cream" />

  // Authenticated → the app. Glimmer becomes home only when the flag is on;
  // otherwise the existing home screen is untouched.
  if (user) {
    return (
      <>
        {FLAGS.glimmer ? <GlimmerHome /> : <HomeScreen />}
        <BottomNav />
      </>
    )
  }

  // Not authenticated → marketing site
  return <LandingPage />
}
