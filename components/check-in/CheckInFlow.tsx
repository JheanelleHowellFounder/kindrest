'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, ChevronRight, ChevronLeft, ThumbsDown, Bookmark, CheckCircle2, ChevronDown } from 'lucide-react'
import { MOODS, MENTAL_INDICATORS, PHYSICAL_INDICATORS, EMOTIONAL_INDICATORS } from '@/lib/mock-data'
import type { MoodLabel, TimeAvailable, Recommendation, RegulationType } from '@/lib/types'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { authedFetch } from '@/lib/api-client'
import { detectCrisisLanguage } from '@/lib/safety'
import { CrisisCard } from '@/components/shared/CrisisCard'

type Step = 'mood' | 'mental' | 'physical' | 'emotional' | 'time' | 'carekit' | 'journal'
type FeedbackRating = 1 | 2 | 3  // 1=skip  2=save  3=did_it

const TIME_OPTIONS = [
  { value: '2_minutes',       label: '2 min',  sub: 'Just a quick breath',  emoji: '⏳' },
  { value: '5_minutes',       label: '5 min',  sub: 'A short reset',        emoji: '🌸' },
  { value: '10_minutes',      label: '10 min', sub: 'Meaningful pause',     emoji: '🌿' },
  { value: '15_plus_minutes', label: '15+ min',sub: 'Deep restoration',     emoji: '🌎' },
]

const STEPS: Step[] = ['mood','mental','physical','emotional','time','carekit']

const JOURNAL_AFFIRMATIONS = [
  "Getting it out of your head is one of the most powerful things you can do for yourself.",
  "You don't have to have it figured out. Writing it down is enough.",
  "The act of naming what you're feeling is already a form of healing.",
  "You showed up for yourself today. That's not a small thing.",
  "There's no right way to feel. You're doing this exactly right.",
  "Sometimes the most productive thing you can do is just let it out.",
  "Your feelings deserve space. Thank you for giving them some.",
  "Writing is how we make sense of the things that don't quite make sense yet.",
  "You are not too much. You are a mother doing her best, and that is everything.",
  "This moment of honesty with yourself matters more than you know.",
]

// Map indicator labels back to their regulation_type for the API
const INDICATOR_TYPE_MAP: Record<string, RegulationType> = {}
;[...MENTAL_INDICATORS, ...PHYSICAL_INDICATORS, ...EMOTIONAL_INDICATORS].forEach(i => {
  if (i.label && i.regulation_type) {
    INDICATOR_TYPE_MAP[i.label] = i.regulation_type as RegulationType
  }
})

// Map the user's selected mood (ui_label lowercase) to Airtable mood_label
const MOOD_TO_LABEL: Record<string, string> = {
  thriving:    'Great',
  good:        'Good',
  okay:        'Okay',
  struggling:  'Struggling',
  overwhelmed: 'Overwhelmed',
}

