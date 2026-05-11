'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ChevronRight, ChevronLeft, ThumbsDown, Bookmark, CheckCircle2 } from 'lucide-react'
import { MOODS, MENTAL_INDICATORS, PHYSICAL_INDICATORS, EMOTIONAL_INDICATORS } from '@/lib/mock-data'
import type { MoodLabel, TimeAvailable, Recommendation, RegulationType } from '@/lib/types'
import { useAuth } from '@/lib/auth-context'

type Step = 'mood' | 'mental' | 'physical' | 'emotional' | 'time' | 'carekit'
type FeedbackRating = 1 | 2 | 3  // 1=skip  2=save  3=did_it

const TIME_OPTIONS = [
  { value: '2_minutes',       label: '2 min',  sub: 'Just a quick breath',  emoji: '⏳' },
  { value: '5_minutes',       label: '5 min',  sub: 'A short reset',        emoji: '🌸' },
  { value: '10_minutes',      label: '10 min', sub: 'Meaningful pause',     emoji: '🌿' },
  { value: '15_plus_minutes', label: '15+ min',sub: 'Deep restoration',     emoji: '🌎' },
]

const STEPS: Step[] = ['mood','mental','physical','emotional','time','carekit']

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
  overwhelmed: 'Off',
}

export function CheckInFlow() {
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id ?? 'demo-user-001'

  const [step, setStep]             = useState<Step>('mood')
  const [mood, setMood]             = useState<MoodLabel | null>(null)
  const [mentalIndicators, setMentalIndicators]     = useState<string[]>([])
  const [physicalIndicators, setPhysicalIndicators] = useState<string[]>([])
  const [emotionalIndicators, setEmotionalIndicators] = useState<string[]>([])
  const [timeAvailable, setTimeAvailable] = useState<TimeAvailable | null>(null)

  // Care kit state
  const [careKit, setCareKit]           = useState<Recommendation[]>([])
  const [claudeMessage, setClaudeMessage] = useState<string>('')
  const [isLoading, setIsLoading]       = useState(false)
  const [feedbackSent, setFeedbackSent]           = useState<Record<number, FeedbackRating>>({})
  const [mailingSubscribed, setMailingSubscribed] = useState(false)

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

  async function fetchCareKit() {
    if (!mood || !timeAvailable) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/care-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood,
          timeAvailable,
          selectedIndicators: [...mentalIndicators, ...physicalIndicators, ...emotionalIndicators],
          regulationTypes: getRegulationTypes(),
          userId,
        }),
      })
      const data = await res.json()
      if (data.recommendations) setCareKit(data.recommendations)
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
      await fetch('/api/feedback', {
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

  function goNext() {
    const next = STEPS[stepIndex + 1]
    if (!next) return
    if (next === 'carekit') {
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

  return (
    <div className="flex flex-col min-h-screen">
      {/* Progress bar */}
      {step !== 'carekit' && (
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
                There&apos;s no wrong answer — just check in with yourself
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
            </div>
            {mood && (
              <button onClick={goNext} className="btn-primary">
                Continue <ChevronRight size={16} className="inline ml-1" />
              </button>
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
                Remember: caring for yourself isn&apos;t selfish — it&apos;s essential
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
                  return (
                    <div
                      key={rec.id}
                      className={`rounded-2xl p-4 transition-all ${
                        isPrimary ? 'bg-chocolate text-white' : 'bg-white border border-beige/30'
                      } ${fb ? 'opacity-80' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
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
                          <p className={`text-sm mt-1 font-sans ${isPrimary ? 'text-white/70' : 'text-chocolate/60'}`}>
                            {rec.description}
                          </p>
                        </div>
                        {isPrimary && (
                          <span className="text-xs bg-mustard text-white px-2 py-0.5 rounded-full font-display font-semibold whitespace-nowrap">
                            Primary
                          </span>
                        )}
                      </div>

                      {/* Feedback row */}
                      <div className={`mt-3 pt-3 border-t ${isPrimary ? 'border-white/10' : 'border-beige/30'}`}>
                        {fb ? (
                          <p className={`text-xs font-sans ${isPrimary ? 'text-white/50' : 'text-chocolate/40'}`}>
                            {fb === 1 ? 'Not for me' : fb === 2 ? '✓ Saved for later' : '✓ I did this!'}
                          </p>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className={`text-xs font-sans mr-1 ${isPrimary ? 'text-white/50' : 'text-chocolate/40'}`}>
                              Did this help?
                            </p>
                            <FeedbackButton
                              icon={<ThumbsDown size={13} />}
                              label="Not for me"
                              onClick={() => sendFeedback(rec, 1)}
                              isPrimary={isPrimary}
                            />
                            <FeedbackButton
                              icon={<Bookmark size={13} />}
                              label="Save for later"
                              onClick={() => sendFeedback(rec, 2)}
                              isPrimary={isPrimary}
                            />
                            <FeedbackButton
                              icon={<CheckCircle2 size={13} />}
                              label="I did this"
                              onClick={() => sendFeedback(rec, 3)}
                              isPrimary={isPrimary}
                              highlight
                            />
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
      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-display font-semibold transition-all active:scale-95 ${
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
