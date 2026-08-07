'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { authedFetch } from '@/lib/api-client'
import { Reserve, type WalletState } from '@/components/glimmer/Reserve'

interface Square {
  id: string
  position: number
  label: string
  source: string
  status: 'open' | 'done'
}

/**
 * The Rest Card (V2) — a 4×4 of small restorative actions. Tap one you've done;
 * it fills your reserve. Complete a line for a bonus. No timer shown, no penalty
 * for an unfinished card — it just refreshes for a fresh slate every couple weeks.
 */
export function RestCard() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [squares, setSquares] = useState<Square[]>([])
  const [fetching, setFetching] = useState(true)
  const [wallet, setWallet] = useState<WalletState | null>(null)
  const [reserveToken, setReserveToken] = useState(0)
  const [saving, setSaving] = useState<string | null>(null)
  const [celebrate, setCelebrate] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/signin?redirect=/rest-card'); return }
    authedFetch('/api/rest-card')
      .then(r => r.json())
      .then(data => setSquares(data?.card?.squares ?? []))
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [user, loading, router])

  const doneCount = squares.filter(s => s.status === 'done').length

  async function complete(sq: Square) {
    if (sq.status === 'done' || saving) return
    setSaving(sq.id)
    // Optimistic
    setSquares(prev => prev.map(s => s.id === sq.id ? { ...s, status: 'done' } : s))
    try {
      const res = await authedFetch('/api/rest-card/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ squareId: sq.id }),
      })
      const data = await res.json().catch(() => null)
      if (data?.wallet) { setWallet(data.wallet); setReserveToken(t => t + 1) }
      if (data?.completedLineCount > 0) { setCelebrate(true); setTimeout(() => setCelebrate(false), 2600) }
    } catch {
      /* keep the optimistic state; best-effort */
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-cream">
      <div className="px-5 pt-12 pb-2">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 font-sans text-[13.5px] text-chocolate/50 hover:text-chocolate transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Home
        </button>
        <h1 className="font-serif text-[28px] text-chocolate">Your Rest Card</h1>
        <p className="font-sans text-[14px] text-chocolate/50 mt-1">
          Small things, whenever you get to them. Tap one you’ve done — no rush, no timer.
        </p>
      </div>

      <div className="px-5 mt-2">
        <Reserve refreshToken={reserveToken} override={wallet} />
      </div>

      {celebrate && (
        <div className="px-5 mt-3">
          <div className="bg-chocolate text-cream rounded-2xl px-5 py-3 text-center">
            <span className="font-serif text-[17px]">A whole line — beautifully done.</span>
            <span className="font-sans text-[12.5px] text-cream/60 block mt-0.5">+10 gems poured into your reserve.</span>
          </div>
        </div>
      )}

      <div className="px-5 mt-4">
        {fetching ? (
          <p className="font-sans text-[13px] text-chocolate/30 text-center py-10">Laying out your card…</p>
        ) : squares.length === 0 ? (
          <div className="bg-white rounded-2xl border border-beige/40 px-6 py-8 text-center">
            <p className="font-serif text-[18px] text-chocolate">Your card is on its way.</p>
            <p className="font-sans text-[13px] text-chocolate/50 mt-1.5">Check back in a moment.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2">
              {squares.map(sq => {
                const done = sq.status === 'done'
                return (
                  <button
                    key={sq.id}
                    onClick={() => complete(sq)}
                    disabled={done || saving === sq.id}
                    className={`aspect-square rounded-xl border p-2 flex flex-col justify-between text-left transition-colors ${
                      done
                        ? 'bg-gradient-to-br from-mustard to-mustard/80 border-transparent'
                        : 'bg-white border-beige/50 hover:border-mustard/40'
                    }`}
                  >
                    <span className={`font-sans text-[10.5px] leading-tight ${done ? 'text-white' : 'text-chocolate/70'}`}>
                      {sq.label}
                    </span>
                    {done && <Check className="w-3.5 h-3.5 text-white self-end" />}
                  </button>
                )
              })}
            </div>
            <p className="text-center font-sans text-[12.5px] text-chocolate/40 mt-4">
              {doneCount} of {squares.length} done · each one fills your reserve
            </p>
          </>
        )}
      </div>
    </div>
  )
}
