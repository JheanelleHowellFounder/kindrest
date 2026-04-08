'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { OnboardingProfileFlow } from '@/components/onboarding/OnboardingProfileFlow'

export default function OnboardingProfilePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace('/onboarding')
      return
    }

    async function checkOnboarding() {
      if (!supabase || !user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .single()

      if (profile?.onboarding_completed) {
        router.replace('/')
      }
    }

    checkOnboarding()
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-mustard border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <OnboardingProfileFlow />
}
