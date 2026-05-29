'use client'

import { useState, useEffect } from 'react'
import {
  Gauge, Sun, Layers, Plus,
  Mail, Lock, Shield, LogOut, ChevronRight,
  ChevronLeft, X, Check,
} from 'lucide-react'
import type { MotherhoodStage } from '@/lib/types'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FeedbackSheet } from '@/components/shared/FeedbackSheet'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedProfile {
  motherhood_stage: MotherhoodStage | null
  preferred_time_window: string | null
  preferred_categories: string[]
  support_people: { name: string; relationship: string }[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MOTHERHOOD_STAGES: { value: MotherhoodStage; label: string; emoji: string }[] = [
  { value: 'expecting',  label: 'Expecting',         emoji: '✨' },
  { value: 'newborn',    label: 'Newborn (0-3mo)',   emoji: '🌙' },
  { value: 'infant',     label: 'Infant (3-12mo)',   emoji: '💛' },
  { value: 'toddler',    label: 'Toddler (1-3yr)',   emoji: '⭐' },
  { value: 'preschool',  label: 'Preschool (3-5yr)', emoji: '🎨' },
  { value: 'school_age', label: 'School Age (5+)',   emoji: '📚' },
]

const TIME_OPTIONS = [
  { value: '2_minutes',       emoji: '⚡', label: '2 minutes',   sub: 'Just a breath between moments' },
  { value: '5_minutes',       emoji: '🌿', label: '5 minutes',   sub: 'A small window to reset' },
  { value: '10_minutes',      emoji: '☀️', label: '10 minutes',  sub: 'Enough space to breathe' },
  { value: '15_plus_minutes', emoji: '🌙', label: '15+ minutes', sub: 'Real time for yourself' },
]

const CATEGORIES = [
  { value: 'Rest',           label: 'Rest & stillness',         emoji: '🌙' },
  { value: 'Micro Practice', label: 'Small things that help',   emoji: '✨' },
  { value: 'Joy',            label: 'Doing what lights me up',  emoji: '💛' },
  { value: 'Movement',       label: 'Moving my body',           emoji: '🌿' },
  { value: 'Reflection',     label: 'Checking in with myself',  emoji: '🪞' },
  { value: 'Connection',     label: 'Time with people I trust', emoji: '💬' },
]

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.value, c.label])
)

const CATEGORY_EMOJI_MAP: Record<string, string> = {
  'Rest':           '🌙',
  'Micro Practice': '✨',
  'Joy':            '💛',
  'Movement':       '🌿',
  'Reflection':     '🪞',
  'Connection':     '💬',
}

// Map time window → effort label (matches what recommendation engine uses)
const EFFORT_FROM_TIME: Record<string, string> = {
  '2_minutes':       'Low · 2–5 minutes',
  '5_minutes':       'Low · 2–5 minutes',
  '10_minutes':      'Medium · 10 minutes',
  '15_plus_minutes': 'Medium · 15+ minutes',
}

// Cycling avatar background colours for support circle
const AVATAR_COLORS = ['#c9981f', '#30211a', '#a9743a', '#6d5a4e']

// ─── Main Profile View ────────────────────────────────────────────────────────

