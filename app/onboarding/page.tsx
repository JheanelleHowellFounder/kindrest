'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'

export default function OnboardingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) return

    // User is already authenticated — check onboarding status
    async function checkOnboarding() {
      if (!supabase || !user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .single()

      if (profile?.onboarding_completed) {
        router.replace('/')
      } else {
        router.replace('/onboarding/profile')
      }
    }

    checkOnboarding()
  }, [user, loading, router])

  return <OnboardingFlow />
}
