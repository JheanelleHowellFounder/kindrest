'use client'

import { useState, useEffect } from 'react'
import {
  Heart, Star, Calendar, Users, Clock,
  ChevronRight, ChevronLeft, X, Check, Sparkles, MessageCircle,
} from 'lucide-react'
import type { MotherhoodStage } from '@/lib/types'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface LiveStats {
  totalCheckins: number
  streakDays: number
  topTechniques: { title: string; usedCount: number; likedCount: number }[]
  preferredCategories: string[]
}

interface SavedProfile {
  motherhood_stage: MotherhoodStage | null
  preferred_time_window: string | null
  preferred_categories: string[]
  support_people: { name: string; relationship: string }[]
}

type ProfileView = 'main' | 'update'

const MOTHERHOOD_STAGES: { value: MotherhoodStage; label: string; emoji: string }[] = [
  { value: 'expecting',   label: 'Expecting',         emoji: '✨' },
  { value: 'newborn',     label: 'Newborn (0-3mo)',   emoji: '🌙' },
  { value: 'infant',      label: 'Infant (3-12mo)',   emoji: '💛' },
  { value: 'toddler',     label: 'Toddler (1-3yr)',   emoji: '⭐' },
  { value: 'preschool',   label: 'Preschool (3-5yr)', emoji: '🎨' },
  { value: 'school_age',  label: 'School Age (5+)',   emoji: '📚' },
]

const TIME_OPTIONS = [
  { value: '2_minutes',       emoji: '⚡', label: '2 minutes',   sub: 'Just a breath between moments' },
  { value: '5_minutes',       emoji: '🌿', label: '5 minutes',   sub: 'A small window to reset' },
  { value: '10_minutes',      emoji: '☀️', label: '10 minutes',  sub: 'Enough space to breathe' },
  { value: '15_plus_minutes', emoji: '🌙', label: '15+ minutes', sub: 'Real time for yourself' },
]

const CATEGORIES = [
  { value: 'Rest',            emoji: '🌙' },
  { value: 'Micro Practices', emoji: '✨' },
  { value: 'Joy',             emoji: '💛' },
  { value: 'Movement',        emoji: '🌿' },
  { value: 'Reflection',      emoji: '🪞' },
  { value: 'Connection',      emoji: '💬' },
]

