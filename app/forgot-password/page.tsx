'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, ChevronLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'

function isEmailValid(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent]         = useState(false)
  const [error, setError]       = useState('')

  const canSubmit = isEmailValid(email) && !isSubmitting

  async function handleSubmit() {
    if (!canSubmit || !supabase) return
    setIsSubmitting(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        setError(error.message)
        return
      }
      setSent(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && canSubmit) handleSubmit()
  }

  // ── Confirmation screen ───────────────────────────────────────────────────
  if (sent) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full border-2 border-mustard flex items-center justify-center mb-6">
          <Mail size={36} className="text-mustard" />
        </div>
        <h1 className="font-serif text-[30px] text-chocolate leading-tight mb-3">
          Check your email
        </h1>
        <p className="font-sans text-sm text-chocolate/60 leading-relaxed max-w-xs mb-2">
          We sent a sign-in link to{' '}
          <span className="font-semibold text-chocolate">{email}</span>.
        </p>
        <p className="font-sans text-sm text-chocolate/60 leading-relaxed max-w-xs">
          Click the link to get back into your Kindrest space. Once you&apos;re in, you can update your password from your profile.
        </p>
        <p className="font-sans text-xs text-chocolate/35 italic mt-4">
          Check your spam folder if you don&apos;t see it within a minute.
        </p>

        <button
          onClick={() => { setSent(false); setEmail('') }}
          className="mt-8 text-sm text-chocolate/40 font-sans underline"
        >
          Try a different email
        </button>
      </div>
    )
  }

  // ── Email entry screen ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cream flex flex-col px-6">

      {/* Back */}
      <div className="pt-14">
        <button
          onClick={() => router.back()}
          className="text-chocolate/40 hover:text-chocolate transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      {/* Header */}
      <div className="mt-10">
        <h1 className="font-serif text-[36px] text-chocolate leading-tight">
          Forgot your password?
        </h1>
        <p className="font-sans text-sm text-chocolate/50 mt-3 leading-relaxed">
          No problem. Enter your email and we&apos;ll send you a link to sign in. You can set a new password from your profile once you&apos;re inside.
        </p>
      </div>

      {/* Form */}
      <div className="mt-10 space-y-3">
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError('') }}
          onKeyDown={handleKeyDown}
          placeholder="your@email.com"
          autoFocus
          className="w-full bg-white rounded-2xl px-5 py-4 border-2 border-beige/40 focus:border-mustard outline-none font-sans text-[16px] text-chocolate placeholder:text-chocolate/30 transition-colors"
        />

        {error && (
          <p className="font-sans text-sm text-red-400 px-1">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Sending...' : 'Send sign-in link'}
        </button>
      </div>

      {/* Back to sign in */}
      <div className="mt-6 text-center">
        <button
          onClick={() => router.push('/signin')}
          className="font-sans text-sm text-chocolate/40 underline"
        >
          Back to sign in
        </button>
      </div>

      <div className="mt-auto pb-12 text-center">
        <p className="font-sans text-xs text-chocolate/25 italic">
          Your space. Your pace. Your Kindrest.
        </p>
      </div>
    </div>
  )
}
