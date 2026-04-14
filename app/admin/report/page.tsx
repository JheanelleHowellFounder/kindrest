'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { TrendingUp, Users, Heart, Calendar, Star, ArrowUp, ArrowDown, Minus, X, ChevronRight } from 'lucide-react'

const ADMIN_EMAILS = ['jheanelle@kindrest.co', 'jheanelle.e.howell@gmail.com', 'jheanellehowell@gmail.com']

const MOOD_EMOJI: Record<string, string> = {
  overwhelmed: '😢', struggling: '😔', okay: '😐', good: '😊', thriving: '✨',
}

interface UserRow {
  name: string
  email: string
  stage: string
  joined: string
  completed: boolean
  authOnly?: boolean
}

interface ReportData {
  generatedAt: string
  users: {
    totalSignups: number
    totalInApp: number
    totalDropOff: number
    completedOnboarding: number
    newThisWeek: number
    newLastWeek: number
    weekOverWeekChange: number | null
  }
  checkins: {
    total: number
    thisWeek: number
    activeUsersThisWeek: number
  }
  moodBreakdown: { mood: string; count: number }[]
  topRecs: { title: string; category: string; liked: number; total: number }[]
  categoryBreakdown: { category: string; count: number }[]
  allUsers: UserRow[]
  dropOffUsers: UserRow[]
}