export function ProfileScreen() {
  const { user: authUser, signOut } = useAuth()
  const router = useRouter()

  const userId = authUser?.id ?? 'demo-user-001'
  const name = authUser?.user_metadata?.name ?? authUser?.email?.split('@')[0] ?? 'You'
  const email = authUser?.email ?? ''

  // Format member since from auth created_at
  const memberSince = authUser?.created_at
    ? new Date(authUser.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  const [view, setView]             = useState<ProfileView>('main')
  const [showFeedback, setShowFeedback] = useState(false)
  const [stats, setStats]           = useState<LiveStats | null>(null)
  const [savedProfile, setSavedProfile] = useState<SavedProfile>({
    motherhood_stage: null,
    preferred_time_window: null,
    preferred_categories: [],
    support_people: [],
  })

  useEffect(() => {
    const fetchStats = () => {
      fetch(`/api/stats?userId=${userId}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(data => setStats(data))
        .catch(() => {})
    }
    fetchStats()
    const onVisible = () => { if (document.visibilityState === 'visible') fetchStats() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [userId])

  // Load saved profile from Supabase
  useEffect(() => {
    if (!supabase || !authUser) return
    supabase
      .from('user_profiles')
      .select('motherhood_stage, preferred_time_window, preferred_categories, support_people')
      .eq('user_id', authUser.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setSavedProfile({
            motherhood_stage: data.motherhood_stage ?? null,
            preferred_time_window: data.preferred_time_window ?? null,
            preferred_categories: data.preferred_categories ?? [],
            support_people: data.support_people ?? [],
          })
        }
      })
  }, [authUser])

  function handleProfileSaved(updated: SavedProfile) {
    setSavedProfile(updated)
    setView('main')
  }

  if (view === 'update') {
    return (
      <UpdateProfileFlow
        userId={authUser?.id ?? ''}
        initial={savedProfile}
        onSaved={handleProfileSaved}
        onClose={() => setView('main')}
      />
    )
  }

  const stageLabel = MOTHERHOOD_STAGES.find(s => s.value === savedProfile.motherhood_stage)
  const timeLabel = TIME_OPTIONS.find(t => t.value === savedProfile.preferred_time_window)

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-6 text-center">
        <div className="w-16 h-16 bg-mustard/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="font-display font-bold text-2xl text-mustard">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
        <h1 className="font-display font-bold text-chocolate text-xl">{name}</h1>
        <p className="text-sm text-chocolate/50 font-sans">{email}</p>
      </div>

      <div className="px-5 space-y-5">
        {/* Wellness Journey */}
        <div className="bg-white rounded-2xl p-4 border border-beige/20">
          <div className="flex items-center gap-2 mb-3">
            <Heart size={14} className="text-rose-400" />
            <p className="font-display font-semibold text-chocolate text-sm">Your Wellness Journey</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Calendar size={14} />, label: 'Check-Ins', value: stats?.totalCheckins ?? '—' },
              { icon: <Heart size={14} />,   label: 'Day Streak', value: stats?.streakDays ?? '—' },
            ].map(({ icon, label, value }) => (
              <div key={label} className="text-center">
                <div className="flex items-center justify-center gap-1 text-chocolate/40 mb-0.5">
                  {icon}
                </div>
                <p className="font-display font-bold text-xl text-chocolate">{value}</p>
                <p className="text-[10px] text-chocolate/40 font-sans">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Techniques */}
        <div>
          <p className="font-display font-semibold text-chocolate text-sm mb-2">Your Top Self-Care Techniques</p>
          {stats && stats.topTechniques.length > 0 ? (
            <div className="space-y-2">
              {stats.topTechniques.slice(0, 3).map((tech, i) => (
                <div key={i} className="bg-white rounded-xl p-3 flex items-center justify-between border border-beige/20">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white font-display font-bold text-xs ${
                      i === 0 ? 'bg-mustard' : i === 1 ? 'bg-chocolate' : 'bg-chocolate/60'
                    }`}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-display font-semibold text-sm text-chocolate">{tech.title}</p>
                      <p className="text-[11px] text-chocolate/40 font-sans">
                        Saved or done {tech.likedCount} time{tech.likedCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Heart size={14} className="text-rose-300" fill="currentColor" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-chocolate/40 font-sans text-center py-3">
              Complete a check-in to see your top techniques.
            </p>
          )}
        </div>

        {/* Profile snapshot */}
        <div className="bg-white rounded-2xl p-4 border border-beige/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star size={14} className="text-mustard" />
              <p className="font-display font-semibold text-chocolate text-sm">Your Profile</p>
            </div>
            <button
              onClick={() => setView('update')}
              className="text-xs text-mustard font-display font-semibold"
            >
              Edit
            </button>
          </div>

          <div className="space-y-2">
            {stageLabel && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-cream rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-base">{stageLabel.emoji}</span>
                </div>
                <div>
                  <p className="text-[10px] text-chocolate/40 font-sans uppercase tracking-wide">Journey</p>
                  <p className="font-display font-semibold text-sm text-chocolate">{stageLabel.label}</p>
                </div>
              </div>
            )}

            {timeLabel && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-cream rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock size={15} className="text-mustard" />
                </div>
                <div>
                  <p className="text-[10px] text-chocolate/40 font-sans uppercase tracking-wide">Typical self-care time</p>
                  <p className="font-display font-semibold text-sm text-chocolate">{timeLabel.label}</p>
                </div>
              </div>
            )}

            {savedProfile.preferred_categories.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-cream rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles size={15} className="text-mustard" />
                </div>
                <div>
                  <p className="text-[10px] text-chocolate/40 font-sans uppercase tracking-wide">What helps you</p>
                  <p className="font-display font-semibold text-sm text-chocolate">
                    {savedProfile.preferred_categories.join(', ')}
                  </p>
                </div>
              </div>
            )}

            {savedProfile.support_people.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-cream rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users size={15} className="text-mustard" />
                </div>
                <div>
                  <p className="text-[10px] text-chocolate/40 font-sans uppercase tracking-wide">Support circle</p>
                  <p className="font-display font-semibold text-sm text-chocolate">
                    {savedProfile.support_people.map(p => p.name).join(', ')}
                  </p>
                </div>
              </div>
            )}

            {!stageLabel && !timeLabel && savedProfile.preferred_categories.length === 0 && (
              <p className="text-sm text-chocolate/40 font-sans">
                Tap Edit to personalise your experience.
              </p>
            )}
          </div>
        </div>

        {/* Member since */}
        {memberSince && (
          <div className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-beige/20">
            <Heart size={16} className="text-rose-300" />
            <div>
              <p className="text-xs text-chocolate/40 font-sans">Member since</p>
              <p className="font-display font-semibold text-chocolate text-sm">{memberSince}</p>
            </div>
          </div>
        )}

        {/* Update CTA */}
        <button onClick={() => setView('update')} className="btn-primary">
          Update Your Profile
        </button>

        {/* Feedback */}
        <button
          onClick={() => setShowFeedback(true)}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm text-chocolate/50 font-sans border border-beige/40 rounded-2xl hover:border-mustard/40 transition-colors"
        >
          <MessageCircle size={14} className="text-chocolate/40" />
          Share feedback
        </button>

        {/* Sign out */}
        <button
          onClick={async () => { await signOut(); router.replace('/') }}
          className="w-full text-center text-sm text-chocolate/30 font-sans py-2 mt-2"
        >
          Sign out
        </button>
      </div>

      {/* Feedback sheet */}
      {showFeedback && (
        <FeedbackSheet
          userId={userId}
          email={email}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </div>
  )
}

