'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Plus, Home } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { authedFetch } from '@/lib/api-client'
import { useWallet } from '@/lib/wallet-context'
import { Reserve } from '@/components/glimmer/Reserve'
import { completedLines } from '@/lib/restcard'

interface Square {
  id: string
  position: number
  label: string
  source: string          // 'user' | 'app_<link>' | 'self'
  status: 'open' | 'done'
}

const LINE_MESSAGES = [
  'A whole line — that’s care, all the way across.',
  'That’s a whole line of you, still in there.',
  'A full line. You showed up for all of it.',
]

function kindOf(source: string): 'user' | 'app' | 'self' {
  if (source === 'user') return 'user'
  if (source.startsWith('app_')) return 'app'
  return 'self'
}

/**
 * The Rest Card — a record of what already happened. The four centre cells are
 * hers to write. Three cells mark themselves from what she did elsewhere in the
 * app. The rest she marks herself; tap to mark, tap again to undo (with gem
 * refund, so the reserve stays true). Nothing here is a task or a countdown.
 */
export function RestCard() {
  const { user, loading } = useAuth()
  const { applyWallet } = useWallet()
  const router = useRouter()

  const [squares, setSquares] = useState<Square[]>([])
  const [fetching, setFetching] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [celebrate, setCelebrate] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [savingLabel, setSavingLabel] = useState(false)
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

  function maybeCelebrate(count: number | undefined) {
    if (typeof count !== 'number') return
    if (count > prevLines.current) {
      setCelebrate(LINE_MESSAGES[Math.floor(Math.random() * LINE_MESSAGES.length)])
      setTimeout(() => setCelebrate(null), 2600)
    }
    prevLines.current = count
  }

  function onTap(sq: Square) {
    // Only a blank centre cell opens the composer; everything else toggles.
    if (kindOf(sq.source) === 'user' && !sq.label.trim()) { setEditingId(sq.id); setEditText(''); return }
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
      if (data?.wallet) applyWallet(data.wallet)
      maybeCelebrate(data?.completedLineCount)
    } catch {
      setSquares(prev => prev.map(s => s.id === sq.id ? { ...s, status: sq.status } : s))
    } finally {
      setSaving(null)
    }
  }

  async function saveLabel() {
    const id = editingId
    const text = editText.trim()
    if (!id || !text) return
    setSavingLabel(true)
    setSquares(prev => prev.map(s => s.id === id ? { ...s, label: text, status: 'done' } : s))
    try {
      const res = await authedFetch('/api/rest-card/square-label', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ squareId: id, label: text }),
      })
      const data = await res.json().catch(() => null)
      if (data?.wallet) applyWallet(data.wallet)
      maybeCelebrate(data?.completedLineCount)
    } catch {
      setSquares(prev => prev.map(s => s.id === id ? { ...s, label: '', status: 'open' } : s))
    } finally {
      setSavingLabel(false)
      setEditingId(null)
      setEditText('')
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

      <div className="px-5 mt-2">
        <Reserve />
      </div>

      {celebrate && (
        <div className="px-5 mt-3">
          <div className="bg-chocolate text-cream rounded-2xl px-5 py-3 text-center">
            <span className="font-serif text-[17px]">{celebrate}</span>
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
                const blankUser = kindOf(sq.source) === 'user' && !sq.label.trim()

                // Blank centre cell → the "write your own" invitation.
                if (blankUser) {
                  return (
                    <button
                      key={sq.id}
                      onClick={() => onTap(sq)}
                      className="aspect-square rounded-xl border border-dashed border-mustard/40 bg-mustard/5 p-2 flex flex-col items-center justify-center gap-1 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-mustard" />
                      <span className="font-sans text-[10px] text-mustard/90 leading-tight text-center">Write your own</span>
                    </button>
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
                    className={`aspect-square rounded-xl border p-2 flex flex-col justify-between text-left transition-colors ${cls}`}
                  >
                    <span className={`font-sans text-[10.5px] leading-tight ${done ? 'text-white' : 'text-chocolate/70'}`}>{sq.label}</span>
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
              No rush. It’s just here — each thing that’s true fills your reserve a little.
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

      {/* Inline composer for a centre square */}
      {editingId && (
        <div
          className="fixed inset-0 z-50 bg-chocolate/40 flex items-end sm:items-center justify-center p-4"
          onClick={() => { if (!savingLabel) { setEditingId(null); setEditText('') } }}
        >
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <p className="font-serif text-[19px] text-chocolate">Write your own</p>
            <p className="font-sans text-[12.5px] text-chocolate/50 mt-1 mb-3">
              Something small that was true for you today. In your words.
            </p>
            <input
              value={editText}
              onChange={e => setEditText(e.target.value)}
              autoFocus
              maxLength={120}
              placeholder="You…"
              className="w-full bg-cream rounded-[12px] border border-beige/50 px-4 py-3 text-base text-chocolate placeholder:text-chocolate/30 outline-none focus:border-mustard/60 font-sans"
              onKeyDown={e => { if (e.key === 'Enter' && editText.trim()) saveLabel() }}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { setEditingId(null); setEditText('') }}
                disabled={savingLabel}
                className="flex-1 py-3 rounded-[12px] font-display font-semibold text-[14px] text-chocolate/60 bg-cream border border-beige/50"
              >
                Cancel
              </button>
              <button
                onClick={saveLabel}
                disabled={!editText.trim() || savingLabel}
                className="flex-1 py-3 rounded-[12px] font-display font-semibold text-[14px] text-white bg-mustard disabled:opacity-40"
              >
                {savingLabel ? 'Saving…' : 'Add it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
