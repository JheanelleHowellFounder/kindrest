'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    async function handleCallback() {
      if (!supabase) {
        router.replace('/onboarding')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/onboarding')
        return
      }

      // Check whether onboarding is completed
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('user_id', session.user.id)
        .single()

      if (profile?.onboarding_completed) {
        router.replace('/')
      } else {
        router.replace('/onboarding/profile')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
      {/* Kindrest wordmark */}
      <div className="mb-8 text-center">
        <span className="font-serif text-2xl text-chocolate">Kind</span>
        <span className="font-serif text-2xl text-mustard">rest</span>
      </div>

      {/* Spinner */}
      <div className="w-8 h-8 border-2 border-mustard border-t-transparent rounded-full animate-spin mb-6" />

      <p className="font-sans text-sm text-chocolate/50 italic text-center">
        Setting up your space...
      </p>
    </div>
  )
}
