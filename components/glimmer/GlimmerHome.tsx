'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { authedFetch } from '@/lib/api-client'
import { detectCrisisLanguage } from '@/lib/safety'
import { CrisisCard } from '@/components/shared/CrisisCard'
import { getTodaysPrompt } from '@/lib/glimmers'
import { Reserve } from '@/components/glimmer/Reserve'
import { RestCardEntry } from '@/components/glimmer/RestCardEntry'
import { CareNudge } from '@/components/glimmer/CareNudge'
import { useWallet } from '@/lib/wallet-context'

function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * The daily glimmer — the front door (V0).
 *
 * One 15-second question is the only thing she's ever asked to do. Answering it
 * saves to her glimmer timeline and then *gently* offers depth (a check-in).
 * Leaving right after is a complete, valid session — never a broken streak.
 *
 * V0 has no gems/reserve yet; the reward is the warm confirmation + her growing
 * collection. The reserve wires in at V1.
 */
export function GlimmerHome() {
  const { user } = useAuth()
  const { applyWallet } = useWallet()
  const router = useRouter()

  const firstName = user?.user_metadata?.name?.split(' ')[0] ?? 'there'
  const prompt = getTodaysPrompt()

  const [text, setText] = useState('')
  const [phase, setPhase] = useState<'writing' | 'fork' | 'saving' | 'done'>('writing')
  // How she finished today, so the "done" state can meet her where she is.
  const [outcome, setOutcome] = useState<'answered' | 'quiet' | 'heavy'>('answered')
  const [showCrisis, setShowCrisis] = useState(false)
  const [loadedToday, setLoadedToday] = useState(false)
  const [gemsEarned, setGemsEarned] = useState<number | null>(null)

  // If she already responded today, open straight into the "done" state.
  useEffect(() => {
    let active = true
    authedFetch('/api/glimmer')
      .then(r => r.json())
      .then(data => {
        if (!active) return
        if (data?.respondedToday) {
          setText(data.today?.body ?? '')
          const signal = data.today?.mood_signal as 'answered' | 'quiet' | 'heavy' | undefined
          setOutcome(signal ?? (data.today?.body ? 'answered' : 'quiet'))
          setPhase('done')
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setLoadedToday(true) })
    return () => { active = false }
  }, [])

  function onChange(v: string) {
    setText(v)
    if (showCrisis && !detectCrisisLanguage(v)) setShowCrisis(false)
  }

  async function persist(bodyValue: string | null, signal: 'answered' | 'quiet' | 'heavy') {
    setPhase('saving')
    try {
      const res = await authedFetch('/api/glimmer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: bodyValue, signal }),
      })
      const data = await res.json().catch(() => null)
      if (data?.wallet) applyWallet(data.wallet)
      if (typeof data?.gemsEarned === 'number') setGemsEarned(data.gemsEarned)
    } catch {
      /* best-effort; the moment still counts for her */
    }
    setPhase('done')
  }

  function saveAnswer() {
    if (detectCrisisLanguage(text)) setShowCrisis(true) // still saves — never silence her
    setOutcome('answered')
    persist(text, 'answered')
  }

  // She had no glimmer. The fork tells us whether to simply validate her, or to
  // gently route a hard day toward real support — and we remember which.
  function finishEmpty(kind: 'quiet' | 'heavy') {
    setOutcome(kind)
    persist(null, kind)
  }

  const canSave = text.trim().length > 0 && phase !== 'saving'

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-cream">
      {/* Greeting */}
      <div className="px-5 pt-12">
        <p className="font-sans text-[13px] text-chocolate/50">{timeGreeting()}, {firstName}.</p>
      </div>

      {/* Gentle care nudge — appears only after a stretch of hard days */}
      <CareNudge />

      {/* Reserve — the breathing centerpiece, always visible */}
      <div className="px-5 mt-6">
        <Reserve />
      </div>

      {/* The reserve's second feeder — the Rest Card, right beneath it */}
      <div className="px-5 mt-4">
        <RestCardEntry />
      </div>

      {/* Today's glimmer label */}
      <div className="flex items-center gap-1.5 px-5 mt-6">
        <svg width="13" height="13" viewBox="0 0 24 24" className="text-mustard" fill="currentColor">
          <path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2z" />
        </svg>
        <p className="font-display font-semibold text-[11.5px] uppercase tracking-[0.15em] text-mustard">Today’s glimmer</p>
      </div>

      {/* The question — sits directly on the cream, no card */}
      <div className="px-5 mt-2.5">
        <h1 className="font-serif text-[26px] leading-[1.3] text-chocolate">{prompt.text}</h1>
        <p className="font-sans text-[13px] text-chocolate/45 mt-2.5 leading-[1.6]">
          A glimmer is a small moment you felt like yourself. Catch one — that’s the whole practice.
        </p>
      </div>

      {/* Writing state */}
      {(phase === 'writing' || phase === 'saving') && (
        <div className="px-5 mt-[18px] space-y-3">
          <textarea
            value={text}
            onChange={e => onChange(e.target.value)}
            placeholder="A sentence is plenty…"
            rows={4}
            className="w-full bg-white rounded-[20px] border border-beige/40 px-4 py-4 text-base text-chocolate placeholder:text-chocolate/30 outline-none focus:border-mustard/60 resize-none font-sans leading-relaxed"
          />

          {showCrisis && <CrisisCard />}

          <button
            onClick={saveAnswer}
            disabled={!canSave}
            className="w-full flex items-center justify-center gap-2 bg-mustard text-white font-display font-semibold text-[15px] py-4 rounded-[15px] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {phase === 'saving' ? 'Saving…' : 'Save my glimmer'}
          </button>

          <button
            onClick={() => setPhase('fork')}
            disabled={phase === 'saving'}
            className="w-full text-center font-sans text-[13.5px] text-chocolate/45 py-1.5 hover:text-chocolate/70 transition-colors"
          >
            Nothing came to mind today
          </button>
        </div>
      )}

      {/* Fork — "quiet or heavy?" — the safety net for an empty day */}
      {phase === 'fork' && (
        <div className="px-5 mt-[18px] space-y-3">
          <div className="bg-white rounded-[24px] border border-beige/40 px-5 py-[22px]">
            <p className="font-serif text-[19px] text-chocolate leading-[1.3]">
              Is today just quiet, or is it heavy?
            </p>
            <p className="font-sans text-[13px] text-chocolate/50 mt-2">
              No wrong answer — this just helps me meet you where you actually are.
            </p>
          </div>

          <button
            onClick={() => finishEmpty('quiet')}
            className="w-full flex items-center justify-between bg-white border border-beige/50 text-chocolate px-[18px] py-[15px] rounded-[20px] hover:border-mustard/40 transition-colors"
          >
            <span className="text-left">
              <span className="font-display font-semibold text-[15px] block">Just quiet</span>
              <span className="font-sans text-[12.5px] text-chocolate/50">A calm or plain day. Nothing’s wrong.</span>
            </span>
          </button>

          <button
            onClick={() => finishEmpty('heavy')}
            className="w-full flex items-center justify-between bg-chocolate text-cream px-[18px] py-[15px] rounded-[20px]"
          >
            <span className="text-left">
              <span className="font-display font-semibold text-[15px] block">It’s heavy</span>
              <span className="font-sans text-[12.5px] text-cream/60">Today’s asking a lot of me.</span>
            </span>
          </button>

          <button
            onClick={() => setPhase('writing')}
            className="w-full text-center font-sans text-[13px] text-chocolate/40 py-1.5 hover:text-chocolate/70 transition-colors"
          >
            Back
          </button>
        </div>
      )}

      {/* Done state — meets her differently depending on how she finished */}
      {phase === 'done' && (
        <div className="px-5 mt-[18px] space-y-[14px]">

          {/* HEAVY — a hard day, gently routed toward real support */}
          {outcome === 'heavy' ? (
            <>
              <div className="bg-white rounded-[24px] border border-beige/40 px-5 py-[22px]">
                <p className="font-serif text-[19px] text-chocolate leading-[1.3]">
                  Thank you for being honest.
                </p>
                <p className="font-sans text-[14px] text-chocolate/60 leading-[1.65] mt-2.5">
                  Some days ask more of you than a glimmer can answer. You don’t have to
                  find the bright side today. Let’s just meet you where you actually are.
                </p>
              </div>

              {gemsEarned ? (
                <p className="text-center font-sans text-[12.5px] text-chocolate/45">
                  <span className="text-mustard">✦</span> +{gemsEarned} — showing up counts, even today.
                </p>
              ) : null}

              <button
                onClick={() => router.push('/check-in')}
                className="w-full flex items-center justify-between bg-chocolate text-cream px-[18px] py-[15px] rounded-[20px]"
              >
                <span className="text-left">
                  <span className="font-display font-semibold text-[15px] block">Check in with me</span>
                  <span className="font-sans text-[12.5px] text-cream/60">Two minutes. No performing, no fixing.</span>
                </span>
                <ArrowRight className="w-[18px] h-[18px] text-mustard flex-shrink-0" />
              </button>

              {/* Soft, non-alarming support — PSI warmline, no crisis required */}
              <div className="bg-[#f0e9e2] rounded-[20px] px-4 py-[18px]">
                <p className="font-sans text-[13px] text-chocolate/70 leading-[1.6]">
                  If today feels like more than you can hold, you can talk to someone who
                  gets it — no crisis required.
                </p>
                <a
                  href="tel:18009444773"
                  className="flex items-center gap-2 font-display font-semibold text-[13.5px] text-chocolate mt-2.5"
                >
                  <span className="text-mustard">♡</span>
                  Postpartum Support International: 1-800-944-4773
                </a>
                <p className="font-sans text-[11.5px] text-chocolate/40 mt-2">
                  In crisis right now? Call or text <a href="tel:988" className="underline">988</a>.
                </p>
              </div>

              {showCrisis && <CrisisCard />}
            </>
          ) : (
            <>
              {/* ANSWERED or JUST-QUIET — warm confirmation + optional depth */}
              <div className="bg-white rounded-[24px] border border-beige/40 px-5 py-[22px]">
                {outcome === 'answered' && text.trim() ? (
                  <>
                    <p className="font-serif text-[18.5px] text-chocolate leading-[1.3]">
                      Saved. That’s one small thing, noticed.
                    </p>
                    <p className="font-serif italic text-[14px] text-chocolate/55 leading-[1.65] mt-2.5">
                      “{text.trim()}”
                    </p>
                  </>
                ) : (
                  <p className="font-serif text-[18.5px] text-chocolate leading-[1.3]">
                    Some days there isn’t one, and that’s allowed. You still showed up.
                  </p>
                )}
              </div>

              {gemsEarned ? (
                <p className="text-center font-sans text-[12.5px] text-chocolate/45">
                  <span className="text-mustard">✦</span> +{gemsEarned} gems — your reserve is filling.
                </p>
              ) : null}

              {showCrisis && <CrisisCard />}

              {/* The soft branch — offered, never forced */}
              <button
                onClick={() => router.push('/check-in')}
                className="w-full flex items-center justify-between bg-chocolate text-cream px-[18px] py-[15px] rounded-[20px]"
              >
                <span className="text-left">
                  <span className="font-display font-semibold text-[15px] block">Want to go a little deeper?</span>
                  <span className="font-sans text-[12.5px] text-cream/60">A two-minute check-in, if you have it in you.</span>
                </span>
                <ArrowRight className="w-[18px] h-[18px] text-mustard flex-shrink-0" />
              </button>
            </>
          )}

          <div className="flex items-center justify-center gap-[14px] pt-0.5">
            <Link href="/glimmers" className="font-sans text-[13.5px] text-chocolate/50 hover:text-chocolate transition-colors">
              Your glimmers
            </Link>
            <span className="text-chocolate/20">·</span>
            <button
              onClick={() => { setPhase('writing') }}
              className="font-sans text-[13.5px] text-chocolate/50 hover:text-chocolate transition-colors"
            >
              Edit today’s
            </button>
          </div>
        </div>
      )}

      {/* subtle hint while today's state loads, so the CTA doesn't flash */}
      {!loadedToday && phase === 'writing' && (
        <div className="px-5 mt-2">
          <p className="font-sans text-[12px] text-chocolate/30 text-center">…</p>
        </div>
      )}
    </div>
  )
}
