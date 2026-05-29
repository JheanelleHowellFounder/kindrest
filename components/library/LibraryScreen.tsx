'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import type { LibraryItem } from '@/app/api/library/route'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  'Rest':           '🌙',
  'Micro Practice': '✨',
  'Joy':            '💛',
  'Movement':       '🌿',
  'Reflection':     '🪞',
  'Connection':     '💬',
}

const ALL_CATEGORIES = ['Rest', 'Micro Practice', 'Joy', 'Movement', 'Reflection', 'Connection']

// ─── Component ────────────────────────────────────────────────────────────────

export function LibraryScreen() {
  const router          = useRouter()
  const { user, loading: authLoading } = useAuth()
  const userId          = user?.id ?? 'demo-user-001'

  const [items, setItems]   = useState<LibraryItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [filter, setFilter] = useState<string>('All')

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) router.push('/onboarding')
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return
    fetch(`/api/library?userId=${userId}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => { setItems(data.items ?? []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [user, userId])

  // Only show category filters that appear in the user's library
  const activeCategories = useMemo(() => {
    const cats = new Set(items.map(i => i.category).filter(Boolean))
    return ALL_CATEGORIES.filter(c => cats.has(c))
  }, [items])

  const visible = useMemo(() => {
    if (filter === 'All') return items
    return items.filter(i => i.category === filter)
  }, [items, filter])

  const doneCount  = items.filter(i => i.rating === 3).length
  const savedCount = items.filter(i => i.rating === 2).length

  if (authLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-mustard border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">

      {/* Header ─────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-10 pb-2">
        <p className="font-display font-semibold text-[11px] uppercase tracking-[0.16em] text-mustard">
          Library
        </p>
        <h1 className="font-serif text-[26px] text-chocolate leading-[1.12] mt-1.5">
          Things that work<br />for you.
        </h1>
      </div>

      {/* Summary row ────────────────────────────────────────────────────── */}
      {loaded && items.length > 0 && (
        <div className="px-5 mt-3 flex gap-3">
          <div className="flex-1 bg-white rounded-2xl border border-beige/40 px-4 py-3 text-center">
            <p className="font-serif text-[26px] text-chocolate leading-none">{doneCount}</p>
            <p className="font-display font-semibold text-[11px] text-chocolate/45 mt-0.5 uppercase tracking-[0.1em]">
              Done
            </p>
          </div>
          <div className="flex-1 bg-white rounded-2xl border border-beige/40 px-4 py-3 text-center">
            <p className="font-serif text-[26px] text-chocolate leading-none">{savedCount}</p>
            <p className="font-display font-semibold text-[11px] text-chocolate/45 mt-0.5 uppercase tracking-[0.1em]">
              Saved
            </p>
          </div>
          <div className="flex-1 bg-white rounded-2xl border border-beige/40 px-4 py-3 text-center">
            <p className="font-serif text-[26px] text-chocolate leading-none">{items.length}</p>
            <p className="font-display font-semibold text-[11px] text-chocolate/45 mt-0.5 uppercase tracking-[0.1em]">
              Total
            </p>
          </div>
        </div>
      )}

      {/* Category filter pills ───────────────────────────────────────────── */}
      {loaded && activeCategories.length > 1 && (
        <div className="px-5 mt-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {['All', ...activeCategories].map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`flex-shrink-0 font-display font-semibold text-[12.5px] px-4 py-2 rounded-full border transition-colors ${
                  filter === cat
                    ? 'bg-chocolate text-cream border-chocolate'
                    : 'bg-white text-chocolate/55 border-beige/50 hover:text-chocolate/70'
                }`}
              >
                {cat === 'All' ? 'All' : `${CATEGORY_EMOJI[cat] ?? ''} ${cat}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content ─────────────────────────────────────────────────────────── */}
      <div className="px-5 mt-4">

        {/* Loading skeleton */}
        {!loaded && (
          <div className="space-y-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-[72px] bg-white rounded-2xl border border-beige/30 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state — no items at all */}
        {loaded && items.length === 0 && (
          <div className="mt-8 text-center px-4">
            <p className="text-4xl mb-4">🌿</p>
            <p className="font-serif text-[20px] text-chocolate leading-snug mb-2">
              Nothing here yet
            </p>
            <p className="font-sans text-[14px] text-chocolate/50 leading-relaxed max-w-[280px] mx-auto">
              When you save or complete a technique during a check-in, it&apos;ll live here — ready whenever you need it.
            </p>
          </div>
        )}

        {/* Empty state — no items in this category */}
        {loaded && items.length > 0 && visible.length === 0 && (
          <div className="mt-6 text-center">
            <p className="font-sans text-[14px] text-chocolate/40">
              Nothing in {filter} yet.
            </p>
          </div>
        )}

        {/* Item list */}
        {loaded && visible.length > 0 && (
          <div className="space-y-2">
            {visible.map((item, i) => (
              <div
                key={`${item.rec_id}-${i}`}
                className="bg-white rounded-2xl border border-beige/30 px-4 py-4 flex items-center gap-3.5"
              >
                {/* Category icon */}
                <div
                  className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[22px] flex-shrink-0"
                  style={{ background: '#f0e9e2' }}
                >
                  {CATEGORY_EMOJI[item.category] ?? '✨'}
                </div>

                {/* Text */}
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

                {/* Status badge */}
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
    </div>
  )
}
