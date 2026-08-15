'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { NOTE_MAX, NAME_MAX } from '@/lib/village'

/**
 * /for/[code] — where her village writes to her.
 *
 * Built for someone who has never heard of Kindrest and is probably on a phone
 * in a supermarket queue: two fields, no account, no explanation of what the
 * app is. The only thing this page needs to convey is that a real person will
 * read what they write.
 */
export default function VillageNotePage() {
  const params = useParams()
  const code = String(params?.code ?? '').toUpperCase()

  const [name, setName] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [checked, setChecked] = useState(false)

  const [from, setFrom] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!code) return
    fetch(`/api/village/note?code=${encodeURIComponent(code)}`)
      .then(r => r.json())
      .then(d => { setName(d?.name ?? null); setOpen(Boolean(d?.open)) })
      .catch(() => {})
      .finally(() => setChecked(true))
  }, [code])

  async function send() {
    if (sending || !from.trim() || !body.trim()) return
    setSending(true); setError('')
    try {
      const res = await fetch('/api/village/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, from, body }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d?.error ?? 'That didn’t send.'); return }
      setSent(true)
    } catch {
      setError('That didn’t send. Try once more?')
    } finally {
      setSending(false)
    }
  }

  if (!checked) return <div className="min-h-screen bg-cream" />

  // Unknown or closed link — same page either way, so a wrong code reveals nothing.
  if (!open) {
    return (
      <div className="min-h-screen bg-cream flex flex-col justify-center px-6 py-16">
        <div className="w-full max-w-md mx-auto text-center">
          <h1 className="font-serif text-[26px] text-chocolate leading-snug mb-3">
            This link isn’t open right now.
          </h1>
          <p className="font-sans text-[14.5px] text-chocolate/55 leading-relaxed">
            Ask whoever sent it to you for a new one.
          </p>
        </div>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-cream flex flex-col justify-center px-6 py-16">
        <div className="w-full max-w-md mx-auto text-center flex flex-col gap-3">
          <span className="text-mustard text-[28px] leading-none">♡</span>
          <h1 className="font-serif text-[27px] text-chocolate leading-snug">
            She’ll see it.
          </h1>
          <p className="font-sans text-[14.5px] text-chocolate/55 leading-relaxed">
            It’ll be waiting on her home screen the next time she opens Kindrest.
          </p>
          <button
            onClick={() => { setSent(false); setBody(''); }}
            className="font-sans text-[13.5px] text-chocolate/45 underline mt-2"
          >
            Leave another
          </button>
        </div>
      </div>
    )
  }

  const canSend = from.trim().length > 0 && body.trim().length > 0 && !sending

  return (
    <div className="min-h-screen bg-cream flex flex-col justify-center px-6 py-16">
      <div className="w-full max-w-md mx-auto flex flex-col gap-6">

        <div className="flex flex-col gap-2.5">
          <p className="font-display font-semibold text-[12px] tracking-[0.16em] uppercase text-mustard">
            For {name}
          </p>
          <h1 className="font-serif text-[30px] leading-[1.2] text-chocolate">
            Leave {name} a note.
          </h1>
          <p className="font-sans text-[15px] leading-[1.6] text-chocolate/60">
            {name} uses <span className="text-chocolate/85 font-semibold">Kindrest</span>, an app
            for mothers. It asks her one small question a day, then gives her something she can
            actually do with the time she has — five minutes, on a hard day. No streaks, nothing
            to catch up on.
          </p>
          <p className="font-sans text-[15px] leading-[1.6] text-chocolate/60">
            This is the part it can’t do on its own: the people who love her, saying so.
          </p>
        </div>

        <div className="bg-white rounded-[22px] px-5 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="from" className="font-sans text-[12.5px] text-chocolate/50">
              Your name
            </label>
            <input
              id="from"
              value={from}
              onChange={e => setFrom(e.target.value)}
              maxLength={NAME_MAX}
              placeholder="Auntie Rose"
              className="w-full bg-cream border border-beige/50 rounded-[12px] px-4 py-3 text-base text-chocolate placeholder:text-chocolate/30 outline-none focus:border-mustard font-sans"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="note" className="font-sans text-[12.5px] text-chocolate/50">
              What do you want her to know?
            </label>
            <textarea
              id="note"
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={NOTE_MAX}
              rows={4}
              placeholder="You're doing better than you think."
              className="w-full bg-cream border border-beige/50 rounded-[12px] px-4 py-3 text-base text-chocolate placeholder:text-chocolate/30 outline-none focus:border-mustard font-sans resize-none leading-relaxed"
            />
            <p className="font-sans text-[11.5px] text-chocolate/35 self-end tabular-nums">
              {body.length}/{NOTE_MAX}
            </p>
          </div>

          {error && <p className="font-sans text-[13px] text-chocolate/70">{error}</p>}

          <button
            onClick={send}
            disabled={!canSend}
            className="w-full bg-mustard text-white font-display font-semibold text-[15px] py-3.5 rounded-[13px] disabled:opacity-40 transition-opacity"
          >
            {sending ? 'Sending…' : 'Send it'}
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          <p className="font-sans text-[12.5px] text-chocolate/40 text-center leading-relaxed">
            Only {name} sees this. You won’t see anything she’s written, and you don’t
            need an account.
          </p>
          <p className="font-sans text-[12.5px] text-chocolate/40 text-center leading-relaxed">
            Carrying something similar?{' '}
            <a href="/" className="text-mustard font-semibold underline underline-offset-2">
              Kindrest is free
            </a>
            .
          </p>
        </div>

      </div>
    </div>
  )
}
