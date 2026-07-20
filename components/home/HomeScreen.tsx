'use client'

import Link from 'next/link'
import { Play, Clock, Bookmark, MessageCircle } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { authedFetch } from '@/lib/api-client'
import { FeedbackSheet } from '@/components/shared/FeedbackSheet'

// ─── Constants ────────────────────────────────────────────────────────────────

const QUOTE_POOL = [
  '"One moment at a time."',
  '"You are doing better than you think."',
  '"Rest is not a reward. It is a requirement."',
  '"You haven\'t lost yourself. You are still here."',
]

const CATEGORY_EMOJI: Record<string, string> = {
  'Rest':           '🌙',
  'Micro Practice': '✨',
  'Joy':            '💛',
  'Movement':       '🌿',
  'Reflection':     '🪞',
  'Connection':     '💬',
}

const STAGE_CONTENT: Record<string, { label: string; emoji: string; facts: string[] }> = {
  expecting: {
    label: 'Expecting',
    emoji: '✨',
    facts: [
      'Your body is doing something remarkable right now. Rest without guilt.',
      'Preparing for a baby is also preparing for a new version of yourself.',
      'Every worry you carry about being a good mother? That\'s already the love.',
    ],
  },
  newborn: {
    label: 'Newborn (0–3 months)',
    emoji: '🌙',
    facts: [
      'The fourth trimester is real. You\'re recovering while also learning someone new.',
      'Survival mode is a valid mode. You\'re doing it.',
      'There\'s no such thing as too much rest in these early weeks.',
    ],
  },
  infant: {
    label: 'Infant (3–12 months)',
    emoji: '💛',
    facts: [
      'You\'re learning this baby at the same time they\'re learning the world.',
      'Development milestones are ranges, not deadlines. You both have time.',
      'Sleep deprivation is a real stressor. What you\'re carrying is heavy.',
    ],
  },
  toddler: {
    label: 'Toddler years (1–3)',
    emoji: '⭐',
    facts: [
      'Toddlers test limits because they trust you enough to test them.',
      'The big feelings make sense. They are learning to be human.',
      'You don\'t have to love every stage. You just have to get through it.',
    ],
  },
  preschool: {
    label: 'Preschool years (3–5)',
    emoji: '🎨',
    facts: [
      'Their questions are not interruptions, though needing a break from them is okay too.',
      'Play is work at this age. You\'ve been right there with them.',
      'There\'s a lot of you in who they\'re becoming.',
    ],
  },
  school_age: {
    label: 'School age (5+)',
    emoji: '📚',
    facts: [
      'They\'re building independence now. Your role is quietly, slowly changing.',
      'Driving them everywhere, answering hard questions: this is still deep care.',
      'The distance they\'re growing into is healthy. It doesn\'t mean they need you less.',
    ],
  },
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveStats {
  totalCheckins: number
  streakDays: number
  topTechniques: { title: string; usedCount: number; likedCount: number; category: string; lastUsed?: string }[]
  recentHistory: { rec_id: number; title: string; rating: number; mood: string; category: string; created_at: string }[]
  activeDays: string[]
  motherhoodStage: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getDateLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HomeScreen() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const userId    = user?.id ?? 'demo-user-001'
  const firstName = user?.user_metadata?.name?.split(' ')[0] ?? 'there'

  const [stats, setStats]               = useState<LiveStats | null>(null)
  const [statsLoaded, setStatsLoaded]   = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  const quote = useMemo(() => {
    const start   = new Date(new Date().getFullYear(), 0, 0).getTime()
    const dayOfYr = Math.floor((Date.now() - start) / 86400000)
    return QUOTE_POOL[dayOfYr % QUOTE_POOL.length]
  }, [])

  // Stage fact also rotates by day
  const stageFact = useMemo(() => {
    const start   = new Date(new Date().getFullYear(), 0, 0).getTime()
    const dayOfYr = Math.floor((Date.now() - start) / 86400000)
    const stage   = stats?.motherhoodStage
    if (!stage || !STAGE_CONTENT[stage]) return ''
    const facts = STAGE_CONTENT[stage].facts
    return facts[dayOfYr % facts.length]
  }, [stats?.motherhoodStage])

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) router.push('/onboarding')
  }, [authLoading, user, router])

  const fetchStats = () => {
    if (!user) return
    authedFetch(`/api/stats?userId=${userId}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => { setStats(data); setStatsLoaded(true) })
      .catch(() => setStatsLoaded(true))
  }

  useEffect(() => {
    fetchStats()
    const onVisible = () => { if (document.visibilityState === 'visible') fetchStats() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-mustard border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Derive display values
  const savedTech  = stats?.topTechniques.find(t => t.likedCount > 0) ?? null
  const streakDays = stats?.streakDays ?? 0

  let lastCheckinWhen = ''
  if (stats?.activeDays && stats.activeDays.length > 0) {
    const latestMs = Math.max(...stats.activeDays.map(d => new Date(d).getTime()))
    const days     = Math.floor((Date.now() - latestMs) / 86400000)
    lastCheckinWhen = days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
  }

  const isNewUser    = !statsLoaded || !stats || stats.totalCheckins === 0
  const stageInfo    = stats?.motherhoodStage ? STAGE_CONTENT[stats.motherhoodStage] : null

  return (
    <div className="flex flex-col min-h-screen pb-24">

      {/* Date + Greeting ─────────────────────────────────────────────────── */}
      <div className="px-5 pt-10 pb-2">
        <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-mustard">
          {getDateLabel()}
        </p>
        <h1 className="font-serif text-[27px] text-chocolate leading-[1.12] mt-1.5">
          {getGreeting()},<br />{firstName}.
        </h1>
        <p className="font-serif italic text-[14px] text-chocolate/40 mt-2 leading-snug">
          {quote}
        </p>
      </div>

      <div className="px-5 mt-4 space-y-4">

        {/* Primary CTA — dark hero card ────────────────────────────────── */}
        <Link href="/check-in" className="block">
          <div className="relative bg-chocolate rounded-[32px] p-6 overflow-hidden">
            <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-mustard/30 blur-2xl pointer-events-none" />
            <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-mustard relative">
              Today · Check-in
            </p>
            <h2 className="font-serif text-[24px] text-cream leading-[1.2] mt-2 mb-2 relative">
              How are you feeling<br />right now?
            </h2>
            <p className="text-cream/70 text-sm font-sans leading-[1.55] mb-4 relative">
              Two minutes, honest answers. A care kit that fits the version of you that&apos;s here.
            </p>
            <div className="relative flex items-center justify-center gap-2 bg-mustard text-white font-display font-semibold text-[15px] px-5 py-4 rounded-[15px] w-full">
              <Play size={15} />
              Start check-in
            </div>
          </div>
        </Link>

        {/* Streak nudge ────────────────────────────────────────────────── */}
        {statsLoaded && lastCheckinWhen && (
          <div className="flex items-center gap-2.5 px-1 text-[13.5px] text-chocolate/60 font-sans">
            <Clock size={16} className="text-mustard flex-shrink-0" />
            <span>
              {streakDays > 0 && (
                <strong className="text-chocolate font-semibold">{streakDays}-day streak.{' '}</strong>
              )}
              Last check-in {lastCheckinWhen}.
            </span>
          </div>
        )}

        {/* Motherhood stage card ───────────────────────────────────────── */}
        {statsLoaded && stageInfo && stageFact && (
          <div className="bg-[#faf6f0] border border-mustard/20 rounded-[24px] p-5">
            <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-mustard mb-3">
              Where you are right now
            </p>
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[22px] flex-shrink-0"
                style={{ background: 'rgba(201,152,31,0.12)' }}
              >
                {stageInfo.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-[14px] text-chocolate">
                  {stageInfo.label}
                </p>
                <p className="font-serif italic text-[14px] text-chocolate/60 mt-1 leading-snug">
                  {stageFact}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* A technique you saved ──────────────────────────────────────── */}
        {statsLoaded && savedTech && (
          <div>
            <p className="font-display font-semibold text-[12px] uppercase tracking-[0.14em] text-chocolate/40 mb-2">
              A technique you saved
            </p>
            <div className="flex items-center gap-3.5 bg-white rounded-2xl border border-beige/40 px-4 py-4">
              <div className="w-11 h-11 rounded-[14px] bg-cream flex items-center justify-center text-xl flex-shrink-0">
                {CATEGORY_EMOJI[savedTech.category] ?? '🌿'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-[15px] text-chocolate truncate">
                  {savedTech.title}
                </p>
                <p className="text-[12.5px] text-chocolate/50 font-sans mt-0.5">
                  {savedTech.category} · saved {savedTech.likedCount > 1 ? `${savedTech.likedCount}×` : 'recently'}
                </p>
              </div>
              <Bookmark size={20} className="text-mustard flex-shrink-0" fill="currentColor" />
            </div>
          </div>
        )}

        {/* New user empty state ────────────────────────────────────────── */}
        {isNewUser && (
          <div className="bg-mustard/5 border border-mustard/20 rounded-2xl p-5">
            <p className="font-serif text-chocolate text-lg leading-snug">
              Ready to meet yourself?
            </p>
            <p className="text-sm text-chocolate/60 font-sans mt-1 leading-relaxed">
              Your first check-in takes about 2 minutes. Kindrest will get to know you from there.
            </p>
          </div>
        )}

        {/* Share feedback ─────────────────────────────────────────────── */}
        <div className="pt-1 pb-2 flex justify-center">
          <button
            onClick={() => setShowFeedback(true)}
            className="flex items-center gap-1.5 font-display font-semibold text-[12.5px] text-chocolate/35 hover:text-chocolate/60 transition-colors"
          >
            <MessageCircle size={14} strokeWidth={1.8} />
            Share feedback
          </button>
        </div>

      </div>

      {showFeedback && (
        <FeedbackSheet
          userId={userId}
          email={user?.email ?? ''}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </div>
  )
}
