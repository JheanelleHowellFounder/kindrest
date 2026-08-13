'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'

const REF_KEY = 'kindrest_ref'

/**
 * /i/[code] — the door a friend walks through.
 *
 * Deliberately quieter than the landing page. Someone she trusts already made
 * the pitch; this only needs to confirm she's in the right place and get out of
 * the way. An unknown code still gets a warm welcome, never an error.
 */
export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const code = String(params?.code ?? '').toUpperCase()

  const [from, setFrom] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!code) return
    // Remember it even if she signs up days later.
    try { localStorage.setItem(REF_KEY, code) } catch {}
    trackEvent('invite_opened')

    fetch(`/api/invite/who?code=${encodeURIComponent(code)}`)
      .then(r => r.json())
      .then(d => setFrom(d?.name ?? null))
      .catch(() => {})
      .finally(() => setChecked(true))
  }, [code])

  if (!checked) return <div className="min-h-screen bg-cream" />

  return (
    <div className="min-h-screen bg-cream flex flex-col justify-center px-6 py-16">
      <div className="w-full max-w-md mx-auto flex flex-col gap-7">

        <div className="flex flex-col gap-3">
          <p className="font-display font-semibold text-[12px] tracking-[0.16em] uppercase text-mustard">
            {from ? `${from} sent you this` : 'Someone sent you this'}
          </p>
          <h1 className="font-serif text-[30px] leading-[1.22] text-chocolate">
            {from ? `${from} thought this might help.` : 'Someone thought this might help.'}
          </h1>
          <p className="font-sans text-[15.5px] leading-[1.6] text-chocolate/65">
            Kindrest asks you one small question a day, then gives you something
            you can actually do with the time you have. Most days it takes a minute.
          </p>
        </div>

        <div className="bg-white rounded-[22px] px-5 py-5 flex flex-col gap-2.5">
          <p className="font-serif italic text-[18px] leading-[1.45] text-chocolate">
            “Nothing here scores you, and nothing has to be finished.”
          </p>
          <p className="font-sans text-[13px] text-chocolate/50 leading-[1.55]">
            No streaks. No catching up. Whatever you write stays yours —
            {from ? ` ${from} can’t see any of it.` : ' the person who invited you can’t see any of it.'}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push('/onboarding')}
            className="w-full bg-mustard text-white font-display font-semibold text-[15px] py-4 rounded-[14px]"
          >
            Start with today’s question
          </button>
          <button
            onClick={() => router.push('/signin')}
            className="font-sans text-[13.5px] text-chocolate/50 py-1"
          >
            I already have an account
          </button>
        </div>

      </div>
    </div>
  )
}
