'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Home } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { authedFetch } from '@/lib/api-client'
import { completedLines } from '@/lib/restcard'

interface Square {
  id: string
  position: number
  label: string
  source: string          // 'free' | 'self'
  status: 'open' | 'done'
}

// Hearts drift up behind the message — staggered so it feels breathed, not fired.
const HEARTS = [
  { left: '12%', delay: 0,   tilt: '-12deg', size: 15 },
  { left: '28%', delay: 260, tilt: '8deg',   size: 11 },
  { left: '47%', delay: 90,  tilt: '-4deg',  size: 18 },
  { left: '66%', delay: 380, tilt: '14deg',  size: 12 },
  { left: '84%', delay: 170, tilt: '-9deg',  size: 15 },
]

const LINE_MESSAGES = [
  'A whole line — that’s care, all the way across.',
  'That’s a whole line of you, still in there.',
  'A full line. You showed up for all of it.',
]

function kindOf(source: string): 'free' | 'self' {
  return source === 'free' ? 'free' : 'self'
}

/**
 * The Rest Card — a 3×3 record of what already happened. The centre is free; the
 * other eight are drawn from the recommendations database, spread across
 * regulation types and written in past tense. Tap to mark, tap again to undo.
 * Nothing is earned and nothing is a task — she never has to work for her rest.
 */