// ── Bottom Sheet ──────────────────────────────────────────────────────────────
function UserSheet({ title, users, onClose }: { title: string; users: UserRow[]; onClose: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])

  const close = () => { setVisible(false); setTimeout(onClose, 300) }

  return (
    <>
      <div
        className={`fixed inset-0 bg-chocolate/50 z-40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={close}
      />
      <div
        className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-cream rounded-t-3xl z-50 transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-beige rounded-full" />
        </div>
        <div className="px-5 pt-3 pb-4 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl text-chocolate">{title}</h3>
            <p className="text-xs text-chocolate/40 font-sans mt-0.5">{users.length} mom{users.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={close} className="w-8 h-8 rounded-full bg-beige/40 flex items-center justify-center">
            <X size={14} className="text-chocolate/60" />
          </button>
        </div>
        <div className="px-5 pb-16 space-y-2 max-h-[65vh] overflow-y-auto">
          {users.length === 0 ? (
            <p className="text-center text-chocolate/40 font-sans text-sm py-8">No users here yet.</p>
          ) : (
            users.map((u, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-beige/20 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${u.authOnly ? 'bg-beige/40' : 'bg-mustard/10'}`}>
                  <span className={`font-display font-bold text-sm ${u.authOnly ? 'text-chocolate/30' : 'text-mustard'}`}>
                    {u.name !== 'Anonymous' && u.name !== 'Unknown' ? u.name.charAt(0).toUpperCase() : '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display font-semibold text-chocolate text-sm">{u.name}</p>
                    {u.authOnly && (
                      <span className="text-[9px] bg-beige text-chocolate/40 font-display font-semibold px-1.5 py-0.5 rounded-full">
                        never opened app
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-chocolate/50 font-sans truncate">{u.email}</p>
                  <p className="text-[10px] text-chocolate/30 font-sans capitalize mt-0.5">
                    {u.stage !== '—' ? u.stage : 'Stage not set'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-[10px] font-display font-semibold ${
                    u.authOnly ? 'text-chocolate/25' :
                    u.completed ? 'text-mustard' : 'text-chocolate/30'
                  }`}>
                    {u.authOnly ? 'Signed up only' : u.completed ? 'Onboarded ✓' : 'Pending'}
                  </p>
                  <p className="text-[10px] text-chocolate/30 font-sans mt-0.5">
                    {new Date(u.joined).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon, accent = false, onClick
}: {
  label: string; value: string | number; sub?: string
  icon: React.ReactNode; accent?: boolean; onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`w-full text-left rounded-2xl p-4 border transition-all ${onClick ? 'active:scale-95 cursor-pointer' : 'cursor-default'} ${
        accent ? 'bg-chocolate border-chocolate/20' : 'bg-white border-beige/20'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent ? 'bg-cream/10' : 'bg-mustard/10'}`}>
          {icon}
        </div>
        {onClick && <ChevronRight size={14} className={accent ? 'text-cream/30' : 'text-chocolate/20'} />}
      </div>
      <p className={`font-display font-bold text-3xl mt-1 ${accent ? 'text-cream' : 'text-chocolate'}`}>{value}</p>
      <p className={`font-display font-semibold text-sm mt-0.5 ${accent ? 'text-cream/70' : 'text-chocolate'}`}>{label}</p>
      {sub && <p className={`text-[11px] font-sans mt-0.5 ${accent ? 'text-cream/40' : 'text-chocolate/40'}`}>{sub}</p>}
    </button>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminReport() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [report, setReport]     = useState<ReportData | null>(null)
  const [fetching, setFetching] = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [sheet, setSheet]       = useState<{ title: string; users: UserRow[] } | null>(null)

  const openSheet  = useCallback((title: string, users: UserRow[]) => setSheet({ title, users }), [])
  const closeSheet = useCallback(() => setSheet(null), [])

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/'); return }
    if (!ADMIN_EMAILS.includes(user.email ?? '')) { router.replace('/'); return }

    fetch(`/api/admin/report?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => { setReport(data); setFetching(false) })
      .catch(() => { setError('Could not load report.'); setFetching(false) })
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

  const { users, checkins, moodBreakdown, topRecs, categoryBreakdown, allUsers, dropOffUsers, generatedAt } = report
  const wow      = users.weekOverWeekChange
  const newUsers = allUsers.filter(u => new Date(u.joined) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  const pendingUsers = allUsers.filter(u => !u.completed && !u.authOnly)

  return (
    <div className="min-h-screen bg-cream pb-16">

      {/* Header */}
      <div className="bg-chocolate px-5 pt-14 pb-6">
        <p className="text-mustard font-display font-semibold text-xs uppercase tracking-widest mb-1">Kindrest</p>
        <h1 className="font-serif text-cream text-2xl leading-tight">Weekly Growth Report</h1>
        <p className="text-cream/40 font-sans text-xs mt-1">
          Generated {new Date(generatedAt).toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
          })}
        </p>
      </div>

      <div className="px-5 pt-5 space-y-6">

        {/* ── Users ─────────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-chocolate/50" />
            <p className="font-display font-semibold text-chocolate text-sm">Users</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Total signups — everyone who gave their email */}
            <StatCard
              label="Total Signups"
              value={users.totalSignups}
              sub="gave their email"
              icon={<Users size={16} className="text-cream/70" />}
              accent
              onClick={() => openSheet('All Signups', allUsers)}
            />
            {/* Made it into the app */}
            <StatCard
              label="In the App"
              value={users.totalInApp}
              sub={`${users.completedOnboarding} fully onboarded`}
              icon={<Users size={16} className="text-mustard" />}
              onClick={() => openSheet('In the App', allUsers.filter(u => !u.authOnly))}
            />
          </div>

          {/* Drop-off row */}
          {users.totalDropOff > 0 && (
            <button
              onClick={() => openSheet('Never Opened the App', dropOffUsers)}
              className="mt-2 w-full bg-white rounded-xl border border-beige/20 px-4 py-3 flex items-center justify-between active:scale-95 transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-chocolate/20" />
                <p className="font-display font-semibold text-sm text-chocolate">
                  {users.totalDropOff} signed up but never opened the app
                </p>
              </div>
              <ChevronRight size={14} className="text-chocolate/20" />
            </button>
          )}

          {/* Pending onboarding row */}
          {pendingUsers.length > 0 && (
            <button
              onClick={() => openSheet('Pending Onboarding', pendingUsers)}
              className="mt-2 w-full bg-white rounded-xl border border-beige/20 px-4 py-3 flex items-center justify-between active:scale-95 transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-mustard/50" />
                <p className="font-display font-semibold text-sm text-chocolate">
                  {pendingUsers.length} in the app but haven't finished onboarding
                </p>
              </div>
              <ChevronRight size={14} className="text-chocolate/20" />
            </button>
          )}

          {/* New this week */}
          <div className="mt-3">
            <StatCard
              label="New This Week"
              value={users.newThisWeek}
              sub={
                wow === null ? 'First week of data' :
                wow === 0    ? 'Same as last week' :
                `${Math.abs(wow)}% ${wow > 0 ? 'up' : 'down'} vs last week`
              }
              icon={
                wow === null || wow === 0 ? <Minus size={16} className="text-mustard" /> :
                wow > 0 ? <ArrowUp size={16} className="text-mustard" /> :
                <ArrowDown size={16} className="text-mustard" />
              }
              onClick={() => openSheet('New This Week', newUsers)}
            />
          </div>
        </section>

        {/* ── Check-ins ─────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Heart size={14} className="text-chocolate/50" />
            <p className="font-display font-semibold text-chocolate text-sm">Check-ins</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Total Check-ins"
              value={checkins.total}
              icon={<Heart size={16} className="text-mustard" />}
            />
            <StatCard
              label="This Week"
              value={checkins.thisWeek}
              sub={`${checkins.activeUsersThisWeek} active user${checkins.activeUsersThisWeek !== 1 ? 's' : ''}`}
              icon={<Calendar size={16} className="text-mustard" />}
            />
          </div>
        </section>

        {/* ── Mood Breakdown ────────────────────────────────────────────── */}
        {moodBreakdown.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">💭</span>
              <p className="font-display font-semibold text-chocolate text-sm">How Moms Are Feeling</p>
            </div>
            <div className="bg-white rounded-2xl border border-beige/20 p-4 space-y-2.5">
              {moodBreakdown.map(({ mood, count }) => {
                const total = moodBreakdown.reduce((s, m) => s + m.count, 0)
                const pct   = Math.round((count / total) * 100)
                return (
                  <div key={mood}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{MOOD_EMOJI[mood] ?? '😐'}</span>
                        <p className="font-display font-semibold text-sm text-chocolate capitalize">{mood}</p>
                      </div>
                      <p className="text-xs font-display text-chocolate/50">{count} · {pct}%</p>
                    </div>
                    <div className="h-1.5 bg-beige/30 rounded-full overflow-hidden">
                      <div className="h-full bg-mustard rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Top Recommendations ───────────────────────────────────────── */}
        {topRecs.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Star size={14} className="text-chocolate/50" />
              <p className="font-display font-semibold text-chocolate text-sm">Top Recommendations</p>
            </div>
            <div className="space-y-2">
              {topRecs.map((rec, i) => (
                <div key={i} className="bg-white rounded-xl p-3 border border-beige/20 flex items-center gap-3">
                  <div className="w-7 h-7 bg-mustard/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="font-display font-bold text-xs text-mustard">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-sm text-chocolate truncate">{rec.title}</p>
                    <p className="text-[10px] text-chocolate/40 font-sans">{rec.category}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-display font-semibold text-mustard">{rec.liked} loved</p>
                    <p className="text-[10px] text-chocolate/30 font-sans">{rec.total} shown</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Category Breakdown ────────────────────────────────────────── */}
        {categoryBreakdown.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-chocolate/50" />
              <p className="font-display font-semibold text-chocolate text-sm">Categories Used</p>
            </div>
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
                    <div className="h-1.5 bg-beige/30 rounded-full overflow-hidden">
                      <div className="h-full bg-chocolate/60 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <p className="text-center text-[10px] text-chocolate/25 font-sans pb-4">
          Kindrest Admin · Only visible to you 🤎
        </p>
      </div>

      {sheet && <UserSheet title={sheet.title} users={sheet.users} onClose={closeSheet} />}
    </div>
  )
}
