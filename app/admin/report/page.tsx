'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { ADMIN_EMAILS } from '@/lib/admin'
import { Users, X, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'

const MOOD_EMOJI: Record<string, string> = {
  overwhelmed: '⛈️', struggling: '🌧️', okay: '⛅', good: '🌤️', thriving: '☀️',
}
const MOOD_ORDER = ['overwhelmed', 'struggling', 'okay', 'good', 'thriving']
const MOOD_COLOR: Record<string, string> = {
  overwhelmed: 'bg-red-100',
  struggling:  'bg-orange-100',
  okay:        'bg-yellow-50',
  good:        'bg-green-50',
  thriving:    'bg-emerald-50',
}

function moodWeather(moods: { date: string; mood: string }[]): string | null {
  if (!moods?.length) return null
  const counts: Record<string, number> = {}
  for (const { mood } of moods) counts[mood] = (counts[mood] ?? 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7)  return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

interface UserRow {
  name: string; email: string; stage: string; joined: string; lastSeen: string
  completed: boolean; authOnly?: boolean; totalCheckins: number
  lastCheckin: string | null; lastMood: string | null
  recentMoods: { date: string; mood: string }[]
  signupSource?: string | null
}

interface Cohort {
  source: string; totalSignups: number; everCheckedIn: number
  retained: number; avgCheckins: number; users: UserRow[]
}

interface ReportData {
  generatedAt: string
  users: {
    totalSignups: number; totalInApp: number; totalDropOff: number
    completedOnboarding: number; newThisWeek: number; newLastWeek: number
    weekOverWeekChange: number | null
  }
  funnel: {
    signedUp: number; openedApp: number; everCheckedIn: number
    retained: number; retentionRate: number; avgCheckins: number
  }
  checkins: { total: number; thisWeek: number; activeUsersThisWeek: number }
  bingo: { last7: number; last14: number; last30: number; total: number }
  mood: {
    avgMoodLabel: string | null; avgMoodScore: number | null
    breakdown: { mood: string; count: number }[]
    weeklyTrend: { week: string; avgScore: number; count: number }[]
  }
  stageBreakdown: { stage: string; count: number }[]
  topRecs: { title: string; category: string; liked: number; skipped: number; total: number }[]
  categoryBreakdown: { category: string; count: number }[]
  atRiskUsers: UserRow[]
  allUsers: UserRow[]
  dropOffUsers: UserRow[]
  cohorts: Cohort[]
}

// ── Reusable components ────────────────────────────────────────────────────────

function SectionHeader({ emoji, label, sub }: { emoji: string; label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-sm">{emoji}</span>
      <p className="font-display font-semibold text-chocolate text-sm">{label}</p>
      {sub && <span className="ml-auto text-[10px] text-chocolate/30 font-sans">{sub}</span>}
    </div>
  )
}

function Metric({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border ${accent ? 'bg-chocolate border-chocolate/0' : 'bg-white border-beige/20'}`}>
      <p className={`font-display font-bold text-3xl ${accent ? 'text-cream' : 'text-chocolate'}`}>{value}</p>
      <p className={`font-display font-semibold text-sm mt-0.5 ${accent ? 'text-cream/70' : 'text-chocolate'}`}>{label}</p>
      {sub && <p className={`text-[11px] font-sans mt-0.5 ${accent ? 'text-cream/40' : 'text-chocolate/40'}`}>{sub}</p>}
    </div>
  )
}

function Bar({ pct, color = 'bg-mustard' }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 bg-beige/30 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function UserCard({ u }: { u: UserRow }) {
  const [open, setOpen] = useState(false)
  const weather = moodWeather(u.recentMoods ?? [])
  const bg      = weather ? MOOD_COLOR[weather] : 'bg-white'

  return (
    <div className={`rounded-2xl border border-black/5 overflow-hidden transition-all ${u.authOnly ? 'bg-white opacity-60' : bg}`}>
      {/* Collapsed row — always visible */}
      <button
        onClick={() => !u.authOnly && setOpen(v => !v)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${u.authOnly ? 'bg-beige/40' : 'bg-white/60'}`}>
          <span className={`font-display font-bold text-sm ${u.authOnly ? 'text-chocolate/30' : 'text-chocolate/70'}`}>
            {u.name !== 'Anonymous' && u.name !== 'Unknown' ? u.name.charAt(0).toUpperCase() : '?'}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-display font-semibold text-chocolate text-sm">{u.name}</p>
            {u.authOnly && <span className="text-[9px] bg-beige text-chocolate/40 font-display font-semibold px-1.5 py-0.5 rounded-full">never opened</span>}
            {!u.authOnly && !u.completed && <span className="text-[9px] bg-beige/60 text-chocolate/40 font-display font-semibold px-1.5 py-0.5 rounded-full">incomplete profile</span>}
          </div>
          <p className="text-[10px] text-chocolate/40 font-sans mt-0.5">
            {u.authOnly ? 'Signed up · never opened' : u.totalCheckins > 0 ? `${u.totalCheckins} check-in${u.totalCheckins !== 1 ? 's' : ''} · last seen ${relativeDate(u.lastSeen)}` : `last seen ${relativeDate(u.lastSeen)}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {weather && <span className="text-xl">{MOOD_EMOJI[weather]}</span>}
          {!u.authOnly && (open ? <ChevronUp size={12} className="text-chocolate/30" /> : <ChevronDown size={12} className="text-chocolate/30" />)}
        </div>
      </button>

      {/* Expanded detail */}
      {open && !u.authOnly && (
        <div className="px-4 pb-4 pt-1 border-t border-black/5 space-y-3">
          <div className="flex items-center gap-4">
            <div>
              <p className="font-display font-bold text-chocolate text-xl leading-none">{u.totalCheckins}</p>
              <p className="text-[10px] text-chocolate/40 font-sans mt-0.5">total check-ins</p>
            </div>
            <div>
              <p className="font-display font-semibold text-chocolate text-sm leading-none">{u.lastCheckin ? relativeDate(u.lastCheckin) : '—'}</p>
              <p className="text-[10px] text-chocolate/40 font-sans mt-0.5">last check-in</p>
            </div>
            <div>
              <p className="font-display font-semibold text-chocolate text-sm leading-none">{relativeDate(u.lastSeen)}</p>
              <p className="text-[10px] text-chocolate/40 font-sans mt-0.5">last seen in app</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[10px] text-chocolate/40 font-sans">Recent moods:</p>
            {(u.recentMoods ?? []).length > 0
              ? (u.recentMoods ?? []).map((m, i) => (
                  <span key={i} className="text-base" title={m.mood}>{MOOD_EMOJI[m.mood] ?? '⛅'}</span>
                ))
              : <span className="text-[10px] text-chocolate/30 font-sans">no check-ins yet</span>
            }
          </div>

          <div className="flex items-center gap-3">
            <p className="text-[10px] text-chocolate/40 font-sans">{u.email}</p>
            <span className="text-chocolate/20">·</span>
            <p className="text-[10px] text-chocolate/40 font-sans capitalize">{u.stage !== '—' ? u.stage : 'Stage not set'}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Drop-off sheet ─────────────────────────────────────────────────────────────
function DropOffSheet({ users, onClose }: { users: UserRow[]; onClose: () => void }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true))) }, [])
  const close = () => { setVisible(false); setTimeout(onClose, 300) }

  return (
    <>
      <div className={`fixed inset-0 bg-chocolate/50 z-40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`} onClick={close} />
      <div className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-cream rounded-t-3xl z-50 transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-beige rounded-full" /></div>
        <div className="px-5 pt-3 pb-4 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl text-chocolate">Never Opened the App</h3>
            <p className="text-xs text-chocolate/40 font-sans mt-0.5">{users.length} people</p>
          </div>
          <button onClick={close} className="w-8 h-8 rounded-full bg-beige/40 flex items-center justify-center">
            <X size={14} className="text-chocolate/60" />
          </button>
        </div>
        <div className="px-5 pb-16 space-y-2 max-h-[65vh] overflow-y-auto">
          {users.map((u, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-beige/20 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-beige/40 flex items-center justify-center flex-shrink-0">
                <span className="font-display font-bold text-sm text-chocolate/30">?</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-chocolate text-sm">{u.name}</p>
                <p className="text-[11px] text-chocolate/50 font-sans truncate">{u.email}</p>
              </div>
              <p className="text-[10px] text-chocolate/30 font-sans flex-shrink-0">
                {new Date(u.joined).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function AdminReport() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [report, setReport]     = useState<ReportData | null>(null)
  const [fetching, setFetching] = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [showDropOff, setShowDropOff] = useState(false)
  const [showAll, setShowAll]   = useState(false)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/'); return }
    if (!ADMIN_EMAILS.includes(user.email ?? '')) { router.replace('/'); return }
    if (!supabase) { setError('Could not load report.'); setFetching(false); return }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setError('Could not load report.'); setFetching(false); return }
      fetch(`/api/admin/report?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(r => r.json())
        .then(d => { setReport(d); setFetching(false) })
        .catch(() => { setError('Could not load report.'); setFetching(false) })
    })
  }, [user, loading, router])

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-mustard/30 border-t-mustard rounded-full animate-spin mx-auto mb-3" />
          <p className="font-display text-chocolate/50 text-sm">Loading your report...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-chocolate/40 font-sans text-sm">{error ?? 'Something went wrong.'}</p>
      </div>
    )
  }

  const { users, funnel, checkins, bingo, mood, stageBreakdown, topRecs, categoryBreakdown, atRiskUsers, cohorts, allUsers, dropOffUsers, generatedAt } = report

  const q = search.trim().toLowerCase()
  const filteredInApp = allUsers.filter(u => !u.authOnly && (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)))
  const activeUsers    = filteredInApp.filter(u => u.totalCheckins > 0).sort((a, b) => b.totalCheckins - a.totalCheckins)
  const noCheckinUsers = filteredInApp.filter(u => u.totalCheckins === 0)
  const filteredDropOffs = dropOffUsers.filter(u => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  const visibleActive  = showAll || q ? activeUsers : activeUsers.slice(0, 6)

  const totalMoods = mood.breakdown.reduce((s, m) => s + m.count, 0)

  return (
    <div className="min-h-screen bg-cream pb-20">

      {/* Header */}
      <div className="bg-chocolate px-5 pt-14 pb-6">
        <p className="text-mustard font-display font-semibold text-xs uppercase tracking-widest mb-1">Kindrest</p>
        <h1 className="font-serif text-cream text-2xl leading-tight">Growth Dashboard</h1>
        <p className="text-cream/40 font-sans text-xs mt-1">
          {new Date(generatedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <div className="px-5 pt-5 space-y-7">

        {/* ── Engagement Funnel ─────────────────────────────────────────── */}
        <section>
          <SectionHeader emoji="🔽" label="Engagement Funnel" />
          <div className="bg-white rounded-2xl border border-beige/20 overflow-hidden">
            {[
              { label: 'Signed Up',     value: funnel.signedUp,      pct: 100 },
              { label: 'Opened the App', value: funnel.openedApp,    pct: Math.round((funnel.openedApp    / funnel.signedUp) * 100) },
              { label: 'Checked In',    value: funnel.everCheckedIn, pct: Math.round((funnel.everCheckedIn / funnel.signedUp) * 100) },
              { label: 'Retained (3+ sessions)', value: funnel.retained, pct: Math.round((funnel.retained / funnel.signedUp) * 100) },
            ].map(({ label, value, pct }, i) => (
              <div key={i} className={`px-4 py-3 ${i < 3 ? 'border-b border-beige/20' : ''}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-display font-semibold text-sm text-chocolate">{label}</p>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-chocolate text-sm">{value}</span>
                    <span className="text-[10px] text-chocolate/40 font-sans w-8 text-right">{pct}%</span>
                  </div>
                </div>
                <Bar pct={pct} color={i === 3 ? 'bg-mustard' : 'bg-chocolate/20'} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Metric label="Retention Rate" value={`${funnel.retentionRate}%`} sub="3+ check-in sessions" accent />
            <Metric label="Avg Check-ins" value={funnel.avgCheckins} sub="per active user" />
          </div>
        </section>

        {/* ── This Week ─────────────────────────────────────────────────── */}
        <section>
          <SectionHeader emoji="📅" label="This Week" />
          <div className="grid grid-cols-3 gap-2">
            <Metric label="New Signups"    value={users.newThisWeek} sub={
              users.weekOverWeekChange === null ? '—' :
              users.weekOverWeekChange === 0    ? 'flat' :
              `${users.weekOverWeekChange > 0 ? '+' : ''}${users.weekOverWeekChange}% WoW`
            } />
            <Metric label="Check-ins"      value={checkins.thisWeek} />
            <Metric label="Active Users"   value={checkins.activeUsersThisWeek} />
          </div>
        </section>

        {/* ── Community Mood ────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            emoji={mood.avgMoodLabel ? MOOD_EMOJI[mood.avgMoodLabel] : '💭'}
            label="Community Mood"
            sub={mood.avgMoodLabel ? `avg: ${mood.avgMoodLabel}` : undefined}
          />

          {/* Mood breakdown bars */}
          <div className="bg-white rounded-2xl border border-beige/20 p-4 space-y-2.5 mb-3">
            {mood.breakdown.map(({ mood: m, count }) => {
              const pct = totalMoods > 0 ? Math.round((count / totalMoods) * 100) : 0
              return (
                <div key={m}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{MOOD_EMOJI[m] ?? '⛅'}</span>
                      <p className="font-display font-semibold text-sm text-chocolate capitalize">{m}</p>
                    </div>
                    <p className="text-xs font-display text-chocolate/50">{count} · {pct}%</p>
                  </div>
                  <Bar pct={pct} />
                </div>
              )
            })}
          </div>

          {/* Weekly trend — plain week-by-week mood summary */}
          {mood.weeklyTrend.some(w => w.count > 0) && (
            <div className="bg-white rounded-2xl border border-beige/20 p-4">
              <p className="font-display font-semibold text-xs text-chocolate/40 uppercase tracking-widest mb-3">Week by Week</p>
              <div className="space-y-2">
                {mood.weeklyTrend.map((w, i) => {
                  const label = w.avgScore >= 0 ? MOOD_ORDER[Math.round(w.avgScore)] : null
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <p className="text-xs font-sans text-chocolate/50 w-16">{w.week}</p>
                      {w.count > 0 && label ? (
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="text-lg">{MOOD_EMOJI[label]}</span>
                          <p className="font-display font-semibold text-sm text-chocolate capitalize">{label}</p>
                          <p className="text-[10px] text-chocolate/30 font-sans">({w.count} sessions)</p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-chocolate/25 font-sans">no data</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        {/* ── Stage Breakdown ───────────────────────────────────────────── */}
        {stageBreakdown.length > 0 && (
          <section>
            <SectionHeader emoji="🌱" label="Who's in the Community" />
            <div className="bg-white rounded-2xl border border-beige/20 p-4 space-y-2.5">
              {stageBreakdown.map(({ stage, count }) => {
                const pct = users.totalInApp > 0 ? Math.round((count / users.totalInApp) * 100) : 0
                return (
                  <div key={stage}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-display font-semibold text-sm text-chocolate capitalize">{stage}</p>
                      <p className="text-xs font-display text-chocolate/50">{count} · {pct}%</p>
                    </div>
                    <Bar pct={pct} color="bg-chocolate/30" />
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── At Risk ───────────────────────────────────────────────────── */}
        {atRiskUsers.length > 0 && (
          <section>
            <SectionHeader emoji="⚠️" label="Needs Attention" sub="checked in before, gone 14+ days" />
            <div className="space-y-2">
              {atRiskUsers.map((u, i) => (
                <div key={i} className="bg-white rounded-2xl border border-orange-100 p-4 flex items-center gap-3">
                  <AlertCircle size={16} className="text-orange-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-chocolate text-sm">{u.name}</p>
                    <p className="text-[11px] text-chocolate/40 font-sans truncate">{u.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-display font-semibold text-orange-400">{relativeDate(u.lastSeen)}</p>
                    <p className="text-[10px] text-chocolate/30 font-sans mt-0.5">{u.totalCheckins} check-ins total</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Campaign Cohorts ──────────────────────────────────────────── */}
        {cohorts.length > 0 && cohorts.map((c, i) => {
          const label = c.source === 'founding_mom' ? 'Founding Moms' : c.source
          const engagedPct = c.totalSignups > 0 ? Math.round((c.everCheckedIn / c.totalSignups) * 100) : 0
          return (
            <section key={i}>
              <SectionHeader emoji="🌟" label={label} sub={`${c.totalSignups} signed up`} />
              <div className="grid grid-cols-3 gap-2 mb-3">
                <Metric label="Checked In" value={c.everCheckedIn} sub={`${engagedPct}% of cohort`} accent />
                <Metric label="Retained" value={c.retained} sub="3+ sessions" />
                <Metric label="Avg Check-ins" value={c.avgCheckins} />
              </div>
              <div className="space-y-2">
                {c.users.map((u, j) => <UserCard key={j} u={u} />)}
              </div>
            </section>
          )
        })}

        {/* ── Rest Card ─────────────────────────────────────────────────── */}
        <section>
          <SectionHeader emoji="🎲" label="Rest Card" sub={`${bingo?.total ?? 0} ever completed a line`} />
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Bingo · 7d"  value={bingo?.last7 ?? 0}  sub="moms" accent />
            <Metric label="Bingo · 14d" value={bingo?.last14 ?? 0} sub="moms" />
            <Metric label="Bingo · 30d" value={bingo?.last30 ?? 0} sub="moms" />
          </div>
          <p className="text-[11px] text-chocolate/30 font-sans mt-2">
            Unique moms who have completed a full line (row, column, or diagonal).
          </p>
        </section>

        {/* ── User Roster ───────────────────────────────────────────────── */}
        <section>
          <SectionHeader emoji="👥" label="User Roster" sub={`${allUsers.filter(u => !u.authOnly).length} in app`} />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setShowAll(true) }}
            placeholder="Search by name or email..."
            className="w-full bg-white border border-beige/30 rounded-xl px-4 py-2.5 text-sm font-sans text-chocolate placeholder:text-chocolate/30 mb-3 outline-none focus:border-mustard/40"
          />

          {activeUsers.length === 0 && noCheckinUsers.length === 0 && filteredDropOffs.length === 0 ? (
            <p className="text-center text-chocolate/30 font-sans text-sm py-6">
              {q ? `No users matching "${search}"` : 'No users yet.'}
            </p>
          ) : (
            <>
              {activeUsers.length > 0 && (
                <div className="space-y-2">
                  {visibleActive.map((u, i) => <UserCard key={i} u={u} />)}
                  {!q && activeUsers.length > 6 && (
                    <button
                      onClick={() => setShowAll(v => !v)}
                      className="w-full py-3 flex items-center justify-center gap-1.5 text-chocolate/50 font-display font-semibold text-sm"
                    >
                      {showAll
                        ? <><ChevronUp size={14} /> Show less</>
                        : <><ChevronDown size={14} /> Show all {activeUsers.length} users</>}
                    </button>
                  )}
                </div>
              )}

              {noCheckinUsers.length > 0 && (
                <div className="mt-4">
                  <p className="font-display font-semibold text-chocolate/40 text-xs mb-2 uppercase tracking-widest">In app · never checked in</p>
                  <div className="space-y-2">
                    {noCheckinUsers.map((u, i) => <UserCard key={i} u={u} />)}
                  </div>
                </div>
              )}

              {q && filteredDropOffs.length > 0 && (
                <div className="mt-4">
                  <p className="font-display font-semibold text-chocolate/40 text-xs mb-2 uppercase tracking-widest">Signed up · never opened app</p>
                  <div className="space-y-2">
                    {filteredDropOffs.map((u, i) => <UserCard key={i} u={u} />)}
                  </div>
                </div>
              )}
            </>
          )}

          {!q && users.totalDropOff > 0 && (
            <button
              onClick={() => setShowDropOff(true)}
              className="mt-3 w-full bg-white rounded-xl border border-beige/20 px-4 py-3 flex items-center justify-between active:scale-95 transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-chocolate/20" />
                <p className="font-display font-semibold text-sm text-chocolate">{users.totalDropOff} signed up but never opened the app</p>
              </div>
              <Users size={14} className="text-chocolate/20" />
            </button>
          )}
        </section>

        {/* ── Category Breakdown ────────────────────────────────────────── */}
        {categoryBreakdown.length > 0 && (
          <section>
            <SectionHeader emoji="📊" label="Most Used Categories" />
            <div className="bg-white rounded-2xl border border-beige/20 p-4 space-y-2.5">
              {categoryBreakdown.map(({ category, count }) => {
                const total = categoryBreakdown.reduce((s, c) => s + c.count, 0)
                const pct   = Math.round((count / total) * 100)
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-display font-semibold text-sm text-chocolate">{category}</p>
                      <p className="text-xs font-display text-chocolate/50">{count} · {pct}%</p>
                    </div>
                    <Bar pct={pct} color="bg-chocolate/50" />
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <p className="text-center text-[10px] text-chocolate/25 font-sans pb-4">Kindrest Admin · Only visible to you 🤎</p>
      </div>

      {showDropOff && <DropOffSheet users={dropOffUsers} onClose={() => setShowDropOff(false)} />}
    </div>
  )
}
