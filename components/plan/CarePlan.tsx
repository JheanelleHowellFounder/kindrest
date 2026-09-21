'use client'

/**
 * Her care plan — "for where you are today, this is what feels like support to you."
 *
 * The founder's brief, kept word for word as the heading, because it says the
 * job exactly: remove the work of figuring out HOW to take care of yourself.
 *
 * On day one it is built from the four things she answered at signup. Later it
 * is built from her check-ins and what she has come back to. She never has to
 * know which — the page just decides for her.
 *
 * Deliberately not a dashboard. Three things, the first one leading, and
 * nothing to configure.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bookmark, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { authedFetch } from '@/lib/api-client'
import type { Recommendation } from '@/lib/types'

interface Plan {
  basis: 'onboarding' | 'history'
  picks: Recommendation[]
  worked: { title: string; times: number }[]
  checkins: number
}

export function CarePlan() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [plan, setPlan] = useState<Plan | null>(null)
  const [fetching, setFetching] = useState(true)
  const [marked, setMarked] = useState<Record<number, 2 | 3>>({})

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/signin?redirect=/plan'); return }
    authedFetch('/api/plan')
      .then(r => r.json())
      .then(d => { if (d?.picks) setPlan(d) })
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [user, loading, router])

  /** Same record as the care kit, so the plan teaches her profile too. */
  async function mark(rec: Recommendation, rating: 2 | 3) {
    setMarked(prev => ({ ...prev, [rec.rec_id]: rating }))
    await authedFetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id,
        rec_id: rec.rec_id,
        rec_title: rec.title,
        rating,
        category: rec.category,
        regulationType: rec.regulation_type,
        regulationPhase: rec.regulation_phase,
        effortLevel: rec.effort_level,
      }),
    }).catch(() => {})
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

        <p className="text-xs font-display font-semibold text-mustard uppercase tracking-widest mb-2">
          Your plan
        </p>
        <h1 className="font-serif text-[26px] text-chocolate leading-snug">
          For where you are today.
        </h1>
        {plan && (
          <p className="font-sans text-[13.5px] text-chocolate/50 mt-2">
            {plan.basis === 'onboarding'
              ? 'Built from what you told us when you joined.'
              : 'Built from your check-ins and what you keep coming back to.'}
          </p>
        )}

        {fetching ? (
          <p className="font-sans text-[13px] text-chocolate/30 py-10">Putting this together…</p>
        ) : !plan || plan.picks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-beige/40 px-5 py-8 mt-7 text-center">
            <p className="font-serif text-[18px] text-chocolate">Your plan is on its way.</p>
            <p className="font-sans text-[13px] text-chocolate/50 mt-1.5">Check back in a moment.</p>
          </div>
        ) : (
          <>
            <div className="mt-7 flex flex-col gap-3">
              {plan.picks.map((rec, i) => {
                const lead = i === 0
                const done = marked[rec.rec_id]
                return (
                  <div
                    key={rec.id}
                    className={`rounded-[18px] px-5 py-4 ${lead ? 'bg-chocolate text-cream' : 'bg-white border border-beige/40'}`}
                  >
                    <h2 className={`font-display font-semibold text-[16px] ${lead ? 'text-cream' : 'text-chocolate'}`}>
                      {rec.title}
                    </h2>
                    <p className={`font-sans text-[13.5px] leading-[1.6] mt-1.5 ${lead ? 'text-cream/70' : 'text-chocolate/60'}`}>
                      {rec.description}
                    </p>

                    <div className={`mt-3.5 pt-3 border-t ${lead ? 'border-cream/15' : 'border-beige/40'}`}>
                      {done ? (
                        <p className={`font-sans text-[12px] ${lead ? 'text-cream/55' : 'text-chocolate/45'}`}>
                          {done === 3 ? '✓ Done' : '✓ Saved for later'}
                        </p>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => mark(rec, 3)}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-mustard text-white font-display font-semibold text-[13px] py-2 rounded-[10px]"
                          >
                            <CheckCircle2 size={13} /> Done
                          </button>
                          <button
                            onClick={() => mark(rec, 2)}
                            className={`flex-1 flex items-center justify-center gap-1.5 font-display font-semibold text-[13px] py-2 rounded-[10px] ${
                              lead ? 'bg-cream/10 text-cream' : 'bg-beige/30 text-chocolate'
                            }`}
                          >
                            <Bookmark size={13} /> Save
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {plan.worked.length > 0 && (
              <div className="mt-8">
                <p className="font-display font-semibold text-[11.5px] tracking-[0.14em] uppercase text-chocolate/35 mb-3">
                  What's worked for you
                </p>
                <div className="bg-white rounded-[18px] border border-beige/40 px-5 py-4 flex flex-col gap-2.5">
                  {plan.worked.map(w => (
                    <p key={w.title} className="font-sans text-[13.5px] text-chocolate/70 leading-snug">
                      {w.title}
                      {w.times > 1 && <span className="text-chocolate/35"> · {w.times} times</span>}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => router.push('/check-in')}
              className="w-full text-center font-sans text-[13px] text-chocolate/45 hover:text-chocolate transition-colors mt-8 py-2"
            >
              Not how you're feeling today? Check in →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
