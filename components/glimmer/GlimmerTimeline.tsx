'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { authedFetch } from '@/lib/api-client'

interface Glimmer {
  id: string
  prompt_text: string
  body: string
  entry_date: string
}

function prettyDate(d: string): string {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

/**
 * Her private collection of glimmers, newest first. This is the "investment"
 * that pulls her back — a growing record of small good things she noticed.
 */
export function GlimmerTimeline() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [glimmers, setGlimmers] = useState<Glimmer[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/signin?redirect=/glimmers'); return }
    authedFetch('/api/glimmer/timeline')
      .then(r => r.json())
      .then(data => setGlimmers(data?.glimmers ?? []))
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [user, loading, router])

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-cream">
      <div className="px-5 pt-12 pb-2">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 font-sans text-[13.5px] text-chocolate/50 hover:text-chocolate transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Home
        </button>
        <h1 className="font-serif text-[28px] text-chocolate">Your glimmers</h1>
        <p className="font-sans text-[14px] text-chocolate/50 mt-1">
          Small good things you noticed, kept in one place.
        </p>
      </div>

      <div className="px-5 mt-4 space-y-3">
        {fetching ? (
          <p className="font-sans text-[13px] text-chocolate/30 text-center py-8">Gathering them…</p>
        ) : glimmers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-beige/40 px-6 py-8 text-center">
            <p className="font-serif text-[18px] text-chocolate leading-snug">Your first glimmer is waiting.</p>
            <p className="font-sans text-[13.5px] text-chocolate/50 mt-2">
              Notice one small good thing today, and it’ll live here.
            </p>
          </div>
        ) : (
          glimmers.map(g => (
            <div key={g.id} className="bg-white rounded-2xl border border-beige/40 px-5 py-4">
              <p className="font-sans text-[11px] uppercase tracking-[0.12em] text-mustard">{prettyDate(g.entry_date)}</p>
              <p className="font-sans text-[12.5px] text-chocolate/40 mt-1.5">{g.prompt_text}</p>
              <p className="font-serif text-[17px] text-chocolate leading-snug mt-2">{g.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
