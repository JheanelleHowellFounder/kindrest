'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SetPasswordPage() {
  const router = useRouter()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [done, setDone]           = useState(false)
  const [error, setError]         = useState('')
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  useEffect(() => {
    async function checkSession() {
      if (!supabase) { setHasSession(false); return }
      const { data: { session } } = await supabase.auth.getSession()
      setHasSession(!!session)
    }
    checkSession()
  }, [])

  const canSubmit = password.length >= 6 && password === confirm

  async function handleSubmit() {
    if (!canSubmit || !supabase) return
    setIsSubmitting(true)
    setError('')
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) { setError(error.message); return }
      setDone(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (hasSession === null) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-mustard border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── No session — link expired or navigated here directly ─────────────────
  if (!hasSession) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 bg-chocolate rounded-2xl flex items-center justify-center mb-6">
          <span className="font-serif text-2xl text-mustard">K</span>
        </div>
        <h1 className="font-serif text-[28px] text-chocolate leading-tight mb-3">
          Link expired or not found
        </h1>
        <p className="font-sans text-sm text-chocolate/50 leading-relaxed max-w-xs mb-8">
          To set a password you need to be signed in first. Use the forgot password link to get a fresh sign-in link, then set your password from there.
        </p>
        <button
          onClick={() => router.push('/forgot-password')}
          className="btn-primary"
        >
          Get a sign-in link
        </button>
      </div>
    )
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-chocolate flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full border-2 border-mustard flex items-center justify-center mb-6">
          <span className="text-mustard text-3xl">✓</span>
        </div>
        <h1 className="font-serif text-[30px] text-cream leading-tight mb-4">
          Password set.
        </h1>
        <p className="font-sans text-sm text-cream/60 leading-relaxed max-w-xs">
          Open the Kindrest app on your home screen and sign in with your email and new password. You won&apos;t need a link again.
        </p>
        <div className="h-px w-12 bg-mustard my-8" />
        <a
          href="https://kindrest.co"
          className="px-8 py-4 bg-mustard text-white font-display font-semibold text-sm rounded-[15px]"
        >
          Open Kindrest
        </a>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cream flex flex-col px-6">

      <div className="pt-20 flex flex-col items-center">
        <div className="w-16 h-16 bg-chocolate rounded-2xl flex items-center justify-center mb-5">
          <span className="font-serif text-2xl text-mustard">K</span>
        </div>
        <h1 className="font-serif text-[34px] text-chocolate leading-tight text-center">
          Set your password
        </h1>
        <p className="font-sans text-sm text-chocolate/50 mt-2 text-center max-w-xs leading-relaxed">
          Once set, you can sign in directly from the Kindrest app. No link needed.
        </p>
      </div>

      <div className="mt-10 space-y-3">
        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError('') }}
          placeholder="New password (min. 6 characters)"
          autoFocus
          className="w-full bg-white rounded-2xl px-5 py-4 border-2 border-beige/40 focus:border-mustard outline-none font-sans text-[16px] text-chocolate placeholder:text-chocolate/30 transition-colors"
        />

        <input
          type="password"
          value={confirm}
          onChange={e => { setConfirm(e.target.value); setError('') }}
          placeholder="Confirm password"
          className="w-full bg-white rounded-2xl px-5 py-4 border-2 border-beige/40 focus:border-mustard outline-none font-sans text-[16px] text-chocolate placeholder:text-chocolate/30 transition-colors"
        />

        {confirm.length > 0 && password !== confirm && (
          <p className="font-sans text-sm text-chocolate/60 px-1">Passwords don&apos;t match.</p>
        )}

        {error && (
          <p className="font-sans text-sm text-chocolate/60 px-1 leading-relaxed">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : 'Set password'}
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
