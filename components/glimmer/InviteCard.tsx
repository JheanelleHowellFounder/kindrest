'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, Share2 } from 'lucide-react'
import { authedFetch } from '@/lib/api-client'
import { trackEvent } from '@/lib/analytics'

/**
 * One tap to hand this to someone else.
 *
 * On a phone this opens the native share sheet, which is the whole point — she
 * picks the person and the app she'd actually use. Desktop and anything without
 * the API falls back to copying the link.
 *
 * The message is written to be forwarded as-is, because most people won't edit
 * it. It says what Kindrest does and makes clear it isn't a referral scheme —
 * there's no reward, and nobody sees what she writes.
 */
export function InviteCard() {
  const [code, setCode] = useState<string | null>(null)
  const [joined, setJoined] = useState(0)
  const [state, setState] = useState<'idle' | 'copied' | 'shared'>('idle')
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    authedFetch('/api/invite')
      .then(r => r.json())
      .then(d => {
        if (d?.needsMigration || d?.error) { setUnavailable(true); return }
        setCode(d?.code ?? null)
        setJoined(d?.joined ?? 0)
      })
      .catch(() => setUnavailable(true))
  }, [])

  const share = useCallback(async () => {
    if (!code) return
    const url = `${window.location.origin}/i/${code}`
    const text =
      'I’ve been using this — it asks you one small question a day and gives you ' +
      'something you can actually do with the time you have. No streaks, and nobody ' +
      'sees what you write. Thought of you.'

    trackEvent('invite_sent')

    // Native share sheet where it exists — she picks the person and the app.
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Kindrest', text, url })
        setState('shared')
        setTimeout(() => setState('idle'), 2400)
        return
      } catch {
        // She backed out of the sheet, or it failed — fall through to copying.
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n\n${url}`)
      setState('copied')
      setTimeout(() => setState('idle'), 2400)
    } catch {
      setUnavailable(true)
    }
  }, [code])

  if (unavailable || !code) return null

  return (
    <div className="bg-white rounded-[22px] px-5 py-[18px] flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="font-display font-semibold text-[14px] text-chocolate">
          Know someone in it right now?
        </p>
        <p className="font-sans text-[13px] leading-[1.5] text-chocolate/55">
          {joined > 0
            ? `${joined} ${joined === 1 ? 'person has' : 'people have'} joined through you.`
            : 'Send her the question. She can keep whatever she writes to herself.'}
        </p>
      </div>

      <button
        onClick={share}
        className="w-full flex items-center justify-center gap-2 bg-mustard/10 text-mustard font-display font-semibold text-[14px] py-3 rounded-[12px] transition-colors hover:bg-mustard/[0.16]"
      >
        {state === 'idle' ? (
          <><Share2 className="w-4 h-4" />Invite a friend</>
        ) : (
          <><Check className="w-4 h-4" />{state === 'shared' ? 'Sent' : 'Link copied'}</>
        )}
      </button>
    </div>
  )
}
