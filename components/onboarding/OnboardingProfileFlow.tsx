'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, X } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import type { MotherhoodStage } from '@/lib/types'
import { trackEvent } from '@/lib/analytics'
import { readAttribution, ATTRIBUTION_KEY } from '@/lib/attribution'
import { track as trackGrowth } from '@/lib/posthog'
import { HEARD_OPTIONS } from '@/lib/heard-about'

type ProfileStep = 1 | 2 | 3 | 4 | 5 | 'done'

const MOTHERHOOD_STAGES: { value: MotherhoodStage; label: string; emoji: string }[] = [
  { value: 'expecting',   label: 'Expecting',          emoji: '✨' },
  { value: 'newborn',     label: 'Newborn (0-3mo)',    emoji: '⭕' },
  { value: 'infant',      label: 'Infant (3-12mo)',    emoji: '💜' },
  { value: 'toddler',     label: 'Toddler (1-3yr)',    emoji: '⭐' },
  { value: 'preschool',   label: 'Preschool (3-5yr)',  emoji: '🎨' },
  { value: 'school_age',  label: 'School Age (5+)',    emoji: '📚' },
]

const TIME_OPTIONS = [
  { value: '2_minutes',       emoji: '⚡', label: '2 minutes',   sub: 'Just a breath between moments' },
  { value: '5_minutes',       emoji: '🌿', label: '5 minutes',   sub: 'A small window to reset' },
  { value: '10_minutes',      emoji: '☀️', label: '10 minutes',  sub: 'Enough space to breathe' },
  { value: '15_plus_minutes', emoji: '🌙', label: '15+ minutes', sub: 'Real time for yourself' },
]

const CATEGORIES = [
  { value: 'Rest',             emoji: '🌙' },
  { value: 'Micro Practice',   emoji: '✨' },
  { value: 'Joy',              emoji: '💛' },
  { value: 'Movement',         emoji: '🌿' },
  { value: 'Reflection',       emoji: '🪞' },
  { value: 'Connection',       emoji: '💬' },
]

interface SupportPerson {
  name: string
  relationship: string
}

