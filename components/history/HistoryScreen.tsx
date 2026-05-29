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

const RATING_LABEL: Record<number, string> = { 1: 'Not for me', 2: 'Saved', 3: 'Did it ✓' }

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildMoodData(history: HistoryItem[]): (number | null)[] {
  const dayMap = new Map<string, number>()
  // Process oldest-first so newest overwrites
  for (const item of [...history].reverse()) {
    const key = new Date(item.created_at).toDateString()
    if (item.mood in MOOD_SCORE) dayMap.set(key, MOOD_SCORE[item.mood])
  }
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000)
    return dayMap.get(d.toDateString()) ?? null
  })
}

function buildSessionLog(history: HistoryItem[]) {
  const dateMap = new Map<string, { mood: string; recs: HistoryItem[]; date: Date }>()
  for (const item of history) {
    const d   = new Date(item.created_at)
    const key = d.toDateString()
    if (!dateMap.has(key)) dateMap.set(key, { mood: item.mood, recs: [], date: d })
    dateMap.get(key)!.recs.push(item)
  }
  return Array.from(dateMap.entries())
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([, session]) => {
      const topRec = [...session.recs].sort((a, b) => b.rating - a.rating)[0]
      return { mood: session.mood, date: session.date, rec: topRec }
    })
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

  let pathD = ''
  let firstX = 0, firstY = 0, lastX = 0, lastY = 0
  let started = false

  for (const pt of pts) {
    if (!pt) continue
    if (!started) {
      pathD = `M${pt[0].toFixed(1)},${pt[1].toFixed(1)}`
      firstX = pt[0]; firstY = pt[1]; started = true
    } else {
      pathD += ` L${pt[0].toFixed(1)},${pt[1].toFixed(1)}`
    }
    lastX = pt[0]; lastY = pt[1]
  }

  // Silence unused-variable lint
  void firstY; void lastY

  const areaD = started
    ? `${pathD} L${lastX.toFixed(1)},${H - pY} L${firstX.toFixed(1)},${H - pY} Z`
    : ''
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

// ─── Activity heatmap (last 35 days) ─────────────────────────────────────────

function Heatmap({ activeDays }: { activeDays: string[] }) {
  const active = new Set(activeDays.map(d => new Date(d).toDateString()))
  const today  = new Date()
  const cells  = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (34 - i))
    return {
      isToday:  d.toDateString() === today.toDateString(),
      isActive: active.has(d.toDateString()),
    }
  })
  const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  return (
    <>
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {DOW.map((d, i) => (
          <span key={i} className="text-center font-display font-semibold text-[10px] text-chocolate/30 uppercase tracking-[0.06em]">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, i) => (
          <div key={i} className={`aspect-square rounded-[6px] ${
            cell.isToday
              ? 'bg-mustard'
              : cell.isActive
              ? 'bg-mustard/60 border border-transparent'
              : 'bg-[#f0e9e2] border border-beige/40'
          }`} />
        ))}
      </div>
      <div className="flex items-center gap-1.5 justify-end mt-2.5">
        <span className="text-[11px] text-chocolate/35 font-sans">Fewer</span>
        {[
          'bg-[#f0e9e2] border border-beige/40',
          'bg-mustard/20',
          'bg-mustard/40',
          'bg-mustard/60',
          'bg-mustard',
        ].map((cls, i) => (
          <div key={i} className={`w-3 h-3 rounded-[4px] ${cls}`} />
        ))}
        <span className="text-[11px] text-chocolate/35 font-sans">More</span>
      </div>
    </>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HistoryScreen() {
  const { user } = useAuth()
  const userId   = user?.id ?? 'demo-user-001'

  const [tab, setTab]   = useState<Tab>('insights')
  const [stats, setStats] = useState<LiveStats | null>(null)
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

  // Silence unused warning — openSheet is available for future calendar use
  void openSheet

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

  // ── Insights panel (used in both mobile tab and desktop left column) ──────
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

      {/* Check-in activity heatmap */}
      <div className="bg-white rounded-2xl shadow-[0_6px_18px_-8px_rgba(48,33,26,0.18)] p-5">
        <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-mustard mb-1">
          Check-in activity
        </p>
        <h3 className="font-serif text-[19px] text-chocolate mb-4">Showing up for yourself</h3>
        <Heatmap activeDays={stats?.activeDays ?? []} />
        {stats && stats.activeDays.length > 0 && (
          <div className="mt-3 bg-[#f0e9e2] rounded-[14px] px-4 py-3">
            <p className="font-display font-semibold text-[11px] uppercase tracking-[0.14em] text-mustard mb-1">
              Reading your activity
            </p>
            <p className="font-sans text-[13.5px] text-chocolate/60 leading-[1.6]">
              Each filled square is a day you showed up for yourself. The last 5 weeks shown here.
            </p>
          </div>
        )}
      </div>
    </div>
  )

  // ── Log panel ─────────────────────────────────────────────────────────────
  const LogPanel = (
    <div className="bg-white rounded-2xl shadow-[0_6px_18px_-8px_rgba(48,33,26,0.18)] p-5">
      <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-mustard mb-1">
        Your sessions
      </p>
      <h3 className="font-serif text-[19px] text-chocolate mb-3">Past check-ins</h3>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-14 bg-beige/20 rounded-xl animate-pulse" />
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
        <div>
          {sessionLog.map((session, i) => {
            const when = (() => {
              const diff = Date.now() - session.date.getTime()
              const days = Math.floor(diff / 86400000)
              if (days === 0) return `Today · ${session.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
              if (days === 1) return `Yesterday · ${session.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
              return session.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            })()
            return (
              <div key={i} className={`flex gap-3.5 py-4 ${i > 0 ? 'border-t border-beige/30' : ''}`}>
                <div className="text-2xl leading-none flex-shrink-0 w-7 text-center mt-0.5">
                  {MOOD_EMOJI[session.mood] ?? '😐'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-[13.5px] text-chocolate">{when}</p>
                  <p className="text-[12.5px] text-chocolate/50 font-sans mt-0.5 mb-1.5 capitalize">
                    Felt {session.mood?.toLowerCase()}
                  </p>
                  {session.rec && (
                    <div className="inline-flex items-center gap-1.5 text-[13px] text-chocolate/55 font-sans">
                      Used{' '}
                      <span className="bg-[#f0e9e2] rounded-full px-2.5 py-0.5 text-[12px] font-display font-semibold text-chocolate">
                        {session.rec.title}
                      </span>
                    </div>
                  )}
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
                    No recommendations recorded for this day.
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
