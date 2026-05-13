'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart2, Calendar, Star, ChevronRight, ChevronLeft, TrendingUp, Heart, X, ChevronDown } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

// ─── Constants ────────────────────────────────────────────────────────────────

const MOOD_EMOJI: Record<string, string> = {
  overwhelmed: '😢', struggling: '😔', okay: '😐', good: '😊', thriving: '✨',
}

const RATING_LABEL: Record<number, string> = { 1: 'Not for me', 2: 'Saved', 3: 'Did it ✓' }

const CATEGORY_EMOJI: Record<string, string> = {
  'Rest':            '🌙',
  'Micro Practice':  '✨',
  'Joy':             '💛',
  'Movement':        '🌿',
  'Reflection':      '🪞',
  'Connection':      '💬',
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
type Tab = 'insights' | 'history'

interface DaySheet {
  label: string
  recs: HistoryItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Score each category by engagement (Did it = 2pts, Saved = 1pt) */
function getBestCategory(history: HistoryItem[]): string | null {
  const scores: Record<string, number> = {}
  for (const item of history) {
    if (!scores[item.category]) scores[item.category] = 0
    if (item.rating === 3) scores[item.category] += 2
    else if (item.rating === 2) scores[item.category] += 1
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] ?? null
}

/** Derive top engaged categories from history (Did it = 2pts, Saved = 1pt) */
function getTopEngagedCategories(history: HistoryItem[]): string[] {
  const scores: Record<string, number> = {}
  for (const item of history) {
    if (!item.category) continue
    if (!scores[item.category]) scores[item.category] = 0
    if (item.rating === 3) scores[item.category] += 2
    else if (item.rating === 2) scores[item.category] += 1
  }
  return Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat)
    .slice(0, 4)
}

/** Group history items by category, sorted by engagement score desc */
function groupByCategory(
  history: HistoryItem[],
  excludeCategory?: string
): { category: string; items: HistoryItem[] }[] {
  const map: Record<string, HistoryItem[]> = {}
  for (const item of history) {
    if (item.category === excludeCategory) continue
    if (!map[item.category]) map[item.category] = []
    map[item.category].push(item)
  }
  return Object.entries(map)
    .map(([category, items]) => ({ category, items }))
    .sort((a, b) => {
      const score = (items: HistoryItem[]) =>
        items.reduce((s, i) => s + (i.rating === 3 ? 2 : i.rating === 2 ? 1 : 0), 0)
      return score(b.items) - score(a.items)
    })
}

/** Get all recs for a specific calendar day from history */
function getRecsForDay(
  history: HistoryItem[],
  year: number,
  month: number,
  day: number
): HistoryItem[] {
  return history.filter(item => {
    const d = new Date(item.created_at)
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HistoryScreen() {
  const { user } = useAuth()
  const userId = user?.id ?? 'demo-user-001'

  const [tab, setTab]               = useState<Tab>('insights')
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [stats, setStats]           = useState<LiveStats | null>(null)
  const [loading, setLoading]       = useState(true)

  // Bottom sheet for calendar day detail
  const [daySheet, setDaySheet]         = useState<DaySheet | null>(null)
  const [sheetVisible, setSheetVisible] = useState(false)

  const openSheet = useCallback((sheet: DaySheet) => {
    setDaySheet(sheet)
    // tiny delay so the element mounts before we trigger the transition
    requestAnimationFrame(() => requestAnimationFrame(() => setSheetVisible(true)))
  }, [])

  const closeSheet = useCallback(() => {
    setSheetVisible(false)
    setTimeout(() => setDaySheet(null), 300)
  }, [])

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

  // Calendar data — navigable months, current month by default
  const today        = new Date()
  const [calYear, setCalYear]   = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())

  const firstDay    = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const monthLabel  = new Date(calYear, calMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // activeDays is now full ISO date strings — filter to displayed month
  const activeDays = (stats?.activeDays ?? []).filter((iso: string) => {
    const d = new Date(iso)
    return d.getFullYear() === calYear && d.getMonth() === calMonth
  }).map((iso: string) => new Date(iso).getDate())

  const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth()

  function goToPrevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }

  // Derived history data
  const history     = stats?.recentHistory ?? []
  const bestCat     = getBestCategory(history)
  const bestCatRecs = history.filter(
    i => i.category === bestCat && (i.rating === 3 || i.rating === 2)
  )
  const otherGroups = groupByCategory(history, bestCat ?? undefined)

  return (
    <div className="flex flex-col min-h-screen pb-24">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="font-display font-bold text-chocolate text-xl mb-1">Your Wellness Map</h1>
        <p className="text-xs text-chocolate/50 font-sans mb-4">What we&apos;ve learned about what helps you</p>

        {stats?.topTechniques?.[0] && (
          <div className="bg-white rounded-2xl p-4 border border-beige/20">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">💡</div>
              <div className="flex-1">
                <p className="text-xs font-display font-semibold text-mustard mb-0.5">Your most loved technique</p>
                <p className="font-display font-semibold text-chocolate">{stats.topTechniques[0].title}</p>
                <p className="text-xs text-chocolate/50 font-sans mt-0.5">
                  Saved or completed {stats.topTechniques[0].likedCount} time{stats.topTechniques[0].likedCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Tab Switcher ────────────────────────────────────────────── */}
      <div className="px-5 mb-4">
        <div className="flex bg-beige/20 rounded-xl p-1">
          {(['insights', 'history'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-display font-semibold text-sm transition-all ${
                tab === t ? 'bg-white text-chocolate shadow-sm' : 'text-chocolate/50'
              }`}
            >
              {t === 'insights' ? <BarChart2 size={14} /> : <Calendar size={14} />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-4">

        {/* ══ INSIGHTS TAB ══════════════════════════════════════════════ */}
        {tab === 'insights' && (
          <>
            {/* Stats */}
            <div className="bg-white rounded-2xl p-4 border border-beige/20">
              <div className="flex items-center gap-2 mb-3">
                <Star size={14} className="text-mustard" />
                <p className="font-display font-semibold text-chocolate text-sm">Your Wellness Profile</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Check-ins',  value: stats?.totalCheckins ?? '—', color: 'text-chocolate' },
                  { label: 'Day Streak', value: stats?.streakDays    ?? '—', color: 'text-mustard'   },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center p-2 bg-cream rounded-xl">
                    <p className={`font-display font-bold text-2xl ${color}`}>{value}</p>
                    <p className="text-[10px] text-chocolate/50 font-sans mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              {stats?.commonMood && (
                <div className="mt-3 flex items-center gap-2 pt-3 border-t border-beige/20">
                  <span className="text-lg">{MOOD_EMOJI[stats.commonMood] ?? '😐'}</span>
                  <div>
                    <p className="text-[11px] text-chocolate/40 font-sans">Your most common check-in mood</p>
                    <p className="font-display font-semibold text-sm text-chocolate capitalize">{stats.commonMood}</p>
                  </div>
                </div>
              )}
            </div>

            {/* What You Respond To — derived from actual engagement, not profile settings */}
            {(() => {
              const engagedCats = getTopEngagedCategories(history)
              if (engagedCats.length === 0) return null
              return (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">💝</span>
                    <p className="font-display font-semibold text-chocolate text-sm">What You Respond To</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {engagedCats.map((cat, i) => (
                      <span
                        key={i}
                        className="bg-mustard/10 text-chocolate border border-mustard/20 text-xs font-display font-semibold px-3 py-1.5 rounded-full"
                      >
                        {CATEGORY_EMOJI[cat] ?? ''} {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Activity Calendar */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-chocolate/60" />
                  <p className="font-display font-semibold text-chocolate text-sm">Activity</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPrevMonth}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-beige/30 active:bg-beige/60 transition-colors"
                  >
                    <ChevronLeft size={13} className="text-chocolate/50" />
                  </button>
                  <p className="text-xs font-display font-semibold text-chocolate/40 min-w-[90px] text-center">{monthLabel}</p>
                  {!isCurrentMonth && (
                    <button
                      onClick={() => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()) }}
                      className="text-[10px] font-display font-semibold text-mustard"
                    >
                      Today
                    </button>
                  )}
                  {isCurrentMonth && <div className="w-10" />}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-beige/20">
                {/* Day-of-week labels */}
                <div className="grid grid-cols-7 mb-2">
                  {['S','M','T','W','T','F','S'].map((d, i) => (
                    <div key={i} className="text-center text-[10px] font-display font-semibold text-chocolate/30">{d}</div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1">
                  {[...Array(firstDay)].map((_, i) => <div key={`e-${i}`} />)}
                  {[...Array(daysInMonth)].map((_, i) => {
                    const day      = i + 1
                    const isToday  = isCurrentMonth && day === today.getDate()
                    const isActive = activeDays.includes(day)
                    return (
                      <button
                        key={day}
                        disabled={!isActive}
                        onClick={() => {
                          const recs  = getRecsForDay(history, calYear, calMonth, day)
                          const label = new Date(calYear, calMonth, day).toLocaleDateString('en-US', {
                            weekday: 'long', month: 'long', day: 'numeric',
                          })
                          openSheet({ label, recs })
                        }}
                        className={`aspect-square flex items-center justify-center rounded-full text-[11px] font-display font-semibold transition-all ${
                          isToday
                            ? 'bg-mustard text-white'
                            : isActive
                            ? 'bg-chocolate text-cream cursor-pointer active:scale-90'
                            : 'text-chocolate/40 cursor-default'
                        }`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-beige/10 justify-center">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-chocolate" />
                    <span className="text-[10px] font-sans text-chocolate/40">Check-in</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-mustard" />
                    <span className="text-[10px] font-sans text-chocolate/40">Today</span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-center text-chocolate/30 font-sans mt-2">
                Tap a filled day to see your care kit
              </p>
            </div>
          </>
        )}

        {/* ══ HISTORY TAB ═══════════════════════════════════════════════ */}
        {tab === 'history' && (
          <div className="space-y-5">
            {loading ? (
              [0, 1, 2].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-32 bg-beige/30 rounded animate-pulse" />
                  <div className="h-20 bg-beige/20 rounded-2xl animate-pulse" />
                  <div className="h-14 bg-beige/20 rounded-2xl animate-pulse" />
                  <div className="h-14 bg-beige/20 rounded-2xl animate-pulse" />
                </div>
              ))
            ) : history.length === 0 ? (
              <div className="text-center py-12">
                <p className="font-serif text-chocolate/40 text-lg mb-2">Nothing here yet</p>
                <p className="text-sm text-chocolate/30 font-sans">Complete a check-in to start building your history.</p>
              </div>
            ) : (
              <>
                {/* ── Best Category Hero ── */}
                {bestCat && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp size={14} className="text-chocolate/60" />
                      <p className="font-display font-semibold text-chocolate text-sm">What Works Best For You</p>
                    </div>

                    <div className="bg-chocolate rounded-2xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{CATEGORY_EMOJI[bestCat] ?? '✨'}</span>
                        <div>
                          <p className="font-serif text-cream text-lg leading-tight">{bestCat}</p>
                          <p className="text-[11px] text-cream/50 font-sans">Your highest-rated category</p>
                        </div>
                      </div>

                      {bestCatRecs.length > 0 ? (
                        <div className="space-y-2">
                          {bestCatRecs.slice(0, 4).map((item, i) => (
                            <div key={i} className="bg-cream/10 rounded-xl px-3 py-2.5 flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Heart size={12} className="text-mustard flex-shrink-0" fill="currentColor" />
                                <p className="font-display font-semibold text-sm text-cream truncate">{item.title}</p>
                              </div>
                              <span className={`text-[10px] font-display font-semibold ml-2 flex-shrink-0 ${
                                item.rating === 3 ? 'text-mustard' : 'text-cream/50'
                              }`}>
                                {RATING_LABEL[item.rating]}
                              </span>
                            </div>
                          ))}
                          {bestCatRecs.length > 4 && (
                            <p className="text-[10px] text-cream/30 font-sans text-center mt-1">
                              +{bestCatRecs.length - 4} more
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-cream/40 font-sans">
                          Keep rating recs to see your top picks here.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-beige/40" />
                  <span className="text-[10px] font-display font-semibold text-chocolate/30 uppercase tracking-wide">
                    By Category
                  </span>
                  <div className="flex-1 h-px bg-beige/40" />
                </div>

                {/* ── Other Categories (collapsible) ── */}
                {otherGroups.map(({ category, items }) => {
                  const isOpen     = expandedCat === category
                  const likedCount = items.filter(i => i.rating >= 2).length
                  return (
                    <div key={category} className="bg-white rounded-2xl border border-beige/20 overflow-hidden">
                      {/* Category header row */}
                      <button
                        className="w-full flex items-center gap-3 p-4"
                        onClick={() => setExpandedCat(isOpen ? null : category)}
                      >
                        <span className="text-xl">{CATEGORY_EMOJI[category] ?? '🌿'}</span>
                        <div className="flex-1 text-left">
                          <p className="font-display font-semibold text-chocolate text-sm">{category}</p>
                          <p className="text-[10px] text-chocolate/40 font-sans mt-0.5">
                            {items.length} rec{items.length !== 1 ? 's' : ''}
                            {likedCount > 0 ? ` · ${likedCount} saved or done` : ''}
                          </p>
                        </div>
                        <ChevronDown
                          size={16}
                          className={`text-chocolate/30 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {/* Expanded recs */}
                      {isOpen && (
                        <div className="border-t border-beige/10 px-3 pb-3 pt-2 space-y-1.5">
                          {items.map((item, idx) => {
                            const ratingColor =
                              item.rating === 3 ? 'text-mustard' :
                              item.rating === 2 ? 'text-chocolate/60' :
                              'text-chocolate/25'
                            return (
                              <div
                                key={`${item.rec_id}-${idx}`}
                                className="flex items-center gap-3 bg-cream rounded-xl px-3 py-2.5"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-display font-semibold text-chocolate text-sm truncate">{item.title}</p>
                                  <p className="text-[10px] text-chocolate/40 font-sans mt-0.5 capitalize">
                                    Felt {item.mood} · {timeAgo(item.created_at)}
                                  </p>
                                </div>
                                <span className={`text-xs font-display font-semibold flex-shrink-0 ${ratingColor}`}>
                                  {RATING_LABEL[item.rating]}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* ══ CALENDAR DAY BOTTOM SHEET ═════════════════════════════════ */}
      {daySheet && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 bg-chocolate/50 z-40 transition-opacity duration-300 ${
              sheetVisible ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={closeSheet}
          />

          {/* Sheet */}
          <div
            className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-cream rounded-t-3xl z-50 transition-transform duration-300 pb-safe ${
              sheetVisible ? 'translate-y-0' : 'translate-y-full'
            }`}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-beige rounded-full" />
            </div>

            {/* Sheet header */}
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

            {/* Recs list */}
            <div className="px-5 pb-16 space-y-2 max-h-[65vh] overflow-y-auto">
              {daySheet.recs.length > 0 ? (
                daySheet.recs.map((rec, i) => {
                  const ratingColor =
                    rec.rating === 3 ? 'text-mustard' :
                    rec.rating === 2 ? 'text-chocolate/60' :
                    'text-chocolate/30'
                  return (
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
                        <p className={`text-xs font-display font-semibold ${ratingColor}`}>
                          {RATING_LABEL[rec.rating]}
                        </p>
                        <p className="text-[10px] text-chocolate/25 font-sans capitalize mt-0.5">
                          {MOOD_EMOJI[rec.mood]} {rec.mood}
                        </p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-chocolate/40 font-sans">No recommendations recorded for this day.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
