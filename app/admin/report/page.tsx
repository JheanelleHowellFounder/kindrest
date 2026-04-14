'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { TrendingUp, Users, Heart, Calendar, Star, ArrowUp, ArrowDown, Minus } from 'lucide-react'

// ── Emails that can access the report ────────────────────────────────────────
const ADMIN_EMAILS = ['jheanelle@kindrest.co', 'jheanelle.e.howell@gmail.com', 'jheanellehowell@gmail.com']

const MOOD_EMOJI: Record<string, string> = {
  overwhelmed: '😢', struggling: '😔', okay: '😐', good: '😊', thriving: '✨',
}

interface ReportData {
  generatedAt: string
  users: {
    total: number
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
  recentSignups: { name: string; stage: string; joined: string; completed: boolean }[]
}

function StatCard({
  label, value, sub, icon, accent = false
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  accent?: boolean
}) {
  return (
    <div className={`rounded-2xl p-4 border ${accent ? 'bg-chocolate border-chocolate/20 text-cream' : 'bg-white border-beige/20'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent ? 'bg-cream/10' : 'bg-mustard/10'}`}>
          {icon}
        </div>
      </div>
      <p className={`font-display font-bold text-3xl mt-1 ${accent ? 'text-cream' : 'text-chocolate'}`}>{value}</p>
      <p className={`font-display font-semibold text-sm mt-0.5 ${accent ? 'text-cream/70' : 'text-chocolate'}`}>{label}</p>
      {sub && <p className={`text-[11px] font-sans mt-0.5 ${accent ? 'text-cream/40' : 'text-chocolate/40'}`}>{sub}</p>}
    </div>
  )
}

export default function AdminReport() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [report, setReport]     = useState<ReportData | null>(null)
  const [fetching, setFetching] = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    if (loading) return

    // Guard — not logged in
    if (!user) { router.replace('/'); return }

    // Guard — wrong email
    const email = user.email ?? ''
    if (!ADMIN_EMAILS.includes(email)) { router.replace('/'); return }

    // Fetch report data
    fetch('/api/admin/report')
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

  const { users, checkins, moodBreakdown, topRecs, categoryBreakdown, recentSignups, generatedAt } = report
  const wow = users.weekOverWeekChange

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

        {/* ── User Stats ──────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-chocolate/50" />
            <p className="font-display font-semibold text-chocolate text-sm">Users</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Total Moms"
              value={users.total}
              sub={`${users.completedOnboarding} completed onboarding`}
              icon={<Users size={16} className="text-mustard" />}
              accent
            />
            <StatCard
              label="New This Week"
              value={users.newThisWeek}
              sub={
                wow === null ? 'First week of data' :
                wow === 0 ? 'Same as last week' :
                `${Math.abs(wow)}% ${wow > 0 ? 'up' : 'down'} vs last week`
              }
              icon={
                wow === null || wow === 0
                  ? <Minus size={16} className="text-mustard" />
                  : wow > 0
                  ? <ArrowUp size={16} className="text-mustard" />
                  : <ArrowDown size={16} className="text-mustard" />
              }
            />
          </div>
        </section>

        {/* ── Check-in Stats ──────────────────────────────────────────── */}
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

        {/* ── Mood Breakdown ──────────────────────────────────────────── */}
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
                      <div
                        className="h-full bg-mustard rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Top Recommendations ─────────────────────────────────────── */}
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

        {/* ── Category Breakdown ──────────────────────────────────────── */}
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
                      <div
                        className="h-full bg-chocolate/60 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Recent Signups ──────────────────────────────────────────── */}
        {recentSignups.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Users size={14} className="text-chocolate/50" />
              <p className="font-display font-semibold text-chocolate text-sm">Recent Signups</p>
            </div>
            <div className="space-y-2">
              {recentSignups.map((u, i) => (
                <div key={i} className="bg-white rounded-xl p-3 border border-beige/20 flex items-center gap-3">
                  <div className="w-8 h-8 bg-mustard/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="font-display font-bold text-xs text-mustard">
                      {u.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-sm text-chocolate">{u.name}</p>
                    <p className="text-[10px] text-chocolate/40 font-sans capitalize">{u.stage || 'Stage not set'}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[10px] font-display font-semibold ${u.completed ? 'text-mustard' : 'text-chocolate/30'}`}>
                      {u.completed ? 'Onboarded ✓' : 'Pending'}
                    </p>
                    <p className="text-[10px] text-chocolate/30 font-sans">
                      {new Date(u.joined).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <p className="text-center text-[10px] text-chocolate/25 font-sans pb-4">
          Kindrest Admin · Only visible to you 🤎
        </p>
      </div>
    </div>
  )
}