export function ProfileScreen() {
  const { user: authUser, signOut } = useAuth()
  const router = useRouter()

  const userId = authUser?.id ?? 'demo-user-001'
  const name   = authUser?.user_metadata?.name ?? authUser?.email?.split('@')[0] ?? 'You'

  const memberSince = authUser?.created_at
    ? new Date(authUser.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  type ProfileView = 'main' | 'update'
  const [view, setView]               = useState<ProfileView>('main')
  const [editStep, setEditStep]       = useState(1)
  const [showFeedback, setShowFeedback] = useState(false)

  const [savedProfile, setSavedProfile] = useState<SavedProfile>({
    motherhood_stage:      null,
    preferred_time_window: null,
    preferred_categories:  [],
    support_people:        [],
  })

  function openEdit(step: number) {
    setEditStep(step)
    setView('update')
  }

  // Load profile from Supabase
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
            motherhood_stage:      data.motherhood_stage      ?? null,
            preferred_time_window: data.preferred_time_window ?? null,
            preferred_categories:  data.preferred_categories  ?? [],
            support_people:        data.support_people        ?? [],
          })
        }
      })
  }, [authUser])

  if (view === 'update') {
    return (
      <UpdateProfileFlow
        userId={authUser?.id ?? ''}
        initial={savedProfile}
        initialStep={editStep}
        onSaved={updated => { setSavedProfile(updated); setView('main') }}
        onClose={() => setView('main')}
      />
    )
  }

  // Derive display values
  const effortLabel    = EFFORT_FROM_TIME[savedProfile.preferred_time_window ?? ''] ?? null
  const timeLabel      = TIME_OPTIONS.find(t => t.value === savedProfile.preferred_time_window)
  const topCategories  = savedProfile.preferred_categories.slice(0, 4)
  const knownPeople    = savedProfile.support_people.filter(p => p.name.trim())

  const knowsAnything  = effortLabel || timeLabel || topCategories.length > 0

  return (
    <div className="flex flex-col min-h-screen pb-24">

      {/* Profile header ─────────────────────────────────────────────────── */}
      <div className="px-5 pt-10 pb-2">
        <div className="flex items-center gap-4">
          <div
            className="w-[60px] h-[60px] rounded-full flex items-center justify-center font-serif font-bold text-[26px] text-white flex-shrink-0"
            style={{ background: '#c9981f' }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-serif text-[24px] text-chocolate leading-[1.12]">{name}</h1>
            {memberSince && (
              <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-mustard mt-1.5">
                Member since {memberSince}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-5">

        {/* ── "What Kindrest knows" section ──────────────────────────────── */}
        <div>
          <p className="font-display font-semibold text-[12px] uppercase tracking-[0.14em] text-chocolate/40 mb-3">
            What Kindrest knows about me
          </p>

          {/* Desktop: Patterns + Support side by side. Mobile: stacked. */}
          <div className="md:grid md:grid-cols-[1.25fr_1fr] md:gap-5 md:items-start space-y-4 md:space-y-0">

            {/* Patterns card */}
            <div className="bg-white rounded-2xl shadow-[0_6px_18px_-8px_rgba(48,33,26,0.18)] p-5">
              <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-mustard mb-1">
                Your patterns
              </p>
              <h3 className="font-serif text-[19px] text-chocolate mb-3">Shaped by your check-ins</h3>

              {knowsAnything ? (
                <div>
                  {/* Effort */}
                  {effortLabel && (
                    <div className="flex items-center gap-3.5 py-3.5">
                      <div className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0"
                        style={{ background: '#f0e9e2' }}>
                        <Gauge size={18} className="text-mustard" />
                      </div>
                      <div>
                        <p className="text-[12.5px] text-chocolate/50 font-sans">Preferred effort</p>
                        <p className="font-display font-semibold text-[14.5px] text-chocolate mt-0.5">{effortLabel}</p>
                      </div>
                    </div>
                  )}

                  {/* Time preference */}
                  {timeLabel && (
                    <div className={`flex items-center gap-3.5 py-3.5 ${effortLabel ? 'border-t border-beige/30' : ''}`}>
                      <div className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0"
                        style={{ background: '#f0e9e2' }}>
                        <Sun size={18} className="text-mustard" />
                      </div>
                      <div>
                        <p className="text-[12.5px] text-chocolate/50 font-sans">Time preference</p>
                        <p className="font-display font-semibold text-[14.5px] text-chocolate mt-0.5">
                          {timeLabel.sub}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Top categories */}
                  {topCategories.length > 0 && (
                    <div className={`flex items-start gap-3.5 py-3.5 ${(effortLabel || timeLabel) ? 'border-t border-beige/30' : ''}`}>
                      <div className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: '#f0e9e2' }}>
                        <Layers size={18} className="text-mustard" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[12.5px] text-chocolate/50 font-sans mb-2">Top categories</p>
                        <div className="flex flex-wrap gap-2">
                          {topCategories.map((cat, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5 bg-[#f0e9e2] border border-beige/50 rounded-full px-3 py-1.5 font-display font-semibold text-[13px] text-chocolate">
                              {CATEGORY_EMOJI_MAP[cat] ?? ''} {CATEGORY_LABELS[cat] ?? cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-3 text-center">
                  <p className="text-sm text-chocolate/40 font-sans">
                    Complete your profile to see your patterns here.
                  </p>
                </div>
              )}

              <button
                onClick={() => openEdit(2)}
                className="mt-2 text-mustard font-display font-semibold text-[13.5px]"
              >
                Update preferences →
              </button>
            </div>

            {/* Support circle */}
            <div className="bg-white rounded-2xl shadow-[0_6px_18px_-8px_rgba(48,33,26,0.18)] p-5">
              <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-mustard mb-1 whitespace-nowrap">
                Your support circle
              </p>
              <h3 className="font-serif text-[19px] text-chocolate mb-3">Who&apos;s in your corner</h3>

              <div>
                {knownPeople.map((person, i) => (
                  <div key={i} className={`flex items-center gap-3 py-3 ${i > 0 ? 'border-t border-beige/30' : ''}`}>
                    <div
                      className="w-[42px] h-[42px] rounded-full flex items-center justify-center font-serif font-bold text-[17px] text-white flex-shrink-0"
                      style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    >
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-[14.5px] text-chocolate">{person.name}</p>
                      <p className="text-[12.5px] text-chocolate/50 font-sans">{person.relationship}</p>
                    </div>
                  </div>
                ))}
              </div>

              {knownPeople.length === 0 && (
                <p className="text-sm text-chocolate/40 font-sans pb-1">No one added yet.</p>
              )}

              <button
                onClick={() => openEdit(4)}
                className="inline-flex items-center gap-1.5 mt-3 text-mustard font-display font-semibold text-[13.5px]"
              >
                <Plus size={16} /> Add someone
              </button>
            </div>
          </div>{/* end two-column grid */}
        </div>{/* end "What Kindrest knows" section */}

        {/* ── Account & settings — full width below both columns ──────────── */}
        <div className="space-y-4">
          <p className="font-display font-semibold text-[12px] uppercase tracking-[0.14em] text-chocolate/40">
            Account &amp; settings
          </p>

          <div className="bg-white rounded-2xl border border-beige/40 p-5">
            <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-mustard mb-1">
              Settings
            </p>
            <h3 className="font-serif text-[19px] text-chocolate mb-2">Account &amp; privacy</h3>

            <div className="mt-1">
              {[
                { icon: Mail,   label: 'Email & sign-in' },
                { icon: Lock,   label: 'Password' },
                { icon: Shield, label: 'Privacy & data' },
              ].map(({ icon: Ico, label }, i) => (
                <div key={i} className={`flex items-center gap-3 py-3.5 cursor-pointer ${i > 0 ? 'border-t border-beige/20' : ''}`}>
                  <Ico size={17} className="text-chocolate/40 flex-shrink-0" />
                  <span className="flex-1 font-sans text-[14px] text-chocolate">{label}</span>
                  <ChevronRight size={17} className="text-chocolate/25" />
                </div>
              ))}

              <div
                className="border-t border-beige/20 flex items-center gap-3 py-3.5 cursor-pointer"
                onClick={async () => { await signOut(); router.replace('/') }}
              >
                <LogOut size={17} className="flex-shrink-0" style={{ color: '#9a3a1f' }} />
                <span className="font-sans text-[14px]" style={{ color: '#9a3a1f' }}>Sign out</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowFeedback(true)}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-chocolate/50 font-sans border border-beige/40 rounded-2xl hover:border-mustard/40 transition-colors"
          >
            Share feedback
          </button>
        </div>

      </div>

      {showFeedback && (
        <FeedbackSheet
          userId={userId}
          email={authUser?.email ?? ''}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </div>
  )
}


// ── Update Profile Flow ───────────────────────────────────────────────────────
// Preserved exactly — opens as a full-screen overlay from the profile page.

function UpdateProfileFlow({
  userId,
  initial,
  initialStep = 1,
  onSaved,
  onClose,
}: {
  userId: string
  initial: SavedProfile
  initialStep?: number
  onSaved: (p: SavedProfile) => void
  onClose: () => void
}) {
  const totalSteps = 4
  const [step, setStep]     = useState(initialStep)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [selectedStage, setSelectedStage]           = useState<MotherhoodStage | null>(initial.motherhood_stage)
  const [selectedTime, setSelectedTime]             = useState<string | null>(initial.preferred_time_window)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initial.preferred_categories)
  const [supportPeople, setSupportPeople]           = useState<{ name: string; relationship: string }[]>(
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
      user_id:                userId,
      motherhood_stage:       selectedStage,
      preferred_time_window:  selectedTime,
      preferred_categories:   selectedCategories,
      support_people:         cleanPeople,
      updated_at:             new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (profileError) {
      setSaveError('Something went wrong. Please try again.')
      setSaving(false)
      return
    }

    // Keep preference profile in sync so recommendations stay accurate
    await supabase.from('user_preference_profile').upsert(
      { user_id: userId, preferred_categories: selectedCategories, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

    setSaving(false)
    onSaved({
      motherhood_stage:      selectedStage,
      preferred_time_window: selectedTime,
      preferred_categories:  selectedCategories,
      support_people:        cleanPeople,
    })
  }

  // ── Progress bar ──────────────────────────────────────────────────────────
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
      <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[55] bg-cream flex flex-col">
        <ProgressBar back={onClose} />
        <div className="px-5 mt-6 overflow-y-auto flex-1 pb-32">
          <h1 className="font-serif text-3xl text-chocolate leading-tight">Where are you right now?</h1>
          <p className="font-sans text-sm text-chocolate/50 mt-2 mb-6">Update your motherhood stage</p>
          <div className="space-y-2.5">
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
        </div>
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[56] px-5 pb-8 pt-4 bg-cream border-t border-beige/20">
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
      <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[55] bg-cream flex flex-col">
        <ProgressBar back={() => setStep(1)} />
        <div className="px-5 mt-6 overflow-y-auto flex-1 pb-32">
          <h1 className="font-serif text-2xl text-chocolate leading-tight">How much time do you have these days?</h1>
          <p className="font-sans text-sm text-chocolate/50 mt-2 mb-6">On most days...</p>
          <div className="space-y-3">
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
        </div>
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[56] px-5 pb-8 pt-4 bg-cream border-t border-beige/20">
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
      <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[55] bg-cream flex flex-col">
        <ProgressBar back={() => setStep(2)} />
        <div className="px-5 mt-6 overflow-y-auto flex-1 pb-32">
          <h1 className="font-serif text-2xl text-chocolate leading-tight">What helps you feel like yourself?</h1>
          <p className="font-sans text-sm text-chocolate/50 mt-2 mb-6">Select all that resonate.</p>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map(({ value, label, emoji }) => {
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
                  <span className={`font-display font-semibold text-xs text-center leading-tight ${isSelected ? 'text-cream' : 'text-chocolate'}`}>
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[56] px-5 pb-8 pt-4 bg-cream border-t border-beige/20">
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
      <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[55] bg-cream flex flex-col">
        <ProgressBar back={() => setStep(3)} />
        <div className="px-5 mt-6 overflow-y-auto flex-1 pb-40">
          <h1 className="font-serif text-2xl text-chocolate leading-tight">Who&apos;s in your corner?</h1>
          <p className="font-sans text-sm text-chocolate/50 mt-2 mb-6">Update your support circle.</p>
          <div className="space-y-3">
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
                  className="w-full bg-cream rounded-xl px-3 py-2.5 font-sans text-[16px] text-chocolate placeholder:text-chocolate/30 outline-none border border-beige/20 focus:border-mustard transition-colors"
                />
                <input
                  type="text"
                  value={person.relationship}
                  onChange={e => setSupportPeople(prev => prev.map((p, i) => i === idx ? { ...p, relationship: e.target.value } : p))}
                  placeholder="Relationship (e.g., My sister, Therapist)"
                  className="w-full bg-cream rounded-xl px-3 py-2.5 font-sans text-[16px] text-chocolate placeholder:text-chocolate/30 outline-none border border-beige/20 focus:border-mustard transition-colors"
                />
              </div>
            ))}
            {supportPeople.length < 3 && (
              <button
                onClick={() => setSupportPeople(prev => [...prev, { name: '', relationship: '' }])}
                className="text-sm text-mustard font-display font-semibold flex items-center gap-1.5"
              >
                + Add another person
              </button>
            )}
          </div>
        </div>
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[56] px-5 pb-8 pt-4 bg-cream border-t border-beige/20 space-y-2">
          {saveError && <p className="text-sm text-red-400 font-sans text-center">{saveError}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
          <button
            onClick={() => handleSave()}
            className="w-full text-center text-sm text-chocolate/40 font-sans underline py-1"
          >
            Skip support circle &amp; save
          </button>
        </div>
      </div>
    )
  }

  return null
}
