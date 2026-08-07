'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, LayoutGrid } from 'lucide-react'
import { authedFetch } from '@/lib/api-client'

interface Progress {
  hasCard: boolean
  doneCount: number
  total: number
}

/**
 * The Rest Card entry point on the home — the reserve's second feeder, sitting
 * right under it. Adaptive: it teaches what the card is the first time (no
 * progress yet), then collapses to a slim progress strip once she's engaged, so
 * the glimmer below stays the hero.
 */
export function RestCardEntry() {
  const router = useRouter()
  const [progress, setProgress] = useState<Progress | null>(null)

  const refresh = useCallback(() => {
    authedFetch('/api/rest-card/progress', { cache: 'no-store' })
      .then(r => r.json())
      .then((p: Progress) => setProgress(p))
      .catch(() => {})
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // Refresh when returning to the home (e.g. after un-checking a square), so the
  // count never shows stale.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [refresh])

  const started = (progress?.doneCount ?? 0) > 0
  const go = () => router.push('/rest-card')

  // Engaged → slim single-row strip with live progress.
  if (started && progress) {
    return (
      <button
        onClick={go}
        className="w-full flex items-center gap-3 bg-white border border-beige/40 rounded-2xl px-4 py-3 text-left hover:border-mustard/40 transition-colors"
      >
        <LayoutGrid className="w-4 h-4 text-mustard flex-shrink-0" />
        <span className="font-display font-semibold text-[14px] text-chocolate flex-1">Your Rest Card</span>
        <span className="font-sans text-[12.5px] text-chocolate/45 tabular-nums">{progress.doneCount} of {progress.total}</span>
        <ChevronRight className="w-4 h-4 text-chocolate/30 flex-shrink-0" />
      </button>
    )
  }

  // First time / nothing done yet → richer teaching strip.
  return (
    <button
      onClick={go}
      className="w-full flex items-center gap-3.5 bg-white border border-beige/40 rounded-2xl px-4 py-3.5 text-left hover:border-mustard/40 transition-colors"
    >
      <LayoutGrid className="w-5 h-5 text-mustard flex-shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="font-display font-semibold text-[14px] text-chocolate block">Your Rest Card</span>
        <span className="font-sans text-[12px] text-chocolate/50 block leading-snug">Small restorative things. Do one, fill your reserve.</span>
      </span>
      <ChevronRight className="w-4 h-4 text-chocolate/30 flex-shrink-0" />
    </button>
  )
}
