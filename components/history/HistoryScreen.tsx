'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { authedFetch } from '@/lib/api-client'
import type { LibraryItem } from '@/app/api/library/route'

// ─── Constants ────────────────────────────────────────────────────────────────

const MOOD_EMOJI: Record<string, string> = {
  overwhelmed: '😢', struggling: '😔', okay: '😐', good: '😊', thriving: '✨',
}

const MOOD_SCORE: Record<string, number> = {
  overwhelmed: 1, struggling: 1.5, okay: 2.5, good: 3.5, thriving: 4,
}

const RATING_LABEL: Record<number, string> = { 1: 'Not for me', 2: 'Saved', 3: 'Done ✓' }

const CATEGORY_EMOJI: Record<string, string> = {
  'Rest':           '🌙',
  'Micro Practice': '✨',
  'Joy':            '💛',
  'Movement':       '🌿',
  'Reflection':     '🪞',
  'Connection':     '💬',
}

// Y-axis reference levels
const Y_LEVELS = [
  { score: 4,   label: 'Thriving' },
  { score: 3.5, label: 'Good'     },
  { score: 2.5, label: 'Okay'     },
  { score: 1,   label: 'Low'      },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeRange = '30d' | '90d' | 'ytd' | 'all'
type RatingFilter = 'all' | 'done' | 'saved'
const ALL_LIB_CATEGORIES = ['Rest', 'Micro Practice', 'Joy', 'Movement', 'Reflection', 'Connection']

interface LiveStats {
  totalCheckins: number
  streakDays: number
  topTechniques: { title: string; usedCount: number; likedCount: number; category: string }[]
  recentHistory: { rec_id: number; title: string; rating: number; mood: string; category: string; created_at: string }[]
  commonMood: string | null
  activeDays: string[]
  preferredCategories: string[]
}

type HistoryItem = LiveStats['recentHistory'][number]
type Tab = 'insights' | 'log' | 'library'

interface DaySheet {
  label: string
  recs: HistoryItem[]
}

interface SessionEntry {
  mood: string
  date: Date
  recs: HistoryItem[]
}

interface MoodChartData {
  data:      (number | null)[]
  startDate: Date
  endDate:   Date
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRangeStart(range: TimeRange, history: HistoryItem[]): Date {
  const now = Date.now()
  switch (range) {
    case '30d': return new Date(now - 29 * 86400000)
    case '90d': return new Date(now - 89 * 86400000)
    case 'ytd': return new Date(new Date().getFullYear(), 0, 1)
    case 'all': {
      if (history.length === 0) return new Date(now - 29 * 86400000)
      const oldest = Math.min(...history.map(h => new Date(h.created_at).getTime()))
      return new Date(oldest)
    }
  }
}

function buildMoodChartData(history: HistoryItem[], range: TimeRange): MoodChartData {
  const endDate   = new Date()
  const startDate = getRangeStart(range, history)

  // Build day → score map for the range
  const dayMap = new Map<string, number>()
  for (const item of [...history].reverse()) {
    const d = new Date(item.created_at)
    if (d < startDate || d > endDate) continue
    const key = d.toDateString()
    if (item.mood in MOOD_SCORE) dayMap.set(key, MOOD_SCORE[item.mood])
  }

  // Build dense array from startDate to today
  const numDays = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1)
  const full: (number | null)[] = Array.from({ length: numDays }, (_, i) => {
    const d = new Date(startDate.getTime() + i * 86400000)
    return dayMap.get(d.toDateString()) ?? null
  })

  // Trim leading nulls so chart starts at first real data point
  const firstIdx = full.findIndex(v => v !== null)
  const trimmed  = firstIdx > 0 ? full.slice(firstIdx) : full

  const actualStart = firstIdx > 0
    ? new Date(startDate.getTime() + firstIdx * 86400000)
    : startDate

  return { data: trimmed, startDate: actualStart, endDate }
}

function buildSessionLog(history: HistoryItem[]): SessionEntry[] {
  const dateMap = new Map<string, { mood: string; recs: HistoryItem[]; date: Date }>()
  for (const item of history) {
    const d   = new Date(item.created_at)
    const key = d.toDateString()
    if (!dateMap.has(key)) dateMap.set(key, { mood: item.mood, recs: [], date: d })
    dateMap.get(key)!.recs.push(item)
  }
  return Array.from(dateMap.entries())
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([, s]) => ({ mood: s.mood, date: s.date, recs: s.recs }))
}

