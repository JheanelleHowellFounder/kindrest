'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type State = 'loading' | 'return-to-app' | 'error'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [state, setState] = useState<State>('loading')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    async function handleCallback() {
      // Detect if running inside the installed PWA or in a browser
      const isStandalone =
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches

      if (!supabase) {
        if (isStandalone) router.replace('/onboarding')
        else setState('return-to-app')
        return
      }

      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        if (isStandalone) router.replace('/onboarding')
        else setState('return-to-app')
        return
      }

      setUserEmail(session.user.email ?? '')

      if (!isStandalone) {
        // Opened in Safari via magic link — show "go back to app" message
        setState('return-to-app')
        return
      }

      // Inside the PWA — redirect normally
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

  // ── Return-to-app screen (shown when magic link opens in Safari) ────────────
  if (state === 'return-to-app') {
    return (
      <div className="min-h-screen bg-chocolate flex flex-col items-center justify-center px-8 text-center">
        {/* Wordmark */}
        <div className="mb-10">
          <span className="font-serif text-[28px] text-cream">Kind</span>
          <span className="font-serif text-[28px] text-mustard">rest</span>
        </div>

        {/* Checkmark */}
        <div className="w-20 h-20 rounded-full border-2 border-mustard flex items-center justify-center mb-8">
          <span className="text-mustard text-3xl">✓</span>
        </div>

        <h1 className="font-serif text-[30px] text-cream leading-tight mb-4">
          You&apos;re signed in.
        </h1>

        {userEmail && (
          <p className="font-sans text-sm text-cream/50 mb-2">
            {userEmail}
          </p>
        )}

        <div className="h-px w-12 bg-mustard my-6" />

        <p className="font-sans text-[15px] text-cream/70 leading-relaxed max-w-xs mb-3">
          This link opened in your browser. To get back to the app, go to your home screen and tap the Kindrest icon.
        </p>

        <div className="h-px w-12 bg-mustard/30 my-6" />

        <p className="font-sans text-sm text-cream/50 leading-relaxed max-w-xs mb-5">
          Skip this step next time — set a password while you&apos;re here.
        </p>

        <a
          href="/set-password"
          className="px-8 py-3.5 border border-white/25 text-cream font-display font-semibold text-sm rounded-[15px] hover:bg-white/10 transition-colors"
        >
          Set a password
        </a>

        <a
          href="https://kindrest.co"
          className="mt-4 px-8 py-4 bg-mustard text-white font-display font-semibold text-sm rounded-[15px]"
        >
          Open Kindrest
        </a>
      </div>
    )
  }

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
