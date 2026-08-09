'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authedFetch } from '@/lib/api-client'

const DISMISS_KEY = 'kindrest_care_nudge_dismissed'
const RESHOW_DAYS = 3

/**
 * A gentle, in-app nudge shown when she's told us several days were heavy lately
 * (V4). It's care, not surveillance: warm, dismissible, offering a warmline and a
 * check-in — never the full crisis alarm (that's reserved for crisis language).
 * It steps back once dismissed and won't nag.
 */
export function CareNudge() {
  const router = useRouter()
  const [show, setShow] = useState(false)

  useEffect(() => {
    const dismissed = Number(localStorage.getItem(DISMISS_KEY) ?? 0)
    if (dismissed && Date.now() - dismissed < RESHOW_DAYS * 86_400_000) return
    let active = true
    authedFetch('/api/at-risk')
      .then(r => r.json())
      .then(d => { if (active && d?.atRisk) setShow(true) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  if (!show) return null

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setShow(false)
  }

  return (
    <div className="mx-5 mt-4 bg-chocolate text-cream rounded-2xl p-5">
      <p className="font-serif text-[19px] leading-snug">These past couple of weeks have been heavy.</p>
      <p className="font-sans text-[13.5px] text-cream/70 leading-relaxed mt-2">
        You’ve shown up on some hard days lately — that takes something. You don’t have to carry it
        alone. Whenever you want, someone’s here.
      </p>

      <a
        href="tel:18009444773"
        className="flex items-center gap-2 font-display font-semibold text-[13.5px] text-cream mt-3"
      >
        <span className="text-mustard">♡</span>
        Talk to someone — Postpartum Support International: 1-800-944-4773
      </a>

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={() => router.push('/check-in')}
          className="px-4 py-2.5 bg-mustard text-white rounded-[12px] font-display font-semibold text-[13.5px]"
        >
          Check in with me
        </button>
        <button onClick={dismiss} className="font-sans text-[13px] text-cream/50 hover:text-cream/80 transition-colors">
          I’m okay for now
        </button>
      </div>

      <p className="font-sans text-[11px] text-cream/40 mt-4">
        In crisis right now? Call or text <a href="tel:988" className="underline">988</a>.
      </p>
    </div>
  )
}
