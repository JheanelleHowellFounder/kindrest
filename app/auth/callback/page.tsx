'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type State = 'loading' | 'error'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [state, setState] = useState<State>('loading')

  useEffect(() => {
    async function handleCallback() {
      // No session here means the link expired, or she opened it somewhere the
      // session doesn't exist. Send her to sign in rather than a dead end.
      if (!supabase) {
        router.replace('/signin')
        return
      }

      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        router.replace('/signin')
        return
      }

      // NOTE: this used to stop here unless `isStandalone` — i.e. unless she was
      // inside the installed PWA — and show a "go back to the app" screen. That
      // assumed a PWA-first world. Everyone confirming in an ordinary browser hit
      // a dead end and was never taken to onboarding: 8 of the first 20 accounts
      // never finished it. The session is perfectly valid in the browser, so
      // route her onward wherever she opened it.
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('user_id', session.user.id)
        .single()

      // Add to MailerLite active_users — fire-and-forget, non-blocking
      // Safe to call multiple times (MailerLite handles duplicates gracefully)
      fetch('/api/mailerlite/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id, group: 'active_users' }),
      }).catch(() => {/* non-critical */})

      if (profile?.onboarding_completed) {
        router.replace('/')
      } else {
        router.replace('/onboarding/profile')
      }
    }

    handleCallback()
  }, [router])

  // ── Loading screen ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
      <div className="mb-8 text-center">
        <span className="font-serif text-2xl text-chocolate">Kind</span>
        <span className="font-serif text-2xl text-mustard">rest</span>
      </div>
      <div className="w-8 h-8 border-2 border-mustard border-t-transparent rounded-full animate-spin mb-6" />
      <p className="font-sans text-sm text-chocolate/50 italic text-center">
        Setting up your space...
      </p>
    </div>
  )
}