export function CheckInFlow() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id

  // Redirect unauthenticated visitors to sign in, then bring them right back
  // here — the check-in flow calls real, costed AI endpoints and writes real
  // data, so it must never run for someone who isn't actually signed in.
  useEffect(() => {
    if (!authLoading && !user) router.push('/signin?redirect=/check-in')
  }, [authLoading, user, router])

  const [step, setStep]             = useState<Step>('mood')
  const [mood, setMood]             = useState<MoodLabel | null>(null)
  const [mentalIndicators, setMentalIndicators]     = useState<string[]>([])
  const [physicalIndicators, setPhysicalIndicators] = useState<string[]>([])
  const [emotionalIndicators, setEmotionalIndicators] = useState<string[]>([])
  const [timeAvailable, setTimeAvailable] = useState<TimeAvailable | null>(null)

  // Journal state (unknown door)
  const [journalEntry, setJournalEntry]   = useState('')
  const [journalSaving, setJournalSaving] = useState(false)
  const [journalDone, setJournalDone]     = useState(false)
  const [journalAffirmation, setJournalAffirmation] = useState('')
  const [journalCrisis, setJournalCrisis] = useState(false)

  // Care kit state
  const [careKit, setCareKit]             = useState<Recommendation[]>([])
  const [claudeMessage, setClaudeMessage] = useState<string>('')
  const [isLoading, setIsLoading]         = useState(false)
  const [feedbackSent, setFeedbackSent]   = useState<Record<number, FeedbackRating>>({})
  const [expandedRecs, setExpandedRecs]   = useState<Set<number>>(new Set())
  const [mailingSubscribed, setMailingSubscribed] = useState(false)
  const [retryCount, setRetryCount]       = useState(0)
  const [shownIds, setShownIds]           = useState<number[]>([])

  // Reflective rec — inline journal response
  const [reflectingRecId, setReflectingRecId] = useState<number | null>(null)
  const [reflectionText, setReflectionText]   = useState('')
  const [reflectionSaving, setReflectionSaving] = useState(false)
  const [reflectionDone, setReflectionDone]   = useState<Set<number>>(new Set())
  const [reflectionAffirmations, setReflectionAffirmations] = useState<Record<number, string>>({})
  const [reflectionCrisis, setReflectionCrisis] = useState<Set<number>>(new Set())

  // Pre-load the user's preferred time window from their profile so the time
  // step shows their usual choice already selected (they can always change it)
  useEffect(() => {
    if (!user || !supabase) return
    supabase
      .from('user_profiles')
      .select('preferred_time_window')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.preferred_time_window && !timeAvailable) {
          setTimeAvailable(data.preferred_time_window as TimeAvailable)
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const stepIndex = STEPS.indexOf(step)
  const progress  = (stepIndex / (STEPS.length - 1)) * 100

  // Derive regulation types from all selected indicators
  function getRegulationTypes(): RegulationType[] {
    const allSelected = [...mentalIndicators, ...physicalIndicators, ...emotionalIndicators]
    const types = new Set<RegulationType>()
    allSelected.forEach(label => {
      const type = INDICATOR_TYPE_MAP[label]
      if (type) types.add(type)
    })
    return Array.from(types)
  }

  async function fetchCareKit(excludedIds: number[] = [], broaden = false) {
    if (!mood || !timeAvailable) return
    setIsLoading(true)
    try {
      const res = await authedFetch('/api/care-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood,
          timeAvailable,
          selectedIndicators: [...mentalIndicators, ...physicalIndicators, ...emotionalIndicators],
          // On retry, skip the regulation-type pre-filter so the pool widens
          // to all recs for the current phase — avoids the same 3 coming back.
          regulationTypes: broaden ? [] : getRegulationTypes(),
          userId,
          excludedIds,
        }),
      })
      const data = await res.json()
      if (data.recommendations) {
        setCareKit(data.recommendations)
        // Accumulate all IDs ever shown so future retries avoid them too
        setShownIds(prev => {
          const next = [...prev]
          for (const r of data.recommendations) {
            if (!next.includes(r.rec_id)) next.push(r.rec_id)
          }
          return next
        })
      }
      if (data.message) setClaudeMessage(data.message)

      // First check-in complete: add to MailerLite Active Users (fire-and-forget)
      if (!mailingSubscribed && userId && userId !== 'demo-user-001') {
        setMailingSubscribed(true)
        fetch('/api/mailerlite/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, group: 'active_users' }),
        }).catch(() => {/* non-critical, silent fail */})
      }
    } catch (err) {
      console.error('[CheckInFlow] Failed to fetch care kit:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function sendFeedback(rec: Recommendation, rating: FeedbackRating) {
    // Optimistic UI update
    setFeedbackSent(prev => ({ ...prev, [rec.rec_id]: rating }))

    try {
      await authedFetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          rec_id: rec.rec_id,
          rec_title: rec.title,
          rating,
          checkInMood: mood,
          regulationPhase: rec.regulation_phase,
          regulationType: rec.regulation_type,
          category: rec.category,
          effortLevel: rec.effort_level,
        }),
      })
    } catch (err) {
      console.error('[CheckInFlow] Failed to send feedback:', err)
    }
  }

  async function saveJournalEntry() {
    if (!journalEntry.trim() || !user) return
    setJournalSaving(true)
    try {
      await authedFetch('/api/journal-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: journalEntry.trim(), userId: user.id, source: 'unknown_door' }),
      })
      setJournalCrisis(detectCrisisLanguage(journalEntry))
      const affirmation = JOURNAL_AFFIRMATIONS[Math.floor(Math.random() * JOURNAL_AFFIRMATIONS.length)]
      setJournalAffirmation(affirmation)
      setJournalDone(true)
    } catch (err) {
      console.error('[CheckInFlow] Journal save failed:', err)
    } finally {
      setJournalSaving(false)
    }
  }

  async function saveReflection(rec: Recommendation) {
    if (!reflectionText.trim() || !user) return
    setReflectionSaving(true)
    try {
      await authedFetch('/api/journal-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: reflectionText.trim(),
          userId: user.id,
          source: 'reflective_rec',
        }),
      })
      if (detectCrisisLanguage(reflectionText)) {
        setReflectionCrisis(prev => new Set(prev).add(rec.rec_id))
      }
      const affirmation = JOURNAL_AFFIRMATIONS[Math.floor(Math.random() * JOURNAL_AFFIRMATIONS.length)]
      setReflectionAffirmations(prev => ({ ...prev, [rec.rec_id]: affirmation }))
      setReflectionDone(prev => new Set(prev).add(rec.rec_id))
      setReflectingRecId(null)
      setReflectionText('')
      // Reflecting counts as engagement — log it as "did it"
      sendFeedback(rec, 3)
    } catch (err) {
      console.error('[CheckInFlow] Reflection save failed:', err)
    } finally {
      setReflectionSaving(false)
    }
  }

  function goNext() {
    const next = STEPS[stepIndex + 1]
    if (!next) return
    if (next === 'carekit') {
      setRetryCount(0)
      setShownIds([])
      fetchCareKit()
    }
    setStep(next)
  }

  function goBack() {
    const prev = STEPS[stepIndex - 1]
    if (prev) setStep(prev)
    else router.push('/')
  }

  function toggleIndicator(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  // Filter indicators to only show options relevant to the selected mood
  const moodLabel = mood ? (MOOD_TO_LABEL[mood] ?? 'Okay') : 'Okay'
  const filteredMental   = MENTAL_INDICATORS.filter(i => i.mood_label === moodLabel)
  const filteredPhysical = PHYSICAL_INDICATORS.filter(i => i.mood_label === moodLabel)
  const filteredEmotional = EMOTIONAL_INDICATORS.filter(i => i.mood_label === moodLabel)

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-mustard border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Progress bar */}
      {step !== 'carekit' && step !== 'journal' && (
        <div className="px-5 pt-12 pb-4">
          <div className="flex items-center gap-3">
            {step !== 'mood' && (
              <button onClick={goBack} className="text-chocolate/50">
                <ChevronLeft size={20} />
              </button>
            )}
            <div className="flex-1 h-1.5 bg-beige/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-mustard rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <button onClick={() => router.push('/')} className="text-chocolate/40">
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 px-5 pb-8">

        {/* ── MOOD ─────────────────────────────────────────────────────────── */}
        {step === 'mood' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-serif text-3xl text-chocolate leading-tight">
                How are you feeling right now?
              </h1>
              <p className="font-sans text-sm text-chocolate/50 mt-2">
                There&apos;s no wrong answer, just check in with yourself
              </p>
            </div>
            <div className="space-y-3">
              {MOODS.map((m) => {
                const moodValue = m.ui_label.toLowerCase() as MoodLabel
                const isSelected = mood === moodValue
                return (
                  <button
                    key={m.id}
                    onClick={() => setMood(moodValue)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                      isSelected ? 'border-mustard bg-mustard/5' : 'border-beige/30 bg-white hover:border-beige'
                    }`}
                  >
                    <span className="text-2xl">{m.emoji}</span>
                    <div>
                      <p className="font-display font-semibold text-chocolate">{m.ui_label}</p>
                      <p className="text-xs text-chocolate/50 font-sans">{m.ui_description}</p>
                    </div>
                  </button>
                )
              })}
              <button
                onClick={() => setStep('journal')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-beige/50 bg-transparent hover:border-beige transition-all text-left"
              >
                <span className="text-2xl">✍️</span>
                <div>
                  <p className="font-display font-semibold text-chocolate">I&apos;m not sure</p>
                  <p className="text-xs text-chocolate/50 font-sans">Let&apos;s write it out instead</p>
                </div>
              </button>
            </div>
            {mood && (
              <button onClick={goNext} className="btn-primary">
                Continue <ChevronRight size={16} className="inline ml-1" />
              </button>
            )}
          </div>
        )}

        {/* ── JOURNAL (unknown door) ────────────────────────────────────────── */}
        {step === 'journal' && (
          <div className="space-y-6 pt-2">
            {!journalDone ? (
              <>
                <div>
                  <h1 className="font-serif text-3xl text-chocolate leading-tight">
                    How are you really?
                  </h1>
                  <p className="font-sans text-sm text-chocolate/50 mt-2">
                    No structure needed. Just write what&apos;s true right now.
                  </p>
                </div>
                <textarea
                  value={journalEntry}
                  onChange={e => setJournalEntry(e.target.value)}
                  placeholder="Start anywhere..."
                  rows={8}
                  className="w-full bg-white border border-beige/30 rounded-2xl px-4 py-3 text-base font-sans text-chocolate placeholder:text-chocolate/25 outline-none focus:border-mustard/40 resize-none leading-relaxed"
                  autoFocus
                />
                <button
                  onClick={saveJournalEntry}
                  disabled={!journalEntry.trim() || journalSaving}
                  className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {journalSaving ? 'Saving...' : 'I\'m done writing'}
                </button>
                <button
                  onClick={() => setStep('mood')}
                  className="w-full text-center text-sm text-chocolate/40 font-sans py-2 hover:text-chocolate/60 transition-colors"
                >
                  Back to check-in
                </button>
              </>
            ) : journalCrisis ? (
              <div className="space-y-5 pt-2">
                <CrisisCard />
                <button onClick={() => router.push('/')} className="btn-primary">
                  Back to Home
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                <div className="text-5xl">🤎</div>
                <p className="font-serif text-2xl text-chocolate leading-snug px-4">
                  {journalAffirmation}
                </p>
                <button onClick={() => router.push('/')} className="btn-primary">
                  Back to Home
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── MENTAL ───────────────────────────────────────────────────────── */}
        {step === 'mental' && (
          <IndicatorStep
            title="How's your mind?"
            subtitle="No judgment, just noticing"
            indicators={filteredMental.map(i => ({ label: i.label, emoji: i.emoji }))}
            selected={mentalIndicators}
            onToggle={(v) => toggleIndicator(mentalIndicators, setMentalIndicators, v)}
            onContinue={goNext}
            activeColor="bg-violet-500 text-white border-violet-500"
          />
        )}

        {/* ── PHYSICAL ─────────────────────────────────────────────────────── */}
        {step === 'physical' && (
          <IndicatorStep
            title="How's your body feeling?"
            subtitle="Your body holds so much"
            indicators={filteredPhysical.map(i => ({ label: i.label, emoji: i.emoji }))}
            selected={physicalIndicators}
            onToggle={(v) => toggleIndicator(physicalIndicators, setPhysicalIndicators, v)}
            onContinue={goNext}
            activeColor="bg-emerald-500 text-white border-emerald-500"
          />
        )}

        {/* ── EMOTIONAL ────────────────────────────────────────────────────── */}
        {step === 'emotional' && (
          <IndicatorStep
            title="What's in your heart?"
            subtitle="All feelings are welcome here"
            indicators={filteredEmotional.map(i => ({ label: i.label, emoji: i.emoji }))}
            selected={emotionalIndicators}
            onToggle={(v) => toggleIndicator(emotionalIndicators, setEmotionalIndicators, v)}
            onContinue={goNext}
            activeColor="bg-rose-500 text-white border-rose-500"
          />
        )}

        {/* ── TIME ─────────────────────────────────────────────────────────── */}
        {step === 'time' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-serif text-3xl text-chocolate leading-tight">
                How much time do you have?
              </h1>
              <p className="font-sans text-sm text-chocolate/50 mt-2">
                Even 2 minutes can make a difference
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {TIME_OPTIONS.map((opt) => {
                const isSelected = timeAvailable === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTimeAvailable(opt.value as TimeAvailable)}
                    className={`p-4 rounded-2xl border-2 text-center transition-all ${
                      isSelected ? 'border-mustard bg-mustard/5' : 'border-beige/30 bg-white hover:border-beige'
                    }`}
                  >
                    <div className="text-2xl mb-1">{opt.emoji}</div>
                    <p className="font-display font-bold text-chocolate">{opt.label}</p>
                    <p className="text-xs text-chocolate/50 font-sans">{opt.sub}</p>
                  </button>
                )
              })}
            </div>
            <div className="bg-rose-50 rounded-xl p-3 flex items-center gap-2">
              <span className="text-rose-400">❤</span>
              <p className="text-xs text-rose-600 font-sans">
                Remember: caring for yourself isn&apos;t selfish, it&apos;s essential
              </p>
            </div>
            {timeAvailable && (
              <button onClick={goNext} className="btn-primary">
                Create My Care Kit
              </button>
            )}
          </div>
        )}

        {/* ── CARE KIT ─────────────────────────────────────────────────────── */}
        {step === 'carekit' && (
          <div className="space-y-5 pt-4">
            <div>
              <p className="text-xs font-display font-semibold text-mustard uppercase tracking-widest mb-1">
                Your Care Kit
              </p>
              <h1 className="font-serif text-2xl text-chocolate leading-tight">
                Take a moment
              </h1>

              {/* Mood + time context pill */}
              {mood && timeAvailable && !isLoading && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1.5 bg-beige/40 rounded-full px-3 py-1 text-xs font-display font-semibold text-chocolate/70 capitalize">
                    {mood === 'overwhelmed' ? '😢' : mood === 'struggling' ? '😔' : mood === 'okay' ? '😐' : mood === 'good' ? '😊' : '✨'}
                    {mood}
                  </span>
                  <span className="text-chocolate/30 text-xs">·</span>
                  <span className="inline-flex items-center gap-1.5 bg-beige/40 rounded-full px-3 py-1 text-xs font-display font-semibold text-chocolate/70">
                    {timeAvailable.replace('_', ' ').replace('plus', '+')}
                  </span>
                </div>
              )}

              {/* Claude's warm message */}
              {isLoading ? (
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-mustard border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-chocolate/50 font-sans">Building your care kit…</p>
                </div>
              ) : claudeMessage ? (
                <p className="font-sans text-sm text-chocolate/70 mt-2 leading-relaxed">
                  {claudeMessage}
                </p>
              ) : (
                <p className="font-sans text-sm text-chocolate/50 mt-1">
                  Give yourself permission to pause.
                </p>
              )}
            </div>

            {/* Recommendations with feedback */}
            <div className="space-y-3">
              {isLoading ? (
                // Skeleton cards while loading
                [0, 1, 2].map(i => (
                  <div key={i} className={`rounded-2xl p-4 animate-pulse ${i === 0 ? 'bg-chocolate/10 h-28' : 'bg-beige/20 h-20'}`} />
                ))
              ) : (
                careKit.map((rec, i) => {
                  const fb = feedbackSent[rec.rec_id]
                  const isPrimary = i === 0
                  const isExpanded = expandedRecs.has(rec.rec_id)

                  return (
                    <div
                      key={rec.id}
                      className={`rounded-2xl p-4 transition-all ${
                        isPrimary ? 'bg-chocolate text-white' : 'bg-white border border-beige/30'
                      } ${fb ? 'opacity-80' : ''}`}
                    >
                      {/* Card header — tappable on secondary to expand */}
                      <div
                        className={`flex items-start justify-between gap-3 ${!isPrimary ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          if (!isPrimary) {
                            setExpandedRecs(prev => {
                              const next = new Set(prev)
                              next.has(rec.rec_id) ? next.delete(rec.rec_id) : next.add(rec.rec_id)
                              return next
                            })
                          }
                        }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-display font-semibold text-mustard">
                              {rec.category}
                            </span>
                            <span className={`text-xs font-sans ${isPrimary ? 'text-white/40' : 'text-chocolate/40'}`}>
                              · {rec.effort_level} effort · {rec.time_suggestion}
                            </span>
                          </div>
                          <h3 className={`font-display font-semibold text-base ${isPrimary ? 'text-white' : 'text-chocolate'}`}>
                            {rec.title}
                          </h3>
                          {isPrimary && (
                            <p className="text-sm mt-1 font-sans text-white/70">
                              {rec.description}
                            </p>
                          )}
                          {/* Expandable description for secondary cards */}
                          {!isPrimary && isExpanded && (
                            <p className="text-sm mt-2 font-sans text-chocolate/60 leading-relaxed">
                              {rec.description}
                            </p>
                          )}
                        </div>
                        {isPrimary ? (
                          <span className="text-xs bg-mustard text-white px-2 py-0.5 rounded-full font-display font-semibold whitespace-nowrap">
                            Primary
                          </span>
                        ) : (
                          <ChevronDown
                            size={16}
                            className={`text-chocolate/30 flex-shrink-0 mt-0.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        )}
                      </div>

                      {/* Feedback row — stacked layout so buttons never overflow */}
                      <div className={`mt-3 pt-3 border-t ${isPrimary ? 'border-white/10' : 'border-beige/30'}`}>
                        {reflectionDone.has(rec.rec_id) && reflectionCrisis.has(rec.rec_id) ? (
                          <CrisisCard />
                        ) : reflectionDone.has(rec.rec_id) ? (
                          <p className={`text-xs font-sans leading-relaxed ${isPrimary ? 'text-white/60' : 'text-chocolate/50'}`}>
                            🤎 {reflectionAffirmations[rec.rec_id] ?? 'You reflected on this. That matters.'}
                          </p>
                        ) : fb ? (
                          <p className={`text-xs font-sans ${isPrimary ? 'text-white/50' : 'text-chocolate/40'}`}>
                            {fb === 1 ? 'Not for me' : fb === 2 ? '✓ Saved for later' : '✓ I did this!'}
                          </p>
                        ) : rec.category === 'Reflection' && reflectingRecId === rec.rec_id ? (
                          <div className="space-y-2">
                            <textarea
                              value={reflectionText}
                              onChange={e => setReflectionText(e.target.value)}
                              placeholder="Write here..."
                              rows={5}
                              autoFocus
                              className={`w-full rounded-xl px-3 py-2.5 text-base font-sans resize-none outline-none leading-relaxed ${
                                isPrimary
                                  ? 'bg-white/10 text-white placeholder:text-white/30 border border-white/10 focus:border-white/30'
                                  : 'bg-beige/20 text-chocolate placeholder:text-chocolate/25 border border-beige/30 focus:border-mustard/40'
                              }`}
                            />
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => { setReflectingRecId(null); setReflectionText('') }}
                                className={`flex-1 px-2 py-1.5 rounded-full text-[11px] font-display font-semibold ${
                                  isPrimary ? 'bg-white/10 text-white' : 'bg-beige/30 text-chocolate'
                                }`}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => saveReflection(rec)}
                                disabled={!reflectionText.trim() || reflectionSaving}
                                className="flex-1 px-2 py-1.5 rounded-full text-[11px] font-display font-semibold bg-mustard text-white disabled:opacity-40"
                              >
                                {reflectionSaving ? 'Saving...' : 'Done'}
                              </button>
                            </div>
                          </div>
                        ) : rec.category === 'Reflection' ? (
                          <div>
                            <p className={`text-xs font-sans mb-2 ${isPrimary ? 'text-white/50' : 'text-chocolate/40'}`}>
                              Want to reflect on this right here?
                            </p>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setReflectingRecId(rec.rec_id)}
                                className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-full text-[11px] font-display font-semibold transition-all active:scale-95 bg-mustard text-white`}
                              >
                                Do this here
                              </button>
                              <FeedbackButton
                                icon={<ThumbsDown size={12} />}
                                label="Not for me"
                                onClick={() => sendFeedback(rec, 1)}
                                isPrimary={isPrimary}
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className={`text-xs font-sans mb-2 ${isPrimary ? 'text-white/50' : 'text-chocolate/40'}`}>
                              Did this help?
                            </p>
                            <div className="flex gap-1.5">
                              <FeedbackButton
                                icon={<ThumbsDown size={12} />}
                                label="Not for me"
                                onClick={() => sendFeedback(rec, 1)}
                                isPrimary={isPrimary}
                              />
                              <FeedbackButton
                                icon={<Bookmark size={12} />}
                                label="Save for later"
                                onClick={() => sendFeedback(rec, 2)}
                                isPrimary={isPrimary}
                              />
                              <FeedbackButton
                                icon={<CheckCircle2 size={12} />}
                                label="I did this"
                                onClick={() => sendFeedback(rec, 3)}
                                isPrimary={isPrimary}
                                highlight
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer actions */}
            <div className="space-y-2">
              <button onClick={() => router.push('/')} className="btn-primary">
                Back to Home
              </button>
              {!isLoading && careKit.length > 0 && (
                <button
                  onClick={() => {
                    setFeedbackSent({})
                    setExpandedRecs(new Set())
                    const nextCount = retryCount + 1
                    setRetryCount(nextCount)
                    // broaden=true from the first retry onward so the pool
                    // widens beyond the user's selected indicator types
                    fetchCareKit(shownIds, nextCount >= 1)
                  }}
                  className="w-full text-center text-sm text-chocolate/40 font-sans py-2 hover:text-chocolate/60 transition-colors"
                >
                  {retryCount === 0 ? 'Try different suggestions' : 'Show me something else'}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Feedback Button ───────────────────────────────────────────────────────────

function FeedbackButton({
  icon, label, onClick, isPrimary, highlight = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  isPrimary: boolean
  highlight?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-full text-[11px] font-display font-semibold transition-all active:scale-95 ${
        highlight
          ? 'bg-mustard text-white'
          : isPrimary
            ? 'bg-white/10 text-white hover:bg-white/20'
            : 'bg-beige/30 text-chocolate hover:bg-beige/50'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

// ── Indicator Step ────────────────────────────────────────────────────────────

function IndicatorStep({
  title, subtitle, indicators, selected, onToggle, onContinue, activeColor,
}: {
  title: string
  subtitle: string
  indicators: { label: string; emoji: string }[]
  selected: string[]
  onToggle: (v: string) => void
  onContinue: () => void
  activeColor: string
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-chocolate leading-tight">{title}</h1>
        <p className="font-sans text-sm text-chocolate/50 mt-2">{subtitle}</p>
      </div>
      <div className="space-y-2.5">
        {indicators.map(({ label, emoji }) => {
          const isSelected = selected.includes(label)
          return (
            <button
              key={label}
              onClick={() => onToggle(label)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                isSelected ? activeColor : 'border-beige/30 bg-white text-chocolate hover:border-beige'
              }`}
            >
              <span className="text-xl">{emoji}</span>
              <span className="font-sans text-sm font-medium">{label}</span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-center text-chocolate/40 font-sans">
        Tap any that feel true right now
      </p>
      <button onClick={onContinue} className="btn-primary">
        Continue <ChevronRight size={16} className="inline ml-1" />
      </button>
    </div>
  )
}

// ── Moment Step ───────────────────────────────────────────────────────────────

function MomentStep({
  step, total, instruction, onNext, onBack, isFinal = false,
}: {
  step: number
  total: number
  instruction: string
  onNext: () => void
  onBack: () => void
  isFinal?: boolean
}) {
  return (
    <div className="flex flex-col min-h-[70vh] justify-between py-6">
      <div className="bg-amber-50/60 rounded-2xl p-6 flex-1 flex flex-col justify-between">
        <div>
          <h2 className="font-display font-semibold text-chocolate text-xl mb-1">Take a moment</h2>
          <p className="text-sm text-chocolate/50 font-sans mb-4">Give yourself permission to pause.</p>
          <div className="flex gap-1.5 mb-6">
            {[...Array(total)].map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < step ? 'bg-mustard' : 'bg-beige/40'}`} />
            ))}
          </div>
          <div className="bg-white rounded-xl p-4 flex items-center gap-3">
            <span className="w-7 h-7 bg-mustard/10 rounded-full flex items-center justify-center text-sm font-display font-bold text-mustard flex-shrink-0">
              {step}
            </span>
            <p className="font-display font-semibold text-chocolate">{instruction}</p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <button onClick={onNext} className="btn-primary">
            {isFinal ? 'Done ✓' : <>Next <ChevronRight size={16} className="inline" /></>}
          </button>
          <button onClick={onBack} className="w-full text-center text-sm text-chocolate/40 font-sans py-2">
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}
