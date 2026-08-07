'use client'

import { useEffect, useState } from 'react'
import { authedFetch } from '@/lib/api-client'

export interface WalletState {
  balance: number
  reservePct: number
}

/**
 * The Reserve — the emotional centerpiece. A vessel that fills with what she's
 * done for herself lately. It rises when she shows up and never drains as
 * punishment; gems she's earned are hers to keep.
 *
 * `override` lets a parent hand in a fresh wallet (e.g. straight from a save
 * response) for an instant fill; otherwise it fetches its own. `refreshToken`
 * re-fetches when bumped.
 */
export function Reserve({
  refreshToken = 0,
  override = null,
}: {
  refreshToken?: number
  override?: WalletState | null
}) {
  const [wallet, setWallet] = useState<WalletState | null>(override)

  useEffect(() => {
    if (override) { setWallet(override); return }
    let active = true
    authedFetch('/api/wallet')
      .then(r => r.json())
      .then(w => { if (active) setWallet(w) })
      .catch(() => {})
    return () => { active = false }
  }, [refreshToken, override])

  const pct = Math.max(0, Math.min(100, wallet?.reservePct ?? 0))
  const gems = wallet?.balance ?? 0

  // Empty state must never read as "you've done nothing for yourself" — that
  // lands hardest on the most depleted moms. Keep it warm and inviting.
  const subtitle =
    pct > 0
      ? 'Filled by what you do for yourself.'
      : gems > 0
        ? 'It dips as you pour out. Refill whenever you can.'
        : 'Here whenever you’re ready to fill it.'

  return (
    <div className="flex items-center gap-4 bg-white rounded-2xl border border-beige/40 px-4 py-3.5">
      {/* Vessel */}
      <div className="relative w-12 h-16 rounded-lg rounded-b-xl border-2 border-mustard bg-beige/30 overflow-hidden flex-shrink-0">
        <div
          className="absolute left-0 right-0 bottom-0 bg-gradient-to-b from-mustard/80 to-mustard transition-[height] duration-700 ease-out"
          style={{ height: `${pct}%` }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-serif text-[16px] text-chocolate leading-tight">Your reserve</p>
        <p className="font-sans text-[12px] text-chocolate/45 mt-0.5">{subtitle}</p>
      </div>

      {/* Gem balance */}
      <div className="inline-flex items-center gap-1.5 bg-beige/40 rounded-full px-3 py-1 flex-shrink-0">
        <span className="w-2.5 h-2.5 bg-mustard rotate-45 rounded-[2px] inline-block" />
        <span className="font-display font-semibold text-[13px] text-chocolate tabular-nums">{gems}</span>
      </div>
    </div>
  )
}