// ── Feedback Sheet ────────────────────────────────────────────────────────────

function FeedbackSheet({
  userId, email, onClose,
}: {
  userId: string
  email: string
  onClose: () => void
}) {
  const [visible, setVisible]     = useState(false)
  const [message, setMessage]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]           = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])

  function close() {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  async function handleSubmit() {
    if (!message.trim() || submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/user-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email, message }),
      })
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-chocolate/50 z-40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={close}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-cream rounded-t-3xl z-50 transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-beige rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 flex items-start justify-between">
          <div>
            <h3 className="font-serif text-[22px] text-chocolate leading-tight">
              {done ? 'Thank you. 🤎' : 'Share feedback'}
            </h3>
            <p className="text-xs text-chocolate/40 font-sans mt-0.5">
              {done ? 'Your feedback has been received.' : 'What\'s working? What\'s missing? Be honest.'}
            </p>
          </div>
          <button
            onClick={close}
            className="w-8 h-8 rounded-full bg-beige/40 flex items-center justify-center mt-1"
          >
            <X size={14} className="text-chocolate/60" />
          </button>
        </div>

        {done ? (
          <div className="px-5 pb-16 text-center py-6">
            <p className="font-sans text-sm text-chocolate/60 leading-relaxed max-w-xs mx-auto">
              Jheanelle reads every message. Your feedback directly shapes what gets built next.
            </p>
            <button
              onClick={close}
              className="mt-6 px-8 py-3 bg-mustard text-white font-display font-semibold text-sm rounded-[15px]"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="px-5 pb-16 space-y-3">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Tell us anything — what's helping, what's confusing, what you wish existed..."
              rows={5}
              autoFocus
              className="w-full bg-white rounded-2xl px-4 py-3 border-2 border-beige/40 focus:border-mustard outline-none font-sans text-sm text-chocolate placeholder:text-chocolate/30 transition-colors resize-none"
            />
            <button
              onClick={handleSubmit}
              disabled={!message.trim() || submitting}
              className="w-full px-7 py-4 bg-mustard text-white font-display font-semibold text-sm rounded-[15px] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {submitting ? 'Sending...' : 'Send feedback'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── Update Profile Flow ───────────────────────────────────────────────────────
function UpdateProfileFlow({
  userId,
  initial,
  onSaved,
  onClose,
}: {
  userId: string
  initial: SavedProfile
  onSaved: (p: SavedProfile) => void
  onClose: () => void
}) {
  const totalSteps = 4
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [selectedStage, setSelectedStage]       = useState<MotherhoodStage | null>(initial.motherhood_stage)
  const [selectedTime, setSelectedTime]         = useState<string | null>(initial.preferred_time_window)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initial.preferred_categories)
  const [supportPeople, setSupportPeople]       = useState<{ name: string; relationship: string }[]>(
    initial.support_people.length > 0 ? initial.support_people : [{ name: '', relationship: '' }]
  )

  function toggleCategory(cat: string) {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  async function handleSave() {
    if (!supabase || !userId) return
    setSaving(true)
    setSaveError('')

    const cleanPeople = supportPeople.filter(p => p.name.trim().length > 0)

    const { error: profileError } = await supabase.from('user_profiles').upsert({
      user_id: userId,
      motherhood_stage: selectedStage,
      preferred_time_window: selectedTime,
      preferred_categories: selectedCategories,
      support_people: cleanPeople,
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      setSaveError('Something went wrong. Please try again.')
      setSaving(false)
      return
    }

    // Also update preference profile categories so recommendations stay in sync
    await supabase.from('user_preference_profile').upsert(
      { user_id: userId, preferred_categories: selectedCategories, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

    setSaving(false)
    onSaved({ motherhood_stage: selectedStage, preferred_time_window: selectedTime, preferred_categories: selectedCategories, support_people: cleanPeople })
  }

  // ── Progress bar ─────────────────────────────────────────────────────────
  const ProgressBar = ({ back }: { back: () => void }) => (
    <div className="px-5 pt-12 pb-4 flex items-center gap-3">
      <button onClick={back} className="text-chocolate/50">
        <ChevronLeft size={20} />
      </button>
      <div className="flex-1 h-1.5 bg-beige/40 rounded-full overflow-hidden">
        <div
          className="h-full bg-mustard rounded-full transition-all duration-500"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>
      <span className="text-xs font-display text-chocolate/40">{step}/{totalSteps}</span>
      <button onClick={onClose} className="text-chocolate/40">
        <X size={20} />
      </button>
    </div>
  )

  // ── Step 1 — Motherhood Stage ─────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <ProgressBar back={onClose} />
        <div className="px-5 mt-6">
          <h1 className="font-serif text-3xl text-chocolate leading-tight">Where are you right now?</h1>
          <p className="font-sans text-sm text-chocolate/50 mt-2">Update your motherhood stage</p>
        </div>
        <div className="px-5 mt-6 space-y-2.5 flex-1">
          {MOTHERHOOD_STAGES.map(({ value, label, emoji }) => (
            <button
              key={value}
              onClick={() => setSelectedStage(value)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                selectedStage === value ? 'border-mustard bg-mustard/5' : 'border-beige/30 bg-white'
              }`}
            >
              <span className="text-xl">{emoji}</span>
              <span className="font-display font-semibold text-chocolate flex-1">{label}</span>
              {selectedStage === value && <Check size={16} className="text-mustard" />}
            </button>
          ))}
        </div>
        <div className="px-5 py-6">
          <button onClick={() => setStep(2)} className="btn-primary">
            Continue <ChevronRight size={16} className="inline ml-1" />
          </button>
        </div>
      </div>
    )
  }

  // ── Step 2 — Time Available ───────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <ProgressBar back={() => setStep(1)} />
        <div className="px-5 mt-6">
          <h1 className="font-serif text-2xl text-chocolate leading-tight">How much time do you have these days?</h1>
          <p className="font-sans text-sm text-chocolate/50 mt-2">On most days...</p>
        </div>
        <div className="px-5 mt-6 space-y-3 flex-1">
          {TIME_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelectedTime(opt.value)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                selectedTime === opt.value ? 'border-mustard bg-mustard/5' : 'border-beige/30 bg-white'
              }`}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <div>
                <p className="font-display font-semibold text-chocolate">{opt.label}</p>
                <p className="font-sans text-xs text-chocolate/50 mt-0.5">{opt.sub}</p>
              </div>
              {selectedTime === opt.value && <Check size={16} className="text-mustard ml-auto" />}
            </button>
          ))}
        </div>
        <div className="px-5 py-6">
          <button onClick={() => setStep(3)} disabled={!selectedTime} className="btn-primary disabled:opacity-40">
            Continue <ChevronRight size={16} className="inline ml-1" />
          </button>
        </div>
      </div>
    )
  }

  // ── Step 3 — Categories ───────────────────────────────────────────────────
  if (step === 3) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <ProgressBar back={() => setStep(2)} />
        <div className="px-5 mt-6">
          <h1 className="font-serif text-2xl text-chocolate leading-tight">What helps you feel like yourself?</h1>
          <p className="font-sans text-sm text-chocolate/50 mt-2">Select all that resonate.</p>
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
                    isSelected ? 'bg-chocolate border-chocolate text-cream' : 'bg-white border-beige/40'
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
        <div className="px-5 py-6">
          <button onClick={() => setStep(4)} className="btn-primary">
            Continue <ChevronRight size={16} className="inline ml-1" />
          </button>
        </div>
      </div>
    )
  }

  // ── Step 4 — Support Circle ───────────────────────────────────────────────
  if (step === 4) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <ProgressBar back={() => setStep(3)} />
        <div className="px-5 mt-6">
          <h1 className="font-serif text-2xl text-chocolate leading-tight">Who&apos;s in your corner?</h1>
          <p className="font-sans text-sm text-chocolate/50 mt-2">Update your support circle.</p>
        </div>
        <div className="px-5 mt-6 flex-1 space-y-3">
          {supportPeople.map((person, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-4 border border-beige/20 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-display font-semibold text-xs text-chocolate/50 uppercase tracking-wide">
                  Person {idx + 1}
                </p>
                {idx > 0 && (
                  <button
                    onClick={() => setSupportPeople(prev => prev.filter((_, i) => i !== idx))}
                    className="text-chocolate/30"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <input
                type="text"
                value={person.name}
                onChange={e => setSupportPeople(prev => prev.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))}
                placeholder="Their name (e.g., Sarah, Mom)"
                className="w-full bg-cream rounded-xl px-3 py-2.5 font-sans text-sm text-chocolate placeholder:text-chocolate/30 outline-none border border-beige/20 focus:border-mustard transition-colors"
              />
              <input
                type="text"
                value={person.relationship}
                onChange={e => setSupportPeople(prev => prev.map((p, i) => i === idx ? { ...p, relationship: e.target.value } : p))}
                placeholder="Relationship (e.g., My sister, Therapist)"
                className="w-full bg-cream rounded-xl px-3 py-2.5 font-sans text-sm text-chocolate placeholder:text-chocolate/30 outline-none border border-beige/20 focus:border-mustard transition-colors"
              />
            </div>
          ))}
          {supportPeople.length < 3 && (
            <button
              onClick={() => setSupportPeople(prev => [...prev, { name: '', relationship: '' }])}
              className="text-sm text-chocolate/50 font-sans flex items-center gap-1.5"
            >
              + Add another person
            </button>
          )}
        </div>
        <div className="px-5 py-6 space-y-2">
          {saveError && <p className="text-sm text-red-400 font-sans text-center">{saveError}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
          <button onClick={() => handleSave()} className="w-full text-center text-sm text-chocolate/40 font-sans underline py-1">
            Skip support circle & save
          </button>
        </div>
      </div>
    )
  }

  return null
}