interface TrendAnalysis {
  headline:  string
  paragraph: string
}

function buildTrendAnalysis(history: HistoryItem[], activeDays: string[]): TrendAnalysis | null {
  if (history.length < 2) return null

  // ── Mood trajectory ───────────────────────────────────────────────────────
  const ordered = [...history].reverse() // oldest first
  const mid = Math.floor(ordered.length / 2)
  const avg = (arr: HistoryItem[]) => {
    const scored = arr.filter(i => i.mood in MOOD_SCORE)
    if (!scored.length) return 0
    return scored.reduce((s, i) => s + MOOD_SCORE[i.mood], 0) / scored.length
  }
  const diff = avg(ordered.slice(mid)) - avg(ordered.slice(0, mid))
  const isImproving = diff > 0.4
  const isDeclining = diff < -0.4

  // ── Consistency over last 14 days ─────────────────────────────────────────
  const twoWeeksAgo  = Date.now() - 14 * 86400000
  const recentActive = activeDays.filter(d => new Date(d).getTime() >= twoWeeksAgo).length
  const isConsistent = recentActive >= 5

  // ── Top completed category (rating === 3) ─────────────────────────────────
  // Primary signal: what has she actually followed through on?
  const doneCounts: Record<string, number> = {}
  for (const item of history) {
    if (item.rating === 3 && item.category) {
      doneCounts[item.category] = (doneCounts[item.category] ?? 0) + 1
    }
  }
  const topDoneCategory = Object.entries(doneCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  // Fallback: most saved (rating === 2) if nothing completed yet
  const savedCounts: Record<string, number> = {}
  for (const item of history) {
    if (item.rating === 2 && item.category) {
      savedCounts[item.category] = (savedCounts[item.category] ?? 0) + 1
    }
  }
  const topSavedCategory = Object.entries(savedCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const topCategory  = topDoneCategory ?? topSavedCategory
  const wasCompleted = !!topDoneCategory

  // Category phrases for natural sentence use
  const CATEGORY_PHRASE: Record<string, string> = {
    'Rest':           'rest practices',
    'Micro Practice': 'small, quick practices',
    'Joy':            'joy-based practices',
    'Movement':       'movement practices',
    'Reflection':     'reflection practices',
    'Connection':     'connection-focused practices',
  }
  const catPhrase = topCategory ? (CATEGORY_PHRASE[topCategory] ?? topCategory.toLowerCase()) : null

  // ── Headline: one clear TL;DR sentence ───────────────────────────────────
  let headline = ''
  if (isImproving && isConsistent) {
    headline = "You've been showing up consistently, and it's making a difference."
  } else if (isImproving) {
    headline = "Things have been getting a bit lighter for you lately."
  } else if (isDeclining && isConsistent) {
    headline = "It's been a hard stretch, and you keep coming back anyway."
  } else if (isDeclining) {
    headline = "It's been a harder stretch lately."
  } else if (isConsistent) {
    headline = "You've been consistent, and that's worth more than it sounds."
  } else {
    headline = "You've been holding steady."
  }

  // ── Sentence 1: connects mood direction to what she's been doing ──────────
  let sentence1 = ''
  if (isImproving && catPhrase) {
    sentence1 = wasCompleted
      ? `Your mood has been shifting in a better direction, and ${catPhrase} are the ones you've actually been completing, not just saving.`
      : `Your mood has been shifting in a better direction, and ${catPhrase} have been your most-reached-for tool.`
  } else if (isImproving) {
    sentence1 = `Your recent check-ins are trending toward a better place, even if the shift doesn't feel dramatic yet.`
  } else if (isDeclining && catPhrase) {
    sentence1 = `The last few check-ins have been harder ones, and when things get heavy, you tend to reach for ${catPhrase}.`
  } else if (isDeclining) {
    sentence1 = `The last few check-ins have been heavier. That kind of stretch is real, and it's okay to name it.`
  } else if (catPhrase) {
    sentence1 = `You've been in a steady place, and ${catPhrase} have been your most-used tool across your check-ins.`
  } else {
    sentence1 = `You've been in a steady place across your recent check-ins.`
  }

  // ── Sentence 2: the "so what" grounded in her specific data ──────────────
  // Avoid repeating catPhrase if sentence 1 already named it
  const catAlreadyUsed = catPhrase ? sentence1.includes(catPhrase) : false

  let sentence2 = ''
  if (isConsistent && catPhrase && wasCompleted) {
    sentence2 = `You've checked in ${recentActive} times in the last two weeks and have been following through on ${catPhrase}. That's a pattern worth trusting.`
  } else if (isConsistent && catPhrase) {
    sentence2 = `You've checked in ${recentActive} times in the last two weeks, and your nervous system keeps reaching for ${catPhrase}.`
  } else if (isConsistent) {
    sentence2 = `You've shown up ${recentActive} times in the last two weeks. That kind of consistency builds something over time.`
  } else if (!catAlreadyUsed && catPhrase && wasCompleted) {
    sentence2 = `Of everything in your care kit, ${catPhrase} are what you actually follow through on. That's useful to know about yourself.`
  } else if (!catAlreadyUsed && catPhrase) {
    sentence2 = `You tend to reach for ${catPhrase} most often. That's your nervous system telling you what it needs.`
  } else {
    sentence2 = `That pattern is worth trusting.`
  }

  return { headline, paragraph: `${sentence1} ${sentence2}` }
}

/**
 * Returns true when the user's last 3 distinct check-in sessions were all
 * 'struggling' or 'overwhelmed'. This triggers the mental health support card.
 */
function checkConsecutiveStruggle(history: HistoryItem[]): boolean {
  // Build one-mood-per-day session list (most recent first)
  const dateMap = new Map<string, string>()
  for (const item of history) {
    const key = new Date(item.created_at).toDateString()
    if (!dateMap.has(key)) dateMap.set(key, item.mood)
  }
  const sessions = Array.from(dateMap.entries())
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([, mood]) => mood)

  if (sessions.length < 3) return false
  return sessions.slice(0, 3).every(m => m === 'struggling' || m === 'overwhelmed')
}

// ─── Mood chart ───────────────────────────────────────────────────────────────

function MoodChart({ chartData }: { chartData: MoodChartData }) {
  const { data, startDate, endDate } = chartData

  // SVG dimensions — left margin leaves room for Y labels
  const W = 320, H = 130
  const pXL = 52, pXR = 8, pY = 12
  const min = 1, max = 4
  const w = W - pXL - pXR, h = H - pY * 2

  const toY = (score: number) => pY + (1 - (score - min) / (max - min)) * h

  const pts = data.map((v, i) => {
    if (v === null) return null
    const x = pXL + (data.length > 1 ? (i / (data.length - 1)) * w : w / 2)
    return [x, toY(v)] as [number, number]
  })

  let pathD = '', firstX = 0, lastX = 0
  let started = false
  for (const pt of pts) {
    if (!pt) continue
    if (!started) { pathD = `M${pt[0].toFixed(1)},${pt[1].toFixed(1)}`; firstX = pt[0]; started = true }
    else          { pathD += ` L${pt[0].toFixed(1)},${pt[1].toFixed(1)}` }
    lastX = pt[0]
  }

  const areaD  = started ? `${pathD} L${lastX.toFixed(1)},${H - pY} L${firstX.toFixed(1)},${H - pY} Z` : ''
  const lastPt = pts.filter(Boolean).at(-1)

  if (!started) {
    return (
      <div className="flex items-center justify-center h-[110px]">
        <p className="text-[13px] text-chocolate/30 font-sans text-center">
          Complete check-ins to see your mood trend
        </p>
      </div>
    )
  }

  // Build 4 evenly spaced X-axis labels
  const spanMs    = endDate.getTime() - startDate.getTime()
  const xLabels   = [0, 1, 2, 3].map(i => {
    if (i === 3) return 'Today'
    const d = new Date(startDate.getTime() + (i / 3) * spanMs)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {/* Y-axis reference lines + labels */}
        {Y_LEVELS.map(({ score, label }) => {
          const y = toY(score)
          if (y < pY - 2 || y > H - pY + 2) return null
          return (
            <g key={label}>
              <line
                x1={pXL} x2={W - pXR}
                y1={y} y2={y}
                stroke="rgba(48,33,26,0.07)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={pXL - 6} y={y + 4}
                textAnchor="end"
                fontSize="9"
                fontFamily="inherit"
                fill="rgba(48,33,26,0.35)"
                fontWeight="600"
              >
                {label}
              </text>
            </g>
          )
        })}

        {/* Area fill */}
        {areaD && <path d={areaD} fill="rgba(201,152,31,0.10)" />}

        {/* Trend line */}
        {pathD && (
          <path d={pathD} fill="none" stroke="#c9981f"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Data point dots */}
        {pts.map((pt, i) => pt && (
          <circle key={i} cx={pt[0]} cy={pt[1]} r="3"
            fill="#c9981f" stroke="#f8f2ee" strokeWidth="1.5"
            opacity={i === pts.filter(Boolean).length - 1 ? 1 : 0.55}
          />
        ))}

        {/* Highlight last point */}
        {lastPt && (
          <circle cx={lastPt[0]} cy={lastPt[1]} r="4.5"
            fill="#c9981f" stroke="#f8f2ee" strokeWidth="2" />
        )}

        {/* X-axis tick marks — 4 evenly spaced vertical lines */}
        {[0, 1, 2, 3].map(i => {
          const x = pXL + (i / 3) * w
          return (
            <line key={i}
              x1={x} x2={x}
              y1={H - pY} y2={H - pY + 4}
              stroke="rgba(48,33,26,0.20)"
              strokeWidth="1"
            />
          )
        })}
      </svg>

      {/* X-axis labels — 4 equally spaced */}
      <div className="flex justify-between mt-1" style={{ paddingLeft: pXL, paddingRight: pXR }}>
        {xLabels.map((label, i) => (
          <span
            key={i}
            className="text-[10px] text-chocolate/30 font-display font-semibold leading-none"
            style={{ textAlign: i === 0 ? 'left' : i === 3 ? 'right' : 'center', minWidth: 0, flex: 1 }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

const RANGE_LABELS: { value: TimeRange; label: string }[] = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '3 months' },
  { value: 'ytd', label: 'This year' },
  { value: 'all', label: 'All time' },
]

export function HistoryScreen() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const userId   = user?.id ?? 'demo-user-001'

  useEffect(() => {
    if (!authLoading && !user) router.push('/signin?redirect=/history')
  }, [authLoading, user, router])

  const [tab, setTab]         = useState<Tab>('insights')
  const [range, setRange]     = useState<TimeRange>('30d')
  const [stats, setStats]     = useState<LiveStats | null>(null)
  const [loading, setLoading] = useState(true)

  const [daySheet, setDaySheet]         = useState<DaySheet | null>(null)
  const [sheetVisible, setSheetVisible] = useState(false)

  const openSheet = useCallback((sheet: DaySheet) => {
    setDaySheet(sheet)
    requestAnimationFrame(() => requestAnimationFrame(() => setSheetVisible(true)))
  }, [])

  const closeSheet = useCallback(() => {
    setSheetVisible(false)
    setTimeout(() => setDaySheet(null), 300)
  }, [])

  void openSheet

  // Library state
  const [libItems, setLibItems]   = useState<LibraryItem[]>([])
  const [libLoaded, setLibLoaded] = useState(false)
  const [ratingFilter, setRatingFilter]     = useState<RatingFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')

  useEffect(() => {
    if (!user) return
    const fetchStats = () => {
      authedFetch(`/api/stats?userId=${userId}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(data => { setStats(data); setLoading(false) })
        .catch(() => setLoading(false))
    }
    fetchStats()
    const onVisible = () => { if (document.visibilityState === 'visible') fetchStats() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [user, userId])

  useEffect(() => {
    if (!user) return
    authedFetch(`/api/library?userId=${userId}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => { setLibItems(data.items ?? []); setLibLoaded(true) })
      .catch(() => setLibLoaded(true))
  }, [user, userId])

  const activeLibCategories = useMemo(() => {
    const cats = new Set(libItems.map(i => i.category).filter(Boolean))
    return ALL_LIB_CATEGORIES.filter(c => cats.has(c))
  }, [libItems])

  const visibleLibItems = useMemo(() => {
    return libItems.filter(i => {
      const ratingOk =
        ratingFilter === 'all' ||
        (ratingFilter === 'done'  && i.rating === 3) ||
        (ratingFilter === 'saved' && i.rating === 2)
      const categoryOk = categoryFilter === 'All' || i.category === categoryFilter
      return ratingOk && categoryOk
    })
  }, [libItems, ratingFilter, categoryFilter])

  const libDoneCount  = libItems.filter(i => i.rating === 3).length
  const libSavedCount = libItems.filter(i => i.rating === 2).length

  function toggleRating(r: RatingFilter) {
    setRatingFilter(prev => prev === r ? 'all' : r)
  }

  const history        = stats?.recentHistory ?? []
  const chartData      = buildMoodChartData(history, range)
  const sessionLog     = buildSessionLog(history)
  const trend          = buildTrendAnalysis(history, stats?.activeDays ?? [])
  const showSupportCard = !loading && checkConsecutiveStruggle(history)

  // ── Insights panel ────────────────────────────────────────────────────────
  const InsightsPanel = (
    <div className="space-y-4">

      {/* Mental health support nudge — shown after 3 consecutive hard sessions */}
      {showSupportCard && (
        <div className="bg-white rounded-2xl shadow-[0_6px_18px_-8px_rgba(48,33,26,0.18)] p-5 border-l-4 border-mustard">
          <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-mustard mb-2">
            A note just for you
          </p>
          <p className="font-serif text-[18px] text-chocolate leading-snug mb-3">
            You&apos;ve had a rough few days.
          </p>
          <p className="font-sans text-[14px] text-chocolate/70 leading-[1.7]">
            We&apos;ve noticed your last few check-ins have been really hard ones. That kind of weight
            is real, and it matters. Kindrest is here for the everyday stuff, but when things stay
            heavy for a stretch, talking to someone trained to help can make a real difference.
          </p>
          <p className="font-sans text-[14px] text-chocolate/70 leading-[1.7] mt-2">
            You don&apos;t have to be in a crisis to reach out. A therapist, your OB/GYN, or even
            your primary care doctor are all good places to start. You deserve that kind of support,
            not instead of this, but alongside it.
          </p>
          <a
            href="https://www.psychologytoday.com/us/therapists"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 font-display font-semibold text-[13px] text-mustard hover:text-chocolate transition-colors"
          >
            Find a therapist near you →
          </a>
        </div>
      )}

      {/* Reading your patterns — sits above the chart */}
      {trend && (
        <div className="bg-white rounded-2xl shadow-[0_6px_18px_-8px_rgba(48,33,26,0.18)] p-5">
          <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-mustard mb-2">
            Reading your patterns
          </p>
          <p className="font-serif text-[20px] text-chocolate leading-snug mb-3">
            {trend.headline}
          </p>
          <p className="font-sans text-[14px] text-chocolate/70 leading-[1.75]">
            {trend.paragraph}
          </p>
          {stats && stats.totalCheckins > 0 && (
            <div className="mt-4 flex items-center gap-2.5 pt-4 border-t border-beige/30">
              <span className="font-serif text-[26px] text-chocolate leading-none">{stats.totalCheckins}</span>
              <p className="font-sans text-[13px] text-chocolate/50 leading-snug">
                total check-in{stats.totalCheckins !== 1 ? 's' : ''}.{' '}
                <span className="text-chocolate/70 font-semibold">You keep coming back.</span>
              </p>
            </div>
          )}
        </div>
      )}

      {!trend && !loading && (
        <div className="bg-white rounded-2xl shadow-[0_6px_18px_-8px_rgba(48,33,26,0.18)] p-5">
          <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-mustard mb-2">
            Reading your patterns
          </p>
          <p className="font-serif text-[20px] text-chocolate leading-snug mb-2">
            Your story is just starting.
          </p>
          <p className="font-sans text-[14px] text-chocolate/45 leading-[1.6]">
            After a few check-ins, this space will reflect what&apos;s shifting, what&apos;s holding, and how often you&apos;re showing up for yourself.
          </p>
        </div>
      )}

      {/* Mood trend */}
      <div className="bg-white rounded-2xl shadow-[0_6px_18px_-8px_rgba(48,33,26,0.18)] p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-mustard">
            Mood · {RANGE_LABELS.find(r => r.value === range)?.label}
          </p>
          {stats?.commonMood && (
            <p className="text-[12px] text-chocolate/45 font-sans capitalize">
              Trending {stats.commonMood}
            </p>
          )}
        </div>
        <h3 className="font-serif text-[19px] text-chocolate mb-3">Your emotional weather</h3>

        {/* Range toggle */}
        <div className="flex gap-1.5 mb-3">
          {RANGE_LABELS.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`font-display font-semibold text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                range === r.value
                  ? 'bg-chocolate text-cream border-chocolate'
                  : 'text-chocolate/45 border-beige/50 hover:text-chocolate/65'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <MoodChart chartData={chartData} />
      </div>

      {/* Top techniques */}
      {stats?.topTechniques && stats.topTechniques.length > 0 && (
        <div className="bg-white rounded-2xl shadow-[0_6px_18px_-8px_rgba(48,33,26,0.18)] p-5">
          <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-mustard mb-1">
            What&apos;s working for you
          </p>
          <h3 className="font-serif text-[19px] text-chocolate mb-3">Top techniques</h3>
          <div>
            {stats.topTechniques.slice(0, 3).map((t, i) => {
              const maxLiked = stats.topTechniques[0]?.likedCount || 1
              const barPct   = Math.round((t.likedCount / maxLiked) * 100)
              return (
                <div key={i} className={`flex items-center gap-3.5 py-3 ${i > 0 ? 'border-t border-beige/30' : ''}`}>
                  <div className="w-10 h-10 rounded-[12px] bg-[#f0e9e2] flex items-center justify-center text-xl flex-shrink-0">
                    {CATEGORY_EMOJI[t.category] ?? '✨'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-[14.5px] text-chocolate truncate">{t.title}</p>
                    <div className="mt-1.5 h-[5px] rounded-full bg-beige/40 overflow-hidden">
                      <div className="h-full bg-mustard rounded-full" style={{ width: `${barPct}%` }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 pl-2">
                    <span className="font-serif text-[17px] text-chocolate">{t.likedCount}</span>
                    <span className="font-sans text-[11.5px] text-chocolate/40 ml-1">uses</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )

  // ── Log panel ─────────────────────────────────────────────────────────────
  const LogPanel = (
    <div className="bg-white rounded-2xl shadow-[0_6px_18px_-8px_rgba(48,33,26,0.18)] p-5">
      <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-mustard mb-1">
        Your check-ins
      </p>
      <h3 className="font-serif text-[19px] text-chocolate mb-4">What you&apos;ve done</h3>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-28 bg-beige/30 rounded animate-pulse" />
              <div className="h-10 bg-beige/20 rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      ) : sessionLog.length === 0 ? (
        <div className="text-center py-10">
          <p className="font-serif text-chocolate/40 text-lg mb-2">Nothing here yet</p>
          <p className="text-sm text-chocolate/30 font-sans">
            Complete a check-in to start building your history.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {sessionLog.map((session, i) => {
            const d    = session.date
            const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
            const dateLabel = diff === 0 ? 'Today'
              : diff === 1 ? 'Yesterday'
              : d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

            return (
              <div key={i}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-lg leading-none">{MOOD_EMOJI[session.mood] ?? '😐'}</span>
                  <div>
                    <p className="font-display font-semibold text-[13px] text-chocolate">{dateLabel}</p>
                    <p className="text-[11.5px] text-chocolate/40 font-sans capitalize leading-tight">
                      Felt {session.mood}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5 pl-1">
                  {session.recs.map((rec, j) => (
                    <div
                      key={`${rec.rec_id}-${j}`}
                      className="flex items-center gap-2.5 bg-[#f8f2ee] rounded-[14px] px-3.5 py-2.5"
                    >
                      <span className="text-base leading-none flex-shrink-0">
                        {CATEGORY_EMOJI[rec.category] ?? '✨'}
                      </span>
                      <p className="font-display font-semibold text-[13px] text-chocolate flex-1 min-w-0 truncate">
                        {rec.title}
                      </p>
                      {rec.rating >= 2 && (
                        <span className={`text-[11px] font-display font-semibold flex-shrink-0 ${
                          rec.rating === 3 ? 'text-mustard' : 'text-chocolate/45'
                        }`}>
                          {RATING_LABEL[rec.rating]}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // ── Library panel ─────────────────────────────────────────────────────────
  const LibraryPanel = (
    <div className="space-y-4">
      {/* Summary cards — tap to filter */}
      {libLoaded && libItems.length > 0 && (
        <div className="flex gap-3">
          <button
            onClick={() => toggleRating('done')}
            className={`flex-1 rounded-2xl border px-4 py-3 text-center transition-colors ${
              ratingFilter === 'done' ? 'bg-chocolate border-chocolate' : 'bg-white border-beige/40 hover:border-beige'
            }`}
          >
            <p className={`font-serif text-[26px] leading-none ${ratingFilter === 'done' ? 'text-cream' : 'text-chocolate'}`}>
              {libDoneCount}
            </p>
            <p className={`font-display font-semibold text-[11px] mt-0.5 uppercase tracking-[0.1em] ${
              ratingFilter === 'done' ? 'text-mustard' : 'text-chocolate/45'
            }`}>
              Done
            </p>
          </button>
          <button
            onClick={() => toggleRating('saved')}
            className={`flex-1 rounded-2xl border px-4 py-3 text-center transition-colors ${
              ratingFilter === 'saved' ? 'bg-chocolate border-chocolate' : 'bg-white border-beige/40 hover:border-beige'
            }`}
          >
            <p className={`font-serif text-[26px] leading-none ${ratingFilter === 'saved' ? 'text-cream' : 'text-chocolate'}`}>
              {libSavedCount}
            </p>
            <p className={`font-display font-semibold text-[11px] mt-0.5 uppercase tracking-[0.1em] ${
              ratingFilter === 'saved' ? 'text-mustard' : 'text-chocolate/45'
            }`}>
              Saved
            </p>
          </button>
          <button
            onClick={() => setRatingFilter('all')}
            className={`flex-1 rounded-2xl border px-4 py-3 text-center transition-colors ${
              ratingFilter === 'all' ? 'bg-chocolate border-chocolate' : 'bg-white border-beige/40 hover:border-beige'
            }`}
          >
            <p className={`font-serif text-[26px] leading-none ${ratingFilter === 'all' ? 'text-cream' : 'text-chocolate'}`}>
              {libItems.length}
            </p>
            <p className={`font-display font-semibold text-[11px] mt-0.5 uppercase tracking-[0.1em] ${
              ratingFilter === 'all' ? 'text-mustard' : 'text-chocolate/45'
            }`}>
              All
            </p>
          </button>
        </div>
      )}

      {/* Category filter pills */}
      {libLoaded && activeLibCategories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {['All', ...activeLibCategories].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`flex-shrink-0 font-display font-semibold text-[12.5px] px-4 py-2 rounded-full border transition-colors ${
                categoryFilter === cat
                  ? 'bg-mustard text-white border-mustard'
                  : 'bg-white text-chocolate/55 border-beige/50 hover:text-chocolate/70'
              }`}
            >
              {cat === 'All' ? 'All categories' : `${CATEGORY_EMOJI[cat] ?? ''} ${cat}`}
            </button>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {!libLoaded && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-[72px] bg-white rounded-2xl border border-beige/30 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state — nothing saved yet */}
      {libLoaded && libItems.length === 0 && (
        <div className="mt-4 text-center px-4 py-6">
          <p className="text-4xl mb-4">🌿</p>
          <p className="font-serif text-[20px] text-chocolate leading-snug mb-2">
            Nothing here yet
          </p>
          <p className="font-sans text-[14px] text-chocolate/50 leading-relaxed max-w-[280px] mx-auto">
            When you save or complete a technique during a check-in, it will live here, ready whenever you need it.
          </p>
        </div>
      )}

      {/* Empty state — filter has no results */}
      {libLoaded && libItems.length > 0 && visibleLibItems.length === 0 && (
        <div className="text-center py-4">
          <p className="font-sans text-[14px] text-chocolate/40">
            Nothing matches this filter yet.
          </p>
        </div>
      )}

      {/* Item list */}
      {libLoaded && visibleLibItems.length > 0 && (
        <div className="space-y-2">
          {visibleLibItems.map((item, i) => (
            <div
              key={`${item.rec_id}-${i}`}
              className="bg-white rounded-2xl border border-beige/30 px-4 py-4 flex items-center gap-3.5"
            >
              <div
                className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[22px] flex-shrink-0"
                style={{ background: '#f0e9e2' }}
              >
                {CATEGORY_EMOJI[item.category] ?? '✨'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-[16px] text-chocolate leading-snug truncate">
                  {item.title}
                </p>
                <p className="font-sans text-[12px] text-chocolate/40 mt-0.5">
                  {item.category}
                  {item.count > 1 && (
                    <span className="ml-1.5 text-chocolate/30">· {item.count}×</span>
                  )}
                </p>
              </div>
              <div className="flex-shrink-0">
                {item.rating === 3 ? (
                  <span className="font-display font-semibold text-[12px] text-mustard bg-mustard/10 px-3 py-1.5 rounded-full">
                    Done ✓
                  </span>
                ) : (
                  <span className="font-display font-semibold text-[12px] text-chocolate/50 bg-[#f0e9e2] px-3 py-1.5 rounded-full">
                    Saved
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-mustard border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">

      {/* Header */}
      <div className="px-5 pt-10 pb-2">
        <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-mustard">
          History
        </p>
        <h1 className="font-serif text-[26px] text-chocolate leading-[1.12] mt-1.5">
          What you&apos;ve learned<br />about yourself.
        </h1>
      </div>

      {/* Tab toggle — same slider on mobile and desktop */}
      <div className="px-5 mt-4 flex justify-center">
        <div className="inline-flex p-1 gap-1 bg-[#f0e9e2] border border-beige/50 rounded-full">
          {(['insights', 'log', 'library'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-display font-semibold text-[13px] px-4 py-2 rounded-full transition-colors ${
                tab === t ? 'bg-chocolate text-cream' : 'text-chocolate/50'
              }`}
            >
              {t === 'insights' ? 'Insights' : t === 'log' ? 'Log' : 'Library'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 mt-4 pb-4 md:max-w-xl md:mx-auto">
        {tab === 'insights' ? InsightsPanel : tab === 'log' ? LogPanel : LibraryPanel}
      </div>

      {/* Day-detail bottom sheet */}
      {daySheet && (
        <>
          <div
            className={`fixed inset-0 bg-chocolate/50 z-40 transition-opacity duration-300 ${
              sheetVisible ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={closeSheet}
          />
          <div
            className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-cream rounded-t-3xl z-50 transition-transform duration-300 pb-safe ${
              sheetVisible ? 'translate-y-0' : 'translate-y-full'
            }`}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-beige rounded-full" />
            </div>
            <div className="px-5 pt-3 pb-4 flex items-start justify-between">
              <div>
                <h3 className="font-serif text-[22px] text-chocolate leading-tight">{daySheet.label}</h3>
                <p className="text-xs text-chocolate/40 font-sans mt-0.5">Care kit from this session</p>
              </div>
              <button
                onClick={closeSheet}
                className="w-8 h-8 rounded-full bg-beige/40 flex items-center justify-center mt-1"
              >
                <X size={14} className="text-chocolate/60" />
              </button>
            </div>
            <div className="px-5 pb-16 space-y-2 max-h-[65vh] overflow-y-auto">
              {daySheet.recs.length > 0 ? (
                daySheet.recs.map((rec, i) => (
                  <div
                    key={`sheet-${rec.rec_id}-${i}`}
                    className="bg-white rounded-2xl p-4 border border-beige/20 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 bg-mustard/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">{CATEGORY_EMOJI[rec.category] ?? '✨'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-chocolate text-sm">{rec.title}</p>
                      <p className="text-[10px] text-chocolate/40 font-sans mt-0.5">{rec.category}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-xs font-display font-semibold ${
                        rec.rating === 3 ? 'text-mustard' :
                        rec.rating === 2 ? 'text-chocolate/60' : 'text-chocolate/30'
                      }`}>
                        {RATING_LABEL[rec.rating]}
                      </p>
                      <p className="text-[10px] text-chocolate/25 font-sans capitalize mt-0.5">
                        {MOOD_EMOJI[rec.mood]} {rec.mood}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-chocolate/40 font-sans">
                    No recommendations recorded for this session.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
