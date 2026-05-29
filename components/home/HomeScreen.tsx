'use client'

import Link from 'next/link'
import { Play, Clock, Bookmark } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { FeedbackSheet } from '@/components/shared/FeedbackSheet'

interface LiveStats {
  totalCheckins: number
  streakDays: number
  topTechniques: { title: string; usedCount: number; likedCount: number; category: string; lastUsed?: string }[]
  recentHistory: { rec_id: number; title: string; rating: number; mood: string; category: string; created_at: string }[]
  activeDays: string[]
}

const CATEGORY_EMOJI: Record<string, string> = {
  'Rest': '🌙',
  'Micro Practice': '✨',
  'Joy': '💛',
  'Movement': '🌿',
  'Reflection': '🪞',
  'Connection': '💬',
}

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

export function HomeScreen() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const userId    = user?.id ?? 'demo-user-001'
  const firstName = user?.user_metadata?.name?.split(' ')[0] ?? 'there'

  const [stats, setStats]             = useState<LiveStats | null>(null)
  const [statsLoaded, setStatsLoaded] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) router.push('/onboarding')
  }, [authLoading, user, router])

  const fetchStats = () => {
    if (!user) return
    fetch(`/api/stats?userId=${userId}`, { cache: 'no-store' })
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

  // Derive display values ────────────────────────────────────────────────────
  const savedTech   = stats?.topTechniques.find(t => t.likedCount > 0) ?? null
  const recentItem  = stats?.recentHistory[0] ?? null
  const isRecent    = recentItem
    ? Date.now() - new Date(recentItem.created_at).getTime() < 36 * 3600 * 1000
    : false

  const streakDays = stats?.streakDays ?? 0
  let lastCheckinWhen = ''
  if (stats?.activeDays && stats.activeDays.length > 0) {
    const latestMs = Math.max(...stats.activeDays.map(d => new Date(d).getTime()))
    const days     = Math.floor((Date.now() - latestMs) / 86400000)
    lastCheckinWhen = days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
  }

  const isNewUser = !statsLoaded || !stats || stats.totalCheckins === 0

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
      </div>

      <div className="px-5 mt-4 space-y-4">

        {/* Primary CTA — dark hero card with mustard glow ──────────────── */}
        <Link href="/check-in" className="block">
          <div className="relative bg-chocolate rounded-[32px] p-6 overflow-hidden">
            {/* Glow */}
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

        {/* Streak nudge ──────────────────────────────────────────────────── */}
        {statsLoaded && streakDays > 0 && lastCheckinWhen && (
          <div className="flex items-center gap-2.5 px-1 text-[13.5px] text-chocolate/60 font-sans">
            <Clock size={16} className="text-mustard flex-shrink-0" />
            <span>
              <strong className="text-chocolate font-semibold">{streakDays}-day streak.</strong>
              {' '}Last check-in {lastCheckinWhen}.
            </span>
          </div>
        )}

        {/* Continue where you left off ──────────────────────────────────── */}
        {statsLoaded && recentItem && isRecent && (
          <div className="bg-white rounded-[28px] border border-beige/40 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-mustard">
                Continue where you left off
              </p>
              <p className="text-[12px] text-chocolate/40 font-sans">
                {new Date(recentItem.created_at).toLocaleDateString('en-US', {
                  weekday: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-[14px] bg-cream flex items-center justify-center text-2xl flex-shrink-0">
                {CATEGORY_EMOJI[recentItem.category] ?? '🌙'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-[17px] text-chocolate leading-tight truncate">
                  {recentItem.title}
                </p>
                <p className="text-[12.5px] text-chocolate/50 font-sans mt-0.5">
                  2 of 3 steps · pick up where you paused
                </p>
              </div>
              <Link
                href="/check-in"
                onClick={e => e.stopPropagation()}
                className="flex-shrink-0 bg-cream text-chocolate font-display font-semibold text-[13px] px-4 py-2.5 rounded-[15px]"
              >
                Resume
              </Link>
            </div>
            {/* Progress indicator */}
            <div className="mt-3.5 h-1.5 rounded-full bg-beige/40 overflow-hidden">
              <div className="h-full bg-mustard rounded-full" style={{ width: '66%' }} />
            </div>
          </div>
        )}

        {/* A technique you saved ─────────────────────────────────────────── */}
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

        {/* New user empty state ──────────────────────────────────────────── */}
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
