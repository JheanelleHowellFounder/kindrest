'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// useSearchParams() requires a Suspense boundary in the App Router.
function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    async function handleCallback() {
      if (!supabase) {
        router.replace('/signin')
        return
      }

      // ── New flow: token arrives as query params ─────────────────────────────
      // Email links now point here (/auth/callback?token_hash=...&type=...)
      // rather than directly to Supabase's /auth/v1/verify endpoint. This
      // prevents Gmail and other email scanners from consuming the one-time
      // token before the user clicks — scanners fetch HTML but don't run JS,
      // so verifyOtp() is only called in a real browser session.
      const token_hash = searchParams.get('token_hash')
      const type = searchParams.get('type') as
        | 'signup'
        | 'recovery'
        | 'magiclink'
        | 'invite'
        | 'email_change'
        | null

      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type })
        if (error) {
          // Link is expired, already used, or invalid — send to sign-in
          router.replace('/signin')
          return
        }
      }

      // ── Session check (covers both new flow and old hash-fragment redirects) ─
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
  }, [router, searchParams])

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

const LoadingScreen = (
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

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={LoadingScreen}>
      <AuthCallbackInner />
    </Suspense>
  )
}
