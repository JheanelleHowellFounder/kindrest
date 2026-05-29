'use client'

import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

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

// ─── Types ────────────────────────────────────────────────────────────────────

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
type Tab = 'insights' | 'log'

interface DaySheet {
  label: string
  recs: HistoryItem[]
}

interface SessionEntry {
  mood: string
  date: Date
  recs: HistoryItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildMoodData(history: HistoryItem[]): (number | null)[] {
  const dayMap = new Map<string, number>()
  for (const item of [...history].reverse()) {
    const key = new Date(item.created_at).toDateString()
    if (item.mood in MOOD_SCORE) dayMap.set(key, MOOD_SCORE[item.mood])
  }
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000)
    return dayMap.get(d.toDateString()) ?? null
  })
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
  trendLine: string
  frequencyLine: string
  moodLine: string
}

function buildTrendAnalysis(history: HistoryItem[], activeDays: string[]): TrendAnalysis | null {
  if (history.length < 2) return null

  const ordered = [...history].reverse() // oldest first
  const mid = Math.floor(ordered.length / 2)
  const avg = (arr: HistoryItem[]) => {
    const scored = arr.filter(i => i.mood in MOOD_SCORE)
    if (!scored.length) return 0
    return scored.reduce((s, i) => s + MOOD_SCORE[i.mood], 0) / scored.length
  }
  const diff = avg(ordered.slice(mid)) - avg(ordered.slice(0, mid))

  let trendLine = ''
  if (diff > 0.4)       trendLine = "You've been moving toward a steadier place lately."
  else if (diff < -0.4) trendLine = "You've had a harder stretch recently — and you're still here, still showing up."
  else                  trendLine = "Your energy has been pretty consistent across these check-ins."

  const twoWeeksAgo  = Date.now() - 14 * 86400000
  const recentActive = activeDays.filter(d => new Date(d).getTime() >= twoWeeksAgo).length
  let frequencyLine  = ''
  if (recentActive >= 10)     frequencyLine = `You've shown up ${recentActive} out of the last 14 days. That's real consistency.`
  else if (recentActive >= 5) frequencyLine = `You've checked in ${recentActive} times over the last two weeks.`
  else if (recentActive > 0)  frequencyLine = `You've had ${recentActive} check-in${recentActive > 1 ? 's' : ''} in the past two weeks — every one matters.`
  else                        frequencyLine = "You haven't checked in recently. When you're ready, this is here."

  const moodCounts: Record<string, number> = {}
  for (const i of history) moodCounts[i.mood] = (moodCounts[i.mood] ?? 0) + 1
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const moodLabels: Record<string, string> = {
    overwhelmed: "You've most often arrived feeling overwhelmed. Coming here anyway — that takes courage.",
    struggling:  "Most of the time you've arrived feeling like you're pushing through it.",
    okay:        "Most check-ins have landed around okay — a solid, real place to build from.",
    good:        "You've been showing up feeling good more often than not. Keep that.",
    thriving:    "You've been coming in with real energy behind you.",
  }
  const moodLine = topMood ? (moodLabels[topMood] ?? '') : ''

  return { trendLine, frequencyLine, moodLine }
}

// ─── Mood trend SVG chart ─────────────────────────────────────────────────────