export function OnboardingProfileFlow() {
  const { user } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState<ProfileStep>(1)
  const [heardAbout, setHeardAbout] = useState<string | null>(null)
  const [heardOther, setHeardOther] = useState('')

  // Step data
  const [selectedStage, setSelectedStage] = useState<MotherhoodStage | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [supportPeople, setSupportPeople] = useState<SupportPerson[]>([{ name: '', relationship: '' }])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Get name from metadata or localStorage
  const [name] = useState(() => {
    if (typeof window === 'undefined') return 'there'
    return user?.user_metadata?.name ?? localStorage.getItem('kindrest_onboarding_name') ?? 'there'
  })

  const firstName = name.split(' ')[0]

  // Save to Supabase when completion screen mounts
  useEffect(() => {
    if (step !== 'done') return
    saveProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  async function saveProfile() {
    if (!supabase || !user) return
    setSaving(true)
    setSaveError(null)

    const cleanPeople = supportPeople.filter(p => p.name.trim().length > 0)
    const signupSource = localStorage.getItem('kindrest_signup_source')

    const profile: Record<string, unknown> = {
      user_id: user.id,
      name: user.user_metadata?.name ?? name,
      motherhood_stage: selectedStage,
      preferred_time_window: selectedTime,
      preferred_categories: selectedCategories,
      support_people: cleanPeople,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    }

    // signup_source only exists where the Founding Moms migration has been run.
    // Try it, and retry without it if the column isn't there — a missing column
    // must never stop a mother from finishing onboarding.
    let { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({ ...profile, signup_source: signupSource })

    if (profileError) {
      ;({ error: profileError } = await supabase.from('user_profiles').upsert(profile))
    }

    if (profileError) {
      // The alarm. Last time this broke, we found out days later by accident.
      trackEvent('onboarding_failed', { step: 'profile', code: profileError.code ?? 'unknown' })
      console.error('user_profiles upsert error:', profileError)
      setSaveError(profileError.message)
      setSaving(false)
      return
    }

    trackEvent('onboarding_completed')
    trackGrowth('signup_completed')

    // Attribution is written separately, on purpose. Folding these columns into
    // the upsert above would put signup back at the mercy of a missing column —
    // which is exactly the bug that broke onboarding in production. If this
    // fails, she is already a user and only the attribution is lost.
    const attribution = readAttribution()
    const heard = heardAbout === 'Other' ? (heardOther.trim() || null) : heardAbout
    if (attribution || heard) {
      const { error: attrError } = await supabase
        .from('user_profiles')
        .update({
          utm_source:    attribution?.utm_source   ?? null,
          utm_medium:    attribution?.utm_medium   ?? null,
          utm_campaign:  attribution?.utm_campaign ?? null,
          referrer:      attribution?.referrer     ?? null,
          device_type:   attribution?.device_type  ?? null,
          first_seen_at: attribution?.first_seen_at ?? null,
          heard_about_us: heard,
        })
        .eq('user_id', user.id)

      if (attrError) console.error('attribution write failed (non-fatal):', attrError.message)
      else { try { localStorage.removeItem(ATTRIBUTION_KEY) } catch {} }
    }

    const { error: prefError } = await supabase.from('user_preference_profile').upsert(
      {
        user_id: user.id,
        preferred_categories: selectedCategories,
        avoided_categories: [],
        preferred_effort: 'Low',
        strong_regulation_types: [],
        total_checkins: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    if (prefError) {
      console.error('user_preference_profile upsert error:', prefError)
      // Non-fatal — profile still saved, continue
    }

    // If she arrived through a pilot link (/join/<slug>), attach her to that org.
    // Fire-and-forget: never block finishing onboarding on this.
    const orgSlug = localStorage.getItem('kindrest_org')
    if (orgSlug) {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (token) {
        fetch('/api/org/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ slug: orgSlug }),
        })
          .then(() => { try { localStorage.removeItem('kindrest_org') } catch {} })
          .catch(() => {/* non-critical */})
      }
    }

    // Same for an invite from a friend — attribute her, but never at the cost
    // of her getting in. Fire-and-forget, failures stay silent.
    const refCode = localStorage.getItem('kindrest_ref')
    if (refCode) {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (token) {
        fetch('/api/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ code: refCode }),
        })
          .then(r => r.json())
          .then(d => {
            if (d?.attributed) trackEvent('invite_converted')
            try { localStorage.removeItem('kindrest_ref') } catch {}
          })
          .catch(() => {/* non-critical */})
      }
    }

    setSaving(false)
  }

  function toggleCategory(cat: string) {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  function addSupportPerson() {
    if (supportPeople.length >= 3) return
    setSupportPeople(prev => [...prev, { name: '', relationship: '' }])
  }

  function removeSupportPerson(idx: number) {
    setSupportPeople(prev => prev.filter((_, i) => i !== idx))
  }

  function updateSupportPerson(idx: number, field: keyof SupportPerson, value: string) {
    setSupportPeople(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }

  const totalSteps = 5
  const stepNum = step === 'done' ? 5 : (step as number)

  // ── Progress Bar ──────────────────────────────────────────────────────────
  function ProgressBar({ current, back }: { current: number; back: () => void }) {
    return (
      <div className="pt-12 px-5 flex items-center gap-3">
        <button onClick={back} className="text-chocolate/50">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 h-1.5 bg-beige/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-mustard rounded-full transition-all duration-500"
            style={{ width: `${(current / totalSteps) * 100}%` }}
          />
        </div>
        <span className="text-xs font-display text-chocolate/40">{current}/{totalSteps}</span>
      </div>
    )
  }

  // ── Step 5 — How she found us ─────────────────────────────────────────────
  // Optional and one tap. It is the only attribution that survives word of
  // mouth, which is the channel most likely to actually be working.
  if (step === 5) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <ProgressBar current={5} back={() => setStep(4)} />

        <div className="px-5 mt-8">
          <h1 className="font-serif text-[26px] text-chocolate leading-tight">
            How did you hear about Kindrest?
          </h1>
          <p className="font-sans text-[13px] text-chocolate/50 mt-2">
            Last one, and it really helps me know where to show up.
          </p>
        </div>

        <div className="px-5 mt-6 flex-1 space-y-2">
          {HEARD_OPTIONS.map(option => {
            const selected = heardAbout === option
            return (
              <button
                key={option}
                onClick={() => setHeardAbout(selected ? null : option)}
                aria-pressed={selected}
                className={`w-full text-left rounded-2xl px-4 py-3.5 border font-sans text-[14.5px] transition-colors ${
                  selected
                    ? 'border-mustard bg-mustard/10 text-chocolate'
                    : 'border-beige/40 bg-white text-chocolate/75 hover:border-mustard/40'
                }`}
              >
                {option}
              </button>
            )
          })}

          {heardAbout === 'Other' && (
            <input
              type="text"
              value={heardOther}
              onChange={e => setHeardOther(e.target.value)}
              placeholder="Where did you find us?"
              maxLength={120}
              autoFocus
              className="w-full bg-white rounded-2xl px-4 py-3.5 font-sans text-[14.5px] text-chocolate placeholder:text-chocolate/30 outline-none border border-beige/40 focus:border-mustard transition-colors"
            />
          )}
        </div>

        <div className="px-5 py-6 space-y-3">
          <button onClick={() => setStep('done')} className="btn-primary">
            Continue
          </button>
          <div className="text-center">
            <button
              onClick={() => { setHeardAbout(null); setStep('done') }}
              className="text-sm text-chocolate/40 font-sans underline"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 1 — Motherhood Stage ─────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <div className="pt-12 px-5">
          <div className="flex gap-1.5 justify-end">
            <span className="text-xs font-display text-chocolate/40">1/{totalSteps}</span>
          </div>
        </div>

        <div className="px-5 mt-8">
          <h1 className="font-serif text-[30px] text-chocolate leading-tight">
            Hi {firstName} 👋
          </h1>
          <p className="font-display text-sm text-chocolate/50 mt-1">
            Where are you in your journey?
          </p>
        </div>

        <div className="px-5 mt-6 space-y-2.5 flex-1">
          {MOTHERHOOD_STAGES.map(({ value, label, emoji }) => {
            const isSelected = selectedStage === value
            return (
              <button
                key={value}
                onClick={() => setSelectedStage(value)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 text-left transition-all ${
                  isSelected ? 'border-mustard bg-mustard/5' : 'border-beige/30 bg-white'
                }`}
              >
                <span className="text-xl">{emoji}</span>
                <span className="font-display font-semibold text-chocolate">{label}</span>
              </button>
            )
          })}
        </div>

        <div className="px-5 py-6">
          <button
            onClick={() => setStep(2)}
            disabled={!selectedStage}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  // ── Step 2 — Time Available ───────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <ProgressBar current={2} back={() => setStep(1)} />

        <div className="px-5 mt-8">
          <h1 className="font-serif text-[26px] text-chocolate leading-tight">
            How much time can you realistically give yourself?
          </h1>
          <p className="font-display text-sm text-chocolate/50 mt-2">
            On most days...
          </p>
        </div>

        <div className="px-5 mt-6 space-y-3 flex-1">
          {TIME_OPTIONS.map((opt) => {
            const isSelected = selectedTime === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setSelectedTime(opt.value)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                  isSelected ? 'border-mustard bg-mustard/5' : 'border-beige/30 bg-white'
                }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <div>
                  <p className="font-display font-semibold text-chocolate">{opt.label}</p>
                  <p className="font-sans text-xs text-chocolate/50 mt-0.5">{opt.sub}</p>
                </div>
              </button>
            )
          })}
        </div>

        <div className="px-5 py-6">
          <button
            onClick={() => setStep(3)}
            disabled={!selectedTime}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  // ── Step 3 — Preferred Categories ────────────────────────────────────────
  if (step === 3) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <ProgressBar current={3} back={() => setStep(2)} />

        <div className="px-5 mt-8">
          <h1 className="font-serif text-[26px] text-chocolate leading-tight">
            What helps you feel more like yourself?
          </h1>
          <p className="font-sans text-[13px] text-chocolate/50 mt-2">
            Select all that resonate.
          </p>
        </div>

        <div className="px-5 mt-6 flex-1">
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map(({ value, emoji }) => {
              const isSelected = selectedCategories.includes(value)
              return (
                <button
                  key={value}
                  onClick={() => toggleCategory(value)}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    isSelected
                      ? 'bg-chocolate text-cream border-chocolate'
                      : 'bg-white border-beige/40 text-chocolate'
                  }`}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className={`font-display font-semibold text-sm ${isSelected ? 'text-cream' : 'text-chocolate'}`}>
                    {value}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="px-5 py-6 space-y-3">
          <button
            onClick={() => setStep(4)}
            className="btn-primary"
          >
            Continue
          </button>
          <div className="text-right">
            <button
              onClick={() => setStep(4)}
              className="text-sm text-chocolate/40 font-sans underline"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 4 — Support Circle ───────────────────────────────────────────────
  if (step === 4) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <ProgressBar current={4} back={() => setStep(3)} />

        <div className="px-5 mt-8">
          <h1 className="font-serif text-[26px] text-chocolate leading-tight">
            Who&apos;s in your corner?
          </h1>
          <p className="font-sans text-[13px] text-chocolate/50 mt-2">
            Someone you can reach out to when you need support.
          </p>
        </div>

        <div className="px-5 mt-6 flex-1 space-y-3">
          {supportPeople.map((person, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-4 border border-beige/20 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-display font-semibold text-xs text-chocolate/50 uppercase tracking-wide">
                  Person {idx + 1}
                </p>
                {idx > 0 && (
                  <button onClick={() => removeSupportPerson(idx)} className="text-chocolate/30">
                    <X size={14} />
                  </button>
                )}
              </div>
              <input
                type="text"
                value={person.name}
                onChange={e => updateSupportPerson(idx, 'name', e.target.value)}
                placeholder="Their name (e.g., Sarah, Mom)"
                className="w-full bg-cream rounded-xl px-3 py-2.5 font-sans text-sm text-chocolate placeholder:text-chocolate/30 outline-none border border-beige/20 focus:border-mustard transition-colors"
              />
              <input
                type="text"
                value={person.relationship}
                onChange={e => updateSupportPerson(idx, 'relationship', e.target.value)}
                placeholder="Relationship (e.g., My sister, Therapist)"
                className="w-full bg-cream rounded-xl px-3 py-2.5 font-sans text-sm text-chocolate placeholder:text-chocolate/30 outline-none border border-beige/20 focus:border-mustard transition-colors"
              />
            </div>
          ))}

          {supportPeople.length < 3 && (
            <button
              onClick={addSupportPerson}
              className="flex items-center gap-2 text-sm text-chocolate/50 font-sans"
            >
              <Plus size={16} />
              Add another person
            </button>
          )}
        </div>

        <div className="px-5 py-6 space-y-3">
          <button
            onClick={() => setStep(5)}
            className="btn-primary"
          >
            Continue
          </button>
          <div className="text-center">
            <button
              onClick={() => setStep(5)}
              className="text-sm text-chocolate/40 font-sans underline"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Completion Screen ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-chocolate flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-mustard flex items-center justify-center mx-auto mt-16">
        <span className="text-4xl">✨</span>
      </div>

      <h1 className="font-serif text-[40px] text-cream mt-6 leading-tight">
        Your space is ready.
      </h1>

      <p className="font-sans text-sm text-cream/60 mt-3 leading-relaxed max-w-xs">
        Kindrest will meet you where you are, every single time.
      </p>

      <div className="h-0.5 w-16 bg-mustard mx-auto mt-6" />

      <div className="mt-auto w-full pb-12 pt-8">
        {saveError && (
          <p className="text-center text-sm text-red-400 font-sans mb-3 px-4">
            Something went wrong saving your profile. Please try again.
          </p>
        )}
        <button
          onClick={() => router.push('/check-in')}
          disabled={saving}
          className="btn-primary disabled:opacity-60"
        >
          {saving ? 'Setting up your space...' : 'Start my first check-in'}
        </button>
      </div>
    </div>
  )
}
