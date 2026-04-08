'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

function isEmailValid(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

export default function SignInPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [usePassword, setUsePassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  // Already signed in — go home
  useEffect(() => {
    if (!loading && user) router.replace('/')
  }, [user, loading, router])

  const canSubmit = isEmailValid(email) && (!usePassword || password.length >= 6)

  async function handleSubmit() {
    if (!canSubmit || !supabase) return
    setIsSubmitting(true)
    setError('')

    try {
      if (usePassword) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setError(error.message); return }
        router.replace('/')
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) { setError(error.message); return }
        setSent(true)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && canSubmit) handleSubmit()
  }

  // ── Check email screen ────────────────────────────────────────────────────
  if (sent) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full border-2 border-mustard flex items-center justify-center mb-6">
          <Mail size={36} className="text-mustard" />
        </div>
        <h1 className="font-serif text-[30px] text-chocolate leading-tight">
          Check your email
        </h1>
        <p className="font-sans text-sm text-chocolate/60 mt-3 leading-relaxed max-w-xs">
          We sent a sign-in link to <span className="font-semibold text-chocolate">{email}</span>.
          Click it and you&apos;ll land straight in your space.
        </p>
        <p className="mt-2 font-sans text-xs text-chocolate/40 italic">
          Check spam if you don&apos;t see it within 30 seconds.
        </p>
        <button
          onClick={() => { setSent(false); setEmail('') }}
          className="mt-8 text-sm text-chocolate/40 font-sans underline"
        >
          Use a different email
        </button>
      </div>
    )
  }

  // ── Sign in screen ────────────────────────────────────────────────────────
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

        {usePassword && (
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            onKeyDown={handleKeyDown}
            placeholder="Your password"
            className="w-full bg-white rounded-2xl px-5 py-4 border-2 border-beige/40 focus:border-mustard outline-none font-sans text-[16px] text-chocolate placeholder:text-chocolate/30 transition-colors"
          />
        )}

        {!usePassword && (
          <p className="font-sans text-xs text-chocolate/40 italic px-1">
            We&apos;ll email you a sign-in link — no password needed.
          </p>
        )}

        {error && (
          <p className="font-sans text-sm text-red-400 px-1">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed mt-2"
        >
          {isSubmitting
            ? 'One moment...'
            : usePassword
            ? 'Sign in'
            : 'Send sign-in link'}
        </button>

        <button
          onClick={() => { setUsePassword(!usePassword); setError('') }}
          className="w-full text-center font-sans text-sm text-chocolate/40 underline pt-1"
        >
          {usePassword ? 'Use magic link instead' : 'Sign in with password instead'}
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
