'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

const ORG_KEY = 'kindrest_org'

/**
 * /join/[slug] — the door a pilot cohort walks through.
 *
 * Greets them by their organization's name, stores the slug so onboarding can
 * link them to that org, then hands off to the normal signup. Anyone arriving
 * with an unknown slug just gets the ordinary welcome — never an error.
 */
export default function JoinPage() {
  const router = useRouter()
  const params = useParams()
  const slug = String(params?.slug ?? '')

  const [orgName, setOrgName] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!slug) return
    // Remember which cohort she came from, even if she signs up later.
    try { localStorage.setItem(ORG_KEY, slug) } catch {}

    fetch(`/api/org/join?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(d => setOrgName(d?.org?.name ?? null))
      .catch(() => {})
      .finally(() => setChecked(true))
  }, [slug])

  if (!checked) return <div className="min-h-screen bg-cream" />

  return (
    <div className="min-h-screen bg-cream flex flex-col justify-center px-6 py-16">
      <div className="w-full max-w-md mx-auto">

        <div className="mb-10">
          <span className="font-serif text-[26px] text-chocolate">Kind</span>
          <span className="font-serif text-[26px] text-mustard">rest</span>
          {orgName && (
            <>
              <span className="font-serif text-[26px] text-chocolate/25 mx-2.5">×</span>
              <span className="font-serif text-[26px] text-chocolate">{orgName}</span>
            </>
          )}
        </div>

        <h1 className="font-serif text-[34px] leading-[1.15] text-chocolate mb-5">
          {orgName
            ? <>Your team set this aside for you.</>
            : <>Something set aside for you.</>}
        </h1>

        <p className="font-sans text-[15.5px] text-chocolate/60 leading-[1.7] mb-4">
          Kindrest is a daily companion for mothers — for the years after the leave
          policy stops applying, when the weight is heaviest and the least visible.
        </p>

        <p className="font-sans text-[15.5px] text-chocolate/60 leading-[1.7] mb-10">
          It asks for about fifteen seconds a day. On the days you have nothing, it
          asks for less than that.
        </p>

        <button
          onClick={() => router.push('/onboarding')}
          className="w-full bg-mustard text-white font-display font-semibold text-[15px] py-4 rounded-[15px] hover:opacity-90 transition-opacity"
        >
          Start with one question
        </button>

        <p className="font-sans text-[13px] text-chocolate/45 text-center mt-5 leading-relaxed">
          {orgName ? `${orgName} never sees your check-ins, your journal, or anything you write.` : 'What you write stays yours.'}
        </p>

        <p className="font-sans text-[13px] text-chocolate/40 text-center mt-8">
          Already have an account?{' '}
          <button onClick={() => router.push('/signin')} className="text-mustard font-semibold underline">
            Sign in
          </button>
        </p>

      </div>
    </div>
  )
}
