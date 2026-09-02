'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Share2, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { authedFetch } from '@/lib/api-client'

interface Note {
  id: string
  status?: string
  from_name: string
  body: string
  created_at: string
  seen_at: string | null
}

/**
 * The message she forwards.
 *
 * Defined once and both shown to her and put on the clipboard — she should never
 * be asked to send her mother words she hasn't read. Written to be sent as-is,
 * because most people won't edit it, and to answer the two questions a recipient
 * has immediately: do I need an account, and how long will this take.
 */
const SHARE_MESSAGE =
  'I’ve been using an app called Kindrest — it checks in with me every day. ' +
  'It has a thing called Love Notes where the people in your corner can leave ' +
  'you a message. No sign-up, takes a second. Leave me one if you feel like it.'

function ago(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * /village — her side: the link to share, and everything she's been left.
 *
 * The two controls that matter are delete and rotate. Anyone holding the link
 * can write to her, so she must always be able to remove a note and change the
 * locks, without asking anyone.
 */
export default function VillagePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [code, setCode] = useState<string | null>(null)
  const [active, setActive] = useState(true)
  const [notes, setNotes] = useState<Note[]>([])
  const [pending, setPending] = useState<Note[]>([])
  const [needsMigration, setNeedsMigration] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'manual'>('idle')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await authedFetch('/api/village')
    const d = await res.json()
    if (d?.needsMigration) { setNeedsMigration(true); return }
    setCode(d?.code ?? null)
    setActive(d?.active ?? true)
    setNotes(d?.notes ?? [])
    setPending(d?.pending ?? [])
    // She's looking at them now, so home stops surfacing them as new.
    if ((d?.unseen ?? 0) > 0) authedFetch('/api/village', { method: 'PATCH' }).catch(() => {})
  }, [])

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/signin?redirect=/village'); return }
    load().catch(() => {}).finally(() => setFetching(false))
  }, [user, loading, router, load])

  const link = code ? `${typeof window !== 'undefined' ? window.location.origin : ''}/for/${code}` : ''

  async function share() {
    if (!link) return
    // Phones and Safari/Edge open the native share sheet, which previews the
    // message itself. Chrome on a Mac and Firefox have no share sheet, so those
    // fall through to the clipboard — where she needs telling what to do next.
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Leave me a Love Note', text: SHARE_MESSAGE, url: link })
        return
      } catch { /* she backed out of the sheet, or it failed — fall through */ }
    }
    try {
      await navigator.clipboard.writeText(`${SHARE_MESSAGE}\n\n${link}`)
      setShareState('copied')
      setTimeout(() => setShareState('idle'), 4000)
    } catch {
      // Clipboard access can be refused — an old browser, a locked-down device,
      // a window that isn't focused. Silently doing nothing would read as a
      // broken button, so point her at the message, which is on screen anyway.
      setShareState('manual')
      setTimeout(() => setShareState('idle'), 6000)
    }
  }

  async function act(action: 'rotate' | 'close' | 'open') {
    if (busy) return
    if (action === 'rotate' && !confirm('Make a new link? The old one stops working straight away. Your notes are kept.')) return
    setBusy(true)
    try {
      await authedFetch('/api/village', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      await load()
    } finally { setBusy(false) }
  }

  /** First note from a new name — she decides whether that person gets through. */
  async function decide(id: string, action: 'allow' | 'block') {
    setPending(prev => prev.filter(n => n.id !== id))
    await authedFetch('/api/village', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, noteId: id }),
    }).catch(() => {})
    await load().catch(() => {})
  }

  async function remove(id: string) {
    setNotes(prev => prev.filter(n => n.id !== id))    // gone from her screen at once
    await authedFetch('/api/village', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => load())
  }

  if (loading || !user) return <div className="min-h-screen bg-cream" />

  return (
    <div className="min-h-screen bg-cream pb-28">
      <div className="px-5 pt-12">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 font-sans text-[13.5px] text-chocolate/50 hover:text-chocolate transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Home
        </button>

        <h1 className="font-serif text-[28px] text-chocolate">Love Notes</h1>
        <p className="font-sans text-[14px] text-chocolate/50 mt-1 mb-7">
          A note from someone who loves you, waiting on your home screen. Send them
          the link below — they don’t need an account, and they’ll never see your
          check-ins, your journal, or anything you write.
        </p>

        {needsMigration ? (
          <div className="bg-white rounded-2xl border border-mustard/40 px-5 py-4">
            <p className="font-display font-semibold text-[14px] text-chocolate">One-time setup needed</p>
            <p className="font-sans text-[13px] text-chocolate/60 leading-relaxed mt-1">
              Run <span className="font-mono text-[12px]">supabase/village.sql</span> in the Supabase SQL editor.
            </p>
          </div>
        ) : fetching ? (
          <p className="font-sans text-[13px] text-chocolate/30 py-8">Loading…</p>
        ) : (
          <>
            {/* ── The link ─────────────────────────────────────────────── */}
            <div className="bg-white rounded-[22px] px-5 py-5 flex flex-col gap-3.5">
              {active ? (
                <>
                  {/* What she's about to send, in full. Nobody should forward
                      words to their own mother sight unseen. */}
                  <div className="bg-cream/70 rounded-[14px] px-4 py-3.5 flex flex-col gap-2">
                    <p className="font-display font-semibold text-[10.5px] tracking-[0.13em] uppercase text-chocolate/35">
                      What they’ll get
                    </p>
                    <p className="font-sans text-[13.5px] leading-[1.6] text-chocolate/75">
                      {SHARE_MESSAGE}
                    </p>
                    <p className="font-mono text-[12px] text-chocolate/50 break-all">{link}</p>
                  </div>
                  <p className="font-sans text-[12px] text-chocolate/40 -mt-1">
                    You can change any of it before you send.
                  </p>

                  <button
                    onClick={share}
                    className="w-full flex items-center justify-center gap-2 bg-mustard text-white font-display font-semibold text-[14.5px] py-3.5 rounded-[13px]"
                  >
                    {shareState === 'copied'
                      ? <><Check className="w-4 h-4" />Copied — paste it into a text</>
                      : shareState === 'manual'
                        ? <>Copy the message above</>
                        : <><Share2 className="w-4 h-4" />Share your link</>}
                  </button>
                  {shareState === 'manual' && (
                    <p className="font-sans text-[12.5px] text-chocolate/55 leading-relaxed -mt-1">
                      Your browser wouldn’t let us copy it for you — select the message
                      above and copy it yourself, then paste it into a text.
                    </p>
                  )}
                </>
              ) : (
                <p className="font-sans text-[14px] text-chocolate/60 leading-relaxed">
                  Your link is closed. Nobody can leave you a note until you open it again.
                </p>
              )}

              <div className="flex items-center gap-4 pt-1">
                <button
                  onClick={() => act(active ? 'close' : 'open')}
                  disabled={busy}
                  className="font-sans text-[12.5px] text-chocolate/45 hover:text-chocolate transition-colors disabled:opacity-40"
                >
                  {active ? 'Close my link' : 'Open my link'}
                </button>
                <button
                  onClick={() => act('rotate')}
                  disabled={busy}
                  className="font-sans text-[12.5px] text-chocolate/45 hover:text-chocolate transition-colors disabled:opacity-40"
                >
                  Make a new link
                </button>
              </div>
            </div>

            {/* ── Waiting for her ──────────────────────────────────────── */}
            {pending.length > 0 && (
              <div className="mt-8 flex flex-col gap-3">
                <p className="font-display font-semibold text-[11.5px] tracking-[0.14em] uppercase text-mustard">
                  {pending.length} waiting
                </p>
                <p className="font-sans text-[13px] text-chocolate/50 leading-relaxed -mt-1">
                  First note from someone new. Allow them and anything they send after
                  this goes straight to your home screen.
                </p>
                {pending.map(n => (
                  <div key={n.id} className="bg-white rounded-[20px] px-5 py-4 border border-mustard/30 flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <p className="font-display font-semibold text-[12.5px] text-mustard">
                        {n.from_name}
                      </p>
                      <p className="font-serif italic text-[17px] leading-[1.45] text-chocolate">
                        “{n.body}”
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => decide(n.id, 'allow')}
                        className="flex-1 bg-mustard text-white font-display font-semibold text-[13.5px] py-2.5 rounded-[11px]"
                      >
                        Keep it
                      </button>
                      <button
                        onClick={() => decide(n.id, 'block')}
                        className="flex-1 bg-cream border border-beige/60 text-chocolate/70 font-display font-semibold text-[13.5px] py-2.5 rounded-[11px]"
                      >
                        Block {n.from_name}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── What they've left her ────────────────────────────────── */}
            <div className="mt-8 flex flex-col gap-3">
              {notes.length === 0 ? (
                <div className="bg-white/60 rounded-[22px] px-5 py-8 text-center">
                  <p className="font-serif text-[18px] text-chocolate/70">No notes yet.</p>
                  <p className="font-sans text-[13px] text-chocolate/45 mt-1.5 leading-relaxed">
                    They usually come once you’ve sent the link to a few people.
                  </p>
                </div>
              ) : (
                <>
                  <p className="font-display font-semibold text-[11.5px] tracking-[0.14em] uppercase text-chocolate/35">
                    {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                  </p>
                  {notes.map(n => (
                    <div key={n.id} className="bg-white rounded-[20px] px-5 py-4 flex flex-col gap-2">
                      <p className="font-serif italic text-[17px] leading-[1.45] text-chocolate">
                        “{n.body}”
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-sans text-[12.5px] text-chocolate/50">
                          {n.from_name} · {ago(n.created_at)}
                        </p>
                        <button
                          onClick={() => remove(n.id)}
                          aria-label={`Remove the note from ${n.from_name}`}
                          className="text-chocolate/25 hover:text-clay transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
