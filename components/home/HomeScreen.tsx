'use client'

import Link from 'next/link'
import { Sparkles, Heart, Lightbulb, ChevronRight, MessageCircle } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { FeedbackSheet } from '@/components/shared/FeedbackSheet'

interface LiveStats {
  totalCheckins: number
  streakDays: number
  topTechniques: { title: string; usedCount: number; likedCount: number }[]
}

const QUOTE_POOL = [
  '"One moment at a time."',
  '"You are doing better than you think."',
  '"Rest is not a reward — it is a requirement."',
  '"You haven\'t lost yourself. You are still here."',
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function HomeScreen() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const userId = user?.id ?? 'demo-user-001'
  const firstName = user?.user_metadata?.name?.split(' ')[0] ?? 'there'

  const [stats, setStats]           = useState<LiveStats | null>(null)
  const [statsLoaded, setStatsLoaded] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  // Redirect unauthenticated users to onboarding
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/onboarding')
    }
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

  // Rotate quote by day-of-year seed
  const quote = useMemo(() => {
    const now = new Date()
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
    )
    return QUOTE_POOL[dayOfYear % QUOTE_POOL.length]
  }, [])

  const isNewUser = !statsLoaded || !stats || stats.totalCheckins === 0
  const greeting = getGreeting()

  // Show minimal shell while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-mustard border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl text-chocolate leading-tight">
            {greeting}, {firstName}
          </h1>
          <div className="h-0.5 w-8 bg-mustard mt-2 rounded-full" />
          <p className="font-sans text-sm italic text-chocolate/60 mt-1 leading-relaxed max-w-[220px]">
            {quote}
          </p>
        </div>
        {/* Avatar circle */}
        <div className="w-10 h-10 bg-mustard/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
          <span className="font-display font-semibold text-base text-mustard">
            {firstName.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="px-5 space-y-4">
        {/* Start Check-In CTA */}
        <Link href="/check-in">
          <div className="bg-chocolate rounded-2xl p-5 flex items-center justify-between cursor-pointer active:opacity-90 transition-opacity">
            <div>
              <h2 className="font-display font-semibold text-white text-lg">Start Check-In</h2>
              <p className="text-white/60 text-sm font-sans mt-0.5">Get your personalized care kit</p>
            </div>
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Sparkles size={20} className="text-mustard" />
            </div>
          </div>
        </Link>

        {/* New user invitation OR returning user stats */}
        {isNewUser ? (
          <div className="bg-mustard/5 border border-mustard/20 rounded-2xl p-5 mt-2">
            <p className="font-serif text-chocolate text-lg leading-snug">
              Ready to meet yourself?
            </p>
            <p className="text-sm text-chocolate/60 font-sans mt-1 leading-relaxed">
              Your first check-in takes about 2 minutes. Kindrest will get to know you from there.
            </p>
          </div>
        ) : (
          <>
            {/* What's Working For You */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb size={16} className="text-chocolate/60" />
                  <h3 className="font-display font-semibold text-chocolate text-base">
                    What&apos;s Working For You
                  </h3>
                </div>
                <Link href="/history" className="flex items-center gap-0.5 text-mustard text-sm font-display font-semibold">
                  See all <ChevronRight size={14} />
                </Link>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-chocolate rounded-2xl p-4">
                  <p className="text-xs font-display font-semibold text-cream/60">Check-ins</p>
                  <p className="font-display font-bold text-3xl text-mustard mt-1">
                    {stats?.totalCheckins ?? '—'}
                  </p>
                </div>
                <div className="bg-mustard/10 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Heart size={12} className="text-mustard" />
                    <span className="text-xs font-display font-semibold text-mustard">Day Streak</span>
                  </div>
                  <p className="font-display font-bold text-3xl text-chocolate">
                    {stats?.streakDays ?? '—'}
                  </p>
                </div>
              </div>

              {/* Top Techniques */}
              <div>
                <p className="text-[10px] font-display font-semibold text-chocolate/40 tracking-widest uppercase mb-2">
                  Top Techniques For You
                </p>
                {stats && stats.topTechniques.length > 0 ? (
                  <div className="space-y-2">
                    {stats.topTechniques.slice(0, 3).map((tech, i) => (
                      <div key={i} className="flex items-center justify-between bg-white rounded-xl p-3 border border-beige/20">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 bg-mustard/10 rounded-lg flex items-center justify-center">
                            <span className="text-xs font-display font-bold text-mustard">{i + 1}</span>
                          </div>
                          <div>
                            <p className="text-sm font-display font-semibold text-chocolate">{tech.title}</p>
                            <p className="text-[11px] text-chocolate/40 font-sans">
                              Saved or done {tech.likedCount} time{tech.likedCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <Heart size={14} className="text-rose-300" fill="currentColor" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="h-14 bg-beige/20 rounded-xl animate-pulse" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Feedback */}
        <button
          onClick={() => setShowFeedback(true)}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm text-chocolate/50 font-sans border border-beige/40 rounded-2xl hover:border-mustard/40 transition-colors"
        >
          <MessageCircle size={14} className="text-chocolate/40" />
          Share feedback
        </button>
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