function MoodChart({ data }: { data: (number | null)[] }) {
  const W = 300, H = 120, pX = 6, pY = 14
  const min = 1, max = 4
  const w = W - pX * 2, h = H - pY * 2

  const pts = data.map((v, i) => {
    if (v === null) return null
    const x = pX + (i / (data.length - 1)) * w
    const y = pY + (1 - (v - min) / (max - min)) * h
    return [x, y] as [number, number]
  })

  let pathD = '', firstX = 0, lastX = 0, lastY = 0
  let started = false
  for (const pt of pts) {
    if (!pt) continue
    if (!started) { pathD = `M${pt[0].toFixed(1)},${pt[1].toFixed(1)}`; firstX = pt[0]; started = true }
    else          { pathD += ` L${pt[0].toFixed(1)},${pt[1].toFixed(1)}` }
    lastX = pt[0]; lastY = pt[1]
  }
  void lastY

  const areaD  = started ? `${pathD} L${lastX.toFixed(1)},${H - pY} L${firstX.toFixed(1)},${H - pY} Z` : ''
  const lastPt = pts.filter(Boolean).at(-1)

  if (!started) {
    return (
      <div className="flex items-center justify-center h-[100px]">
        <p className="text-[13px] text-chocolate/30 font-sans text-center">
          Complete check-ins to see your mood trend
        </p>
      </div>
    )
  }

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {[0, 0.5, 1].map((t, i) => (
        <line key={i}
          x1={pX} x2={W - pX}
          y1={pY + t * h} y2={pY + t * h}
          stroke="rgba(48,33,26,0.08)" strokeWidth="1"
        />
      ))}
      {areaD && <path d={areaD} fill="rgba(201,152,31,0.12)" />}
      {pathD && (
        <path d={pathD} fill="none" stroke="#c9981f"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {lastPt && (
        <circle cx={lastPt[0]} cy={lastPt[1]} r="4"
          fill="#c9981f" stroke="#f8f2ee" strokeWidth="2" />
      )}
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HistoryScreen() {
  const { user } = useAuth()
  const userId   = user?.id ?? 'demo-user-001'

  const [tab, setTab]       = useState<Tab>('insights')
  const [stats, setStats]   = useState<LiveStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Day-detail bottom sheet
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

  void openSheet // available for future calendar use

  useEffect(() => {
    const fetchStats = () => {
      fetch(`/api/stats?userId=${userId}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(data => { setStats(data); setLoading(false) })
        .catch(() => setLoading(false))
    }
    fetchStats()
    const onVisible = () => { if (document.visibilityState === 'visible') fetchStats() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [userId])

  const history    = stats?.recentHistory ?? []
  const moodData   = buildMoodData(history)
  const sessionLog = buildSessionLog(history)
  const trend      = buildTrendAnalysis(history, stats?.activeDays ?? [])

  // ── Insights panel ────────────────────────────────────────────────────────
  const InsightsPanel = (
    <div className="space-y-4">

      {/* Mood trend */}
      <div className="bg-white rounded-2xl shadow-[0_6px_18px_-8px_rgba(48,33,26,0.18)] p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-mustard">
            Mood · last 30 days
          </p>
          {stats?.commonMood && (
            <p className="text-[12px] text-chocolate/45 font-sans capitalize">
              Trending {stats.commonMood}
            </p>
          )}
        </div>
        <h3 className="font-serif text-[19px] text-chocolate mb-3">Your emotional weather</h3>
        <MoodChart data={moodData} />
        <div className="flex justify-between text-[11px] text-chocolate/30 font-display font-semibold mt-1.5">
          <span>30 days ago</span>
          <span>Today</span>
        </div>
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

      {/* Trend analysis — replaces heatmap */}
      {trend && (
        <div className="bg-white rounded-2xl shadow-[0_6px_18px_-8px_rgba(48,33,26,0.18)] p-5">
          <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-mustard mb-1">
            Where you&apos;ve been lately
          </p>
          <h3 className="font-serif text-[19px] text-chocolate mb-3">Reading your patterns</h3>
          <div className="space-y-3">
            {[trend.trendLine, trend.frequencyLine, trend.moodLine].filter(Boolean).map((line, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-1.5 h-1.5 rounded-full bg-mustard flex-shrink-0 mt-[7px]" />
                <p className="font-sans text-[14px] text-chocolate/70 leading-[1.6]">{line}</p>
              </div>
            ))}
          </div>
          {stats && stats.totalCheckins > 0 && (
            <div className="mt-4 bg-[#f0e9e2] rounded-[14px] px-4 py-3 flex items-center gap-3">
              <span className="font-serif text-[28px] text-chocolate leading-none">{stats.totalCheckins}</span>
              <p className="font-sans text-[13px] text-chocolate/55 leading-snug">
                check-in{stats.totalCheckins !== 1 ? 's' : ''} total —<br />
                <span className="font-semibold text-chocolate/70">you keep coming back.</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty trend state */}
      {!trend && !loading && (
        <div className="bg-white rounded-2xl shadow-[0_6px_18px_-8px_rgba(48,33,26,0.18)] p-5">
          <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-mustard mb-1">
            Where you&apos;ve been lately
          </p>
          <h3 className="font-serif text-[19px] text-chocolate mb-2">Reading your patterns</h3>
          <p className="font-sans text-[14px] text-chocolate/45 leading-[1.6]">
            After a few check-ins, this space will show you what&apos;s shifting and what&apos;s holding.
          </p>
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
                {/* Date + mood header */}
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-lg leading-none">{MOOD_EMOJI[session.mood] ?? '😐'}</span>
                  <div>
                    <p className="font-display font-semibold text-[13px] text-chocolate">{dateLabel}</p>
                    <p className="text-[11.5px] text-chocolate/40 font-sans capitalize leading-tight">
                      Felt {session.mood}
                    </p>
                  </div>
                </div>

                {/* Recs for this session */}
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

  return (
    <div className="flex flex-col min-h-screen pb-24">

      {/* Header ─────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-10 pb-2">
        <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-mustard">
          History
        </p>
        <h1 className="font-serif text-[26px] text-chocolate leading-[1.12] mt-1.5">
          What you&apos;ve learned<br />about yourself.
        </h1>
      </div>

      {/* Mobile tab toggle ────────────────────────────────────────────── */}
      <div className="px-5 mt-4 flex justify-center md:hidden">
        <div className="inline-flex p-1 gap-1 bg-[#f0e9e2] border border-beige/50 rounded-full">
          {(['insights', 'log'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-display font-semibold text-[13px] px-5 py-2 rounded-full transition-colors ${
                tab === t ? 'bg-chocolate text-cream' : 'text-chocolate/50'
              }`}
            >
              {t === 'insights' ? 'Insights' : 'Log'}
            </button>
          ))}
        </div>
      </div>

      {/* Content ─────────────────────────────────────────────────────────── */}
      <div className="px-5 mt-4 pb-4">

        {/* Mobile: single column, tab-controlled */}
        <div className="md:hidden">
          {tab === 'insights' ? InsightsPanel : LogPanel}
        </div>

        {/* Desktop: two-column side-by-side */}
        <div className="hidden md:grid md:grid-cols-2 md:gap-5 md:items-start">
          <div>
            <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-chocolate/35 mb-3">
              Insights
            </p>
            {InsightsPanel}
          </div>
          <div>
            <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-chocolate/35 mb-3">
              Log
            </p>
            {LogPanel}
          </div>
        </div>
      </div>

      {/* Day-detail bottom sheet ─────────────────────────────────────────── */}
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