export function RestCard() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [squares, setSquares] = useState<Square[]>([])
  const [fetching, setFetching] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [celebrate, setCelebrate] = useState<string | null>(null)
  const [bingo, setBingo] = useState<{ marked: number } | null>(null)
  const [dealing, setDealing] = useState(false)
  const prevLines = useRef(0)

  const loadCard = useCallback(async () => {
    const res = await authedFetch('/api/rest-card')
    const data = await res.json()
    const sqs: Square[] = data?.card?.squares ?? []
    setSquares(sqs)
    const done = new Set(sqs.filter(s => s.status === 'done').map(s => s.position))
    prevLines.current = completedLines(done).length
  }, [])

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/signin?redirect=/rest-card'); return }
    loadCard().catch(() => {}).finally(() => setFetching(false))
  }, [user, loading, router, loadCard])

  /** She asked for the next card. Deal it in place — no reload, no lost scroll. */
  async function dealFreshCard() {
    setDealing(true)
    try {
      await loadCard()
      setBingo(null)
    } catch {
      /* leave the celebration up rather than dumping her on an empty screen */
    } finally {
      setDealing(false)
    }
  }

  function maybeCelebrate(count: number | undefined) {
    if (typeof count !== 'number') return
    if (count > prevLines.current) {
      setCelebrate(LINE_MESSAGES[Math.floor(Math.random() * LINE_MESSAGES.length)])
      setTimeout(() => setCelebrate(null), 2600)
    }
    prevLines.current = count
  }

  function onTap(sq: Square) {
    if (kindOf(sq.source) === 'free') return   // already true, not hers to undo
    toggle(sq)
  }

  async function toggle(sq: Square) {
    if (saving) return
    const nextStatus: 'open' | 'done' = sq.status === 'done' ? 'open' : 'done'
    setSaving(sq.id)
    setSquares(prev => prev.map(s => s.id === sq.id ? { ...s, status: nextStatus } : s))
    try {
      const res = await authedFetch('/api/rest-card/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ squareId: sq.id }),
      })
      const data = await res.json().catch(() => null)
      if (data?.bingo) {
        setCelebrate(null)
        setBingo({ marked: typeof data.marked === 'number' ? data.marked : 0 })
        prevLines.current = data.completedLineCount ?? 1
      } else {
        maybeCelebrate(data?.completedLineCount)
      }
    } catch {
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
        <h1 className="font-serif text-[28px] text-chocolate">Rest Card</h1>
        <p className="font-sans text-[14px] text-chocolate/50 mt-1">
          Some of these might already be true. Tap anything that’s true — leave the rest.
        </p>
      </div>

      {/* ── Bingo ──────────────────────────────────────────────────────────
          A full moment, not a toast. She completed a line, so this card is
          finished and a new one is waiting. The praise is for showing up —
          never for a score, and never a nudge about tomorrow. */}
      {bingo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-chocolate/45 backdrop-blur-[2px]">
          <div className="relative w-full max-w-[380px]">
            <div
              aria-hidden
              className="line-bloom pointer-events-none absolute -inset-10 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(201,152,31,.5), transparent 68%)' }}
            />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-8 h-0 z-20">
              {HEARTS.map((h, i) => (
                <span
                  key={i}
                  className="line-heart absolute text-mustard leading-none"
                  style={{
                    left: h.left,
                    fontSize: h.size * 1.5,
                    animationDelay: `${h.delay}ms`,
                    ['--tilt' as string]: h.tilt,
                  }}
                >
                  ♡
                </span>
              ))}
            </div>

            <div
              role="dialog"
              aria-modal="true"
              aria-label="You completed a line"
              className="relative bg-cream rounded-[26px] px-7 py-8 text-center shadow-[0_20px_60px_-20px_rgba(48,33,26,.55)]"
            >
              <p className="font-display font-semibold text-[12px] tracking-[0.18em] uppercase text-mustard mb-3">
                Bingo
              </p>
              <h2 className="font-serif text-[27px] leading-[1.22] text-chocolate mb-3.5">
                You showed up for yourself.
              </h2>
              <p className="font-sans text-[14.5px] leading-[1.65] text-chocolate/65 mb-1.5">
                {bingo.marked > 0
                  ? <>That’s {bingo.marked} {bingo.marked === 1 ? 'thing' : 'things'} you gave yourself, in a season where that’s genuinely hard. A whole line of it.</>
                  : <>A whole line — care, all the way across.</>}
              </p>
              <p className="font-sans text-[14.5px] leading-[1.65] text-chocolate/65 mb-7">
                There’s a fresh card ready when you want it. No rush, and nothing lost if you don’t.
              </p>

              <button
                onClick={dealFreshCard}
                disabled={dealing}
                className="w-full bg-mustard text-white font-display font-semibold text-[15px] py-4 rounded-[15px] disabled:opacity-50 transition-opacity"
              >
                {dealing ? 'Laying it out…' : 'Start a fresh card'}
              </button>
              <button
                onClick={() => router.push('/')}
                className="font-sans text-[13.5px] text-chocolate/45 hover:text-chocolate transition-colors mt-4"
              >
                That’s enough for now
              </button>
            </div>
          </div>
        </div>
      )}

      {celebrate && (
        <div className="px-5 mt-3">
          <div className="relative">
            {/* a warm bloom behind the message */}
            <div
              aria-hidden
              className="line-bloom pointer-events-none absolute -inset-6 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(201,152,31,.45), transparent 68%)' }}
            />
            {/* hearts drifting up */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-1 h-0 z-20">
              {HEARTS.map((h, i) => (
                <span
                  key={i}
                  className="line-heart absolute text-mustard leading-none"
                  style={{
                    left: h.left,
                    fontSize: h.size,
                    animationDelay: `${h.delay}ms`,
                    ['--tilt' as string]: h.tilt,
                  }}
                >
                  ♡
                </span>
              ))}
            </div>

            <div className="relative bg-chocolate text-cream rounded-2xl px-5 py-3.5 text-center">
              <span className="font-serif text-[17px]">{celebrate}</span>
            </div>
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
            <div className="grid grid-cols-3 gap-2.5">
              {squares.map(sq => {
                const kind = kindOf(sq.source)
                const done = sq.status === 'done'

                // The free centre — already true, softly marked, not tappable.
                if (kind === 'free') {
                  return (
                    <div
                      key={sq.id}
                      className="aspect-square rounded-2xl border border-mustard/30 bg-mustard/20 p-2.5 flex flex-col items-center justify-center gap-1"
                    >
                      <span className="text-mustard text-[15px] leading-none">♡</span>
                      <span className="font-serif text-[13px] text-chocolate/80 leading-tight text-center">{sq.label}</span>
                    </div>
                  )
                }

                // Every other cell reads and behaves the same: tap to mark, tap to undo.
                const cls = done
                  ? 'bg-gradient-to-br from-mustard to-mustard/80 border-transparent'
                  : 'bg-white border-beige/50 hover:border-mustard/40'

                return (
                  <button
                    key={sq.id}
                    onClick={() => onTap(sq)}
                    disabled={saving === sq.id}
                    aria-pressed={done}
                    className={`aspect-square rounded-2xl border p-2.5 flex flex-col justify-between text-left transition-colors ${cls}`}
                  >
                    <span className={`font-sans text-[11.5px] leading-tight ${done ? 'text-white' : 'text-chocolate/70'}`}>{sq.label}</span>
                    <span
                      className={`self-end w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0 ${
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
              No rush. It’s just here — nothing to finish, nothing to earn.
            </p>

            <button
              onClick={() => router.push('/')}
              className="w-full mt-5 flex items-center justify-center gap-2 bg-chocolate text-cream font-display font-semibold text-[15px] py-4 rounded-[15px]"
            >
              <Home className="w-4 h-4 text-mustard" />
              That’s enough for now
            </button>
          </>
        )}
      </div>

    </div>
  )
}
