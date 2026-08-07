'use client'

import { useEffect, useState } from 'react'
import { authedFetch } from '@/lib/api-client'

export interface WalletState {
  balance: number
  reservePct: number
}

/**
 * The Reserve — the emotional centerpiece. A gently breathing vessel that fills
 * with what she's done for herself lately. It rises when she shows up and never
 * drains as punishment; gems she's earned are hers to keep.
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
    <div className="relative flex items-center gap-4">
      {/* Breathing glow behind the vessel */}
      <div
        className="reserve-breathe absolute -left-3.5 -top-4 w-28 h-28 rounded-full z-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(201,152,31,.3), transparent 70%)' }}
      />

      {/* Vessel */}
      <div className="relative w-[72px] h-[100px] flex-shrink-0 z-[1]">
        <div
          className="absolute inset-0 overflow-hidden border-2 border-mustard"
          style={{ borderRadius: '36px 36px 22px 22px', background: 'rgba(214,201,190,.3)', boxShadow: 'inset 0 2px 5px rgba(48,33,26,.10)' }}
        >
          <div
            className="absolute left-0 right-0 bottom-0 transition-[height] duration-700 ease-out"
            style={{ height: `${pct}%`, background: 'linear-gradient(180deg, rgba(201,152,31,.85), #c9981f)' }}
          >
            <div
              className="reserve-wave absolute -top-[5px] h-3.5 rounded-[50%]"
              style={{ left: '-20%', width: '140%', background: 'rgba(201,152,31,.9)' }}
            />
          </div>
        </div>
      </div>

      {/* Label + gems + subtitles */}
      <div className="flex-1 min-w-0 relative z-[1]">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-serif text-[18px] text-chocolate">Your reserve</p>
          <div className="inline-flex items-center gap-1.5 flex-shrink-0">
            <span className="w-2 h-2 bg-mustard rotate-45 rounded-[2px] inline-block" />
            <span className="font-display font-semibold text-[13px] text-chocolate tabular-nums">{gems}</span>
          </div>
        </div>
        <p className="font-sans text-[11.5px] text-chocolate/40 mt-[3px] leading-[1.5]">
          It rises when you show up — never drains as punishment.
        </p>
        <p className="font-sans text-[12.5px] text-chocolate/55 mt-1">{subtitle}</p>
      </div>
    </div>
  )
}
