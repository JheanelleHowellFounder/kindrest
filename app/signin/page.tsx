'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

function isEmailValid(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

export default function SignInPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]           = useState('')

  // Already signed in — route based on onboarding status
  useEffect(() => {
    if (loading || !user || !supabase) return
    async function checkAndRedirect() {
      const { data: profile } = await supabase!
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('user_id', user!.id)
        .single()
      if (!profile?.onboarding_completed) {
        router.replace('/onboarding/profile')
      } else {
        router.replace('/')
      }
    }
    checkAndRedirect()
  }, [user, loading, router])

  const canSubmit = isEmailValid(email) && password.length >= 6

  async function handleSubmit() {
    if (!canSubmit || !supabase) return
    setIsSubmitting(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('Incorrect email or password. Try again, or use "Forgot your password?" below.')
        return
      }

      // Route based on onboarding status — new users who verified email
      // but haven't finished their profile should land in the profile flow
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .single()

        if (!profile?.onboarding_completed) {
          router.replace('/onboarding/profile')
          return
        }
      }

      router.replace('/')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && canSubmit) handleSubmit()
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col px-6">

      {/* Logo / Wordmark */}
      <div className="pt-20 flex flex-col items-center">
        <div className="w-16 h-16 bg-chocolate rounded-2xl flex items-center justify-center mb-5">
          <span className="font-serif text-2xl text-mustard">K</span>
        </div>
        <h1 className="font-serif text-[36px] text-chocolate leading-tight text-center">
          Welcome back.
        </h1>
        <p className="font-sans text-sm text-chocolate/50 mt-2 text-center">
          Sign in to your Kindrest space.
        </p>
      </div>

      {/* Form */}
      <div className="mt-12 space-y-3">
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError('') }}
          onKeyDown={handleKeyDown}
          placeholder="your@email.com"
          autoFocus
          className="w-full bg-white rounded-2xl px-5 py-4 border-2 border-beige/40 focus:border-mustard outline-none font-sans text-[16px] text-chocolate placeholder:text-chocolate/30 transition-colors"
        />

        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError('') }}
          onKeyDown={handleKeyDown}
          placeholder="Your password"
          className="w-full bg-white rounded-2xl px-5 py-4 border-2 border-beige/40 focus:border-mustard outline-none font-sans text-[16px] text-chocolate placeholder:text-chocolate/30 transition-colors"
        />

        {/* Forgot password */}
        <div className="text-right">
          <button
            onClick={() => router.push('/forgot-password')}
            className="font-sans text-xs text-chocolate/40 hover:text-mustard transition-colors underline"
          >
            Forgot your password?
          </button>
        </div>

        {error && (
          <p className="font-sans text-sm text-chocolate/60 px-1 leading-relaxed">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'One moment...' : 'Sign in'}
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 mt-8">
        <div className="flex-1 h-px bg-beige/40" />
        <span className="font-sans text-xs text-chocolate/30">or</span>
        <div className="flex-1 h-px bg-beige/40" />
      </div>

      {/* New user CTA */}
      <div className="mt-6 text-center">
        <p className="font-sans text-sm text-chocolate/50">
          New to Kindrest?{' '}
          <button
            onClick={() => router.push('/onboarding')}
            className="text-mustard font-semibold underline"
          >
            Create your account
          </button>
        </p>
      </div>

      {/* Bottom brand note */}
      <div className="mt-auto pb-12 text-center">
        <p className="font-sans text-xs text-chocolate/25 italic">
          Your space. Your pace. Your Kindrest.
        </p>
      </div>
    </div>
  )
}
