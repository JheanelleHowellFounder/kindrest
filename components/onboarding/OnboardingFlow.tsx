'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type OnboardingStep = 1 | '1b' | 2 | 3 | 4
type MoodOption = 'overwhelmed' | 'struggling' | 'okay' | 'good' | 'thriving'

const MOOD_OPTIONS: { value: MoodOption; label: string; emoji: string }[] = [
  { value: 'overwhelmed', label: 'Overwhelmed', emoji: '😔' },
  { value: 'struggling',  label: 'Struggling',  emoji: '😔' },
  { value: 'okay',        label: 'Okay',        emoji: '😐' },
  { value: 'good',        label: 'Good',        emoji: '🙂' },
  { value: 'thriving',    label: 'Thriving',    emoji: '✨' },
]

const CRISIS_MOODS: MoodOption[] = ['overwhelmed', 'struggling']

export function OnboardingFlow() {
  const router = useRouter()
  const [step, setStep] = useState<OnboardingStep>(1)
  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null)
  const [cameFromCrisis, setCameFromCrisis] = useState(false)

  // Phase B state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit = isEmailValid(email) && password.length >= 6

  // Persist name + email across email verification break
  useEffect(() => {
    const savedName = localStorage.getItem('kindrest_onboarding_name')
    const savedEmail = localStorage.getItem('kindrest_onboarding_email')
    if (savedName) setName(savedName)
    if (savedEmail) setEmail(savedEmail)
  }, [])

  function handleMoodContinue() {
    if (!selectedMood) return
    if (CRISIS_MOODS.includes(selectedMood)) {
      setStep('1b')
    } else {
      setCameFromCrisis(false)
      setStep(2)
    }
  }

  function handleCrisisBack() {
    setStep(1)
  }

  function handleCrisisContinue() {
    setCameFromCrisis(true)
    setStep(2)
  }

  function handleStep2Continue() {
    if (name.trim().length === 0) return
    localStorage.setItem('kindrest_onboarding_name', name.trim())
    setStep(3)
  }

  function handleStep3Back() {
    setStep(2)
  }

  async function handleAuthSubmit() {
    if (!canSubmit || !supabase) return
    setIsSubmitting(true)
    setAuthError('')
    localStorage.setItem('kindrest_onboarding_email', email)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { name: name.trim() },
        },
      })
      if (error) { setAuthError(error.message); return }

      // If email confirmation is disabled in Supabase, a session is returned
      // immediately — add to MailerLite active_users and redirect
      if (data.session) {
        // Fire-and-forget — don't block the redirect on this
        fetch('/api/mailerlite/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: data.session.user.id, group: 'active_users' }),
        }).catch(() => {/* non-critical */})

        router.replace('/onboarding/profile')
        return
      }

      setStep(4)
    } finally {
      setIsSubmitting(false)
    }
  }

  function isEmailValid(e: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  }

  // ── Step 1 — Crisis Check ─────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="min-h-screen bg-cream flex flex-col px-5">
        {/* Wordmark */}
        <div className="pt-12 text-center">
          <span className="font-serif text-lg text-chocolate">Kind</span>
          <span className="font-serif text-lg text-mustard">rest</span>
        </div>

        <div className="mt-8 text-center">
          <h1 className="font-serif text-[32px] text-chocolate leading-tight">
            Before we begin...
          </h1>
          <p className="font-display text-sm text-chocolate/60 mt-2">
            How are you feeling right now?
          </p>
          <p className="font-sans text-xs text-chocolate/40 italic mt-1">
            There&apos;s no wrong answer.
          </p>
        </div>

        <div className="mt-8 space-y-3 flex-1">
          {MOOD_OPTIONS.map((opt) => {
            const isSelected = selectedMood === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setSelectedMood(opt.value)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-mustard bg-mustard/5'
                    : 'border-beige/40 bg-white'
                }`}
              >
                <span className="text-2xl w-8 text-center">{opt.emoji}</span>
                <span className="font-display font-semibold text-[15px] text-chocolate flex-1 text-center">
                  {opt.label}
                </span>
              </button>
            )
          })}
        </div>

        <div className="py-6 space-y-3">
          <button
            onClick={handleMoodContinue}
            disabled={!selectedMood}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
          <p className="text-center font-sans text-sm text-chocolate/40">
            Already have an account?{' '}
            <button
              onClick={() => router.push('/signin')}
              className="text-mustard font-semibold underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    )
  }

  // ── Step 1b — Crisis Path ─────────────────────────────────────────────────
  if (step === '1b') {
    return (
      <div className="min-h-screen bg-chocolate flex flex-col px-0">
        {/* Back arrow */}
        <div className="pt-12 px-5">
          <button onClick={handleCrisisBack} className="text-cream/60">
            <ChevronLeft size={24} />
          </button>
        </div>

        {/* Soft message */}
        <div className="px-6 mt-12">
          <p className="font-serif text-[26px] text-cream leading-snug">
            You don&apos;t have to carry this alone right now.
          </p>
          <div className="h-0.5 w-12 bg-mustard mt-4" />
        </div>

        {/* Body Scan Card */}
        <div className="mx-5 mt-6 bg-cream/10 rounded-2xl p-5">
          <p className="font-display font-semibold text-[13px] text-mustard mb-4">
            A 2-Minute Body Scan
          </p>
          <div className="space-y-4">
            {[
              'Find a comfortable position, seated or lying down. Close your eyes if that feels okay.',
              'Take three slow breaths. Breathe in for 4 counts, hold for 2, out for 6.',
              'Notice your feet and legs. Are they heavy? Tense? Just observe. No need to change anything.',
              'Move your awareness up through your belly, chest, shoulders. Where are you holding tension? Breathe into that place.',
              'Notice your face, your jaw, your forehead. Let them soften. You are safe in this moment.',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-mustard flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[11px] font-display font-bold text-white">{i + 1}</span>
                </div>
                <p className="font-sans text-[13px] text-cream leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Crisis Resources */}
        <div className="px-6 mt-6">
          <p className="font-sans text-xs text-cream/60 italic">
            If you&apos;re in crisis or feel unsafe, please reach out:
          </p>
          <div className="mt-3 space-y-2">
            <a
              href="tel:18009444773"
              className="flex items-center gap-2 font-display font-semibold text-[12px] text-cream"
            >
              <span className="text-mustard">♡</span>
              Postpartum Support International: 1-800-944-4773
            </a>
            <p className="flex items-center gap-2 font-display font-semibold text-[12px] text-cream">
              <span className="text-mustard">♡</span>
              Crisis Text Line: Text HOME to 741741
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="px-5 mt-8 pb-8 space-y-3">
          <button onClick={handleCrisisContinue} className="btn-primary">
            I&apos;m ready to continue
          </button>
          <p className="text-center text-[11px] font-sans text-cream/40">
            Or take more time. Come back whenever you&apos;re ready.
          </p>
        </div>
      </div>
    )
  }

  // ── Step 2 — Name ─────────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="min-h-screen bg-cream flex flex-col px-5">
        {/* Progress dots */}
        <div className="pt-12 flex items-center gap-2">
          <button
            onClick={() => setStep(cameFromCrisis ? '1b' : 1)}
            className="text-chocolate/50 mr-2"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-mustard" />
            <div className="w-2 h-2 rounded-full bg-beige/60" />
            <div className="w-2 h-2 rounded-full bg-beige/60" />
          </div>
        </div>

        <h1 className="font-serif text-[34px] text-chocolate mt-12 leading-tight">
          Nice to meet you.
        </h1>
        <p className="font-display text-sm text-chocolate/50 mt-2">
          What should we call you?
        </p>

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your first name"
          className="mt-8 w-full bg-cream rounded-2xl px-4 py-4 border-2 border-beige/30 focus:border-mustard outline-none font-display text-[18px] text-chocolate placeholder:text-chocolate/30 transition-colors"
        />

        <div className="mt-auto pb-8 pt-6">
          <button
            onClick={handleStep2Continue}
            disabled={name.trim().length === 0}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  // ── Step 3 — Email + Password ─────────────────────────────────────────────
  if (step === 3) {
    return (
      <div className="min-h-screen bg-cream flex flex-col px-5">
        {/* Progress dots */}
        <div className="pt-12 flex items-center gap-2">
          <button onClick={handleStep3Back} className="text-chocolate/50 mr-2">
            <ChevronLeft size={20} />
          </button>
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-mustard" />
            <div className="w-2 h-2 rounded-full bg-mustard" />
            <div className="w-2 h-2 rounded-full bg-beige/60" />
          </div>
        </div>

        <h1 className="font-serif text-[34px] text-chocolate mt-12 leading-tight">
          And your email?
        </h1>
        <p className="font-sans text-[13px] text-chocolate/50 mt-2">
          We&apos;ll use this to save your Kindrest space.
        </p>

        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setAuthError('') }}
          placeholder="your@email.com"
          className="mt-8 w-full bg-cream rounded-2xl px-4 py-4 border-2 border-beige/30 focus:border-mustard outline-none font-display text-[18px] text-chocolate placeholder:text-chocolate/30 transition-colors"
        />

        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setAuthError('') }}
          placeholder="Create a password (min. 6 characters)"
          className="mt-3 w-full bg-cream rounded-2xl px-4 py-4 border-2 border-beige/30 focus:border-mustard outline-none font-display text-[16px] text-chocolate placeholder:text-chocolate/30 transition-colors"
        />

        {authError && (
          <p className="mt-3 text-sm text-chocolate/60 font-sans">{authError}</p>
        )}

        <div className="mt-auto pb-8 pt-6">
          <button
            onClick={handleAuthSubmit}
            disabled={!canSubmit || isSubmitting}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating your space...' : 'Create my account'}
          </button>
        </div>
      </div>
    )
  }

  // ── Step 4 — Verify Email ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
      {/* Envelope icon */}
      <div className="w-20 h-20 rounded-full border-2 border-mustard bg-cream flex items-center justify-center mb-6">
        <Mail size={36} className="text-mustard" />
      </div>

      <h1 className="font-serif text-[32px] text-chocolate leading-tight">
        Check your email
      </h1>
      <p className="font-sans text-sm text-chocolate/60 mt-3">
        We sent a confirmation link to
      </p>
      <p className="font-sans text-sm font-semibold text-chocolate mt-0.5">
        {email}
      </p>

      <p className="font-sans text-[13px] text-chocolate/40 mt-5 leading-relaxed max-w-xs">
        Click the link to verify your account. On iPhone, it will open in your browser. Once confirmed, come back to the Kindrest app and sign in to continue.
      </p>

      <p className="font-sans text-xs text-chocolate/30 italic mt-4">
        Check your spam folder if you don&apos;t see it within a minute.
      </p>

      <div className="mt-8">
        <button
          onClick={() => router.push('/signin')}
          className="font-sans text-sm text-mustard font-semibold underline"
        >
          Already confirmed? Sign in
        </button>
      </div>

      <div className="mt-4">
        <button
          onClick={() => setStep(3)}
          className="font-sans text-xs text-chocolate/40 underline"
        >
          Use a different email
        </button>
      </div>
    </div>
  )
}
