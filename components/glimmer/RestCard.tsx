'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { authedFetch } from '@/lib/api-client'
import { useWallet } from '@/lib/wallet-context'
import { Reserve } from '@/components/glimmer/Reserve'
import { completedLines } from '@/lib/restcard'

interface Square {
  id: string
  position: number
  label: string
  source: string
  status: 'open' | 'done'
}

/**
 * The Rest Card (V2) — a 4×4 of small restorative actions. Tap a square to mark
 * it done and fill your reserve; tap it again to undo (which returns those gems,
 * so the reserve stays true). Complete a line for a bonus. No timer, no penalty
 * for an unfinished card — it just refreshes for a fresh slate every couple weeks.
 */
export function RestCard() {
  const { user, loading } = useAuth()
  const { applyWallet } = useWallet()
  const router = useRouter()

  const [squares, setSquares] = useState<Square[]>([])
  const [fetching, setFetching] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const prevLines = useRef(0)

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/signin?redirect=/rest-card'); return }
    authedFetch('/api/rest-card')
      .then(r => r.json())
      .then(data => {
        const sqs: Square[] = data?.card?.squares ?? []
        setSquares(sqs)
        const done = new Set(sqs.filter(s => s.status === 'done').map(s => s.position))
        prevLines.current = completedLines(done).length
      })
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [user, loading, router])

  const doneCount = squares.filter(s => s.status === 'done').length

  async function toggle(sq: Square) {
    if (saving) return
    const nextStatus: 'open' | 'done' = sq.status === 'done' ? 'open' : 'done'
    setSaving(sq.id)
    setSquares(prev => prev.map(s => s.id === sq.id ? { ...s, status: nextStatus } : s)) // optimistic
    try {
      const res = await authedFetch('/api/rest-card/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ squareId: sq.id }),
      })
      const data = await res.json().catch(() => null)
      if (data?.wallet) applyWallet(data.wallet)
      if (typeof data?.completedLineCount === 'number') {
        if (data.completedLineCount > prevLines.current) {
          setCelebrate(true)
          setTimeout(() => setCelebrate(false), 2600)
        }
        prevLines.current = data.completedLineCount
      }
    } catch {
      // revert optimistic change on failure
      setSquares(prev => prev.map(s => s.id === sq.id ? { ...s, status: sq.status } : s))
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
          Small things, whenever you get to them. Tap one you’ve done — tap again to undo.
        </p>
      </div>

      <div className="px-5 mt-2">
        <Reserve />
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
                    onClick={() => toggle(sq)}
                    disabled={saving === sq.id}
                    aria-pressed={done}
                    className={`aspect-square rounded-xl border p-2 flex flex-col justify-between text-left transition-colors ${
                      done
                        ? 'bg-gradient-to-br from-mustard to-mustard/80 border-transparent'
                        : 'bg-white border-beige/50 hover:border-mustard/40'
                    }`}
                  >
                    <span className={`font-sans text-[10.5px] leading-tight ${done ? 'text-white' : 'text-chocolate/70'}`}>
                      {sq.label}
                    </span>
                    {/* Check-off affordance: empty circle → filled check */}
                    <span
                      className={`self-end w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                        done ? 'bg-white/25' : 'border border-chocolate/20'
                      }`}
                    >
                      {done && <Check className="w-3 h-3 text-white" />}
                    </span>
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
