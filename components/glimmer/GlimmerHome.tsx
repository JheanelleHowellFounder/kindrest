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
import { getTodaysQuote } from '@/lib/quotes'
import { CareNudge } from '@/components/glimmer/CareNudge'
import { trackEvent } from '@/lib/analytics'
import { InviteCard } from '@/components/glimmer/InviteCard'

function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/** A note left by someone in her circle. Wires up with the community feature (V3). */
interface PeopleNote {
  from: string
  body: string
}

interface PastGlimmer {
  id: string
  body: string
  entry_date: string
}

/** "Tuesday" for this week, "Mar 4" beyond it. */
function shortDate(d: string): string {
  const date = new Date(d + 'T00:00:00')
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (days <= 6) return date.toLocaleDateString('en-US', { weekday: 'long' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const CIRCLES = [
  {
    label: 'Play',
    href: '/rest-card',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="8"  cy="8"  r="1.6" fill="currentColor" />
        <circle cx="12" cy="12" r="1.6" fill="currentColor" />
        <circle cx="16" cy="16" r="1.6" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: 'Reflect',
    href: '/journal',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /><path d="M14 6l3 3" />
      </svg>
    ),
  },
  {
    label: 'Check-in',
    href: '/check-in',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20.2s-7-4.4-9.3-8.6C1.1 8.6 2.6 5 5.9 5c1.9 0 3.3 1.4 6.1 4 2.8-2.6 4.2-4 6.1-4 3.3 0 4.8 3.6 3.2 6.6-2.3 4.2-9.3 8.6-9.3 8.6Z" />
      </svg>
    ),
  },
]

/**
 * The home — where she's met.
 *
 * A greeting, one warm line to land on, today's glimmer as the hero, and three
 * quiet ways in. She can answer in fifteen seconds and leave, or pick a circle.
 * Nothing here scores her, and nothing has to be finished.
 */
export function GlimmerHome() {
  const { user } = useAuth()
  const router = useRouter()

  const firstName = user?.user_metadata?.name?.split(' ')[0] ?? 'there'
  const prompt = getTodaysPrompt()
  const quote = getTodaysQuote()

  const [text, setText] = useState('')
  const [phase, setPhase] = useState<'writing' | 'fork' | 'saving' | 'done'>('writing')
  const [outcome, setOutcome] = useState<'answered' | 'quiet' | 'heavy'>('answered')
  const [showCrisis, setShowCrisis] = useState(false)
  const [isFirstTime, setIsFirstTime] = useState(false)
  const [past, setPast] = useState<PastGlimmer[]>([])
  // Populated by the community feature (V3); until then the quote holds this slot.
  const [note] = useState<PeopleNote | null>(null)

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
    return () => { active = false }
  }, [])

  // Her collection: drives the first-time helper and the "lately" strip below.
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    authedFetch('/api/glimmer/timeline')
      .then(r => r.json())
      .then(d => {
        const all: PastGlimmer[] = d?.glimmers ?? []
        setIsFirstTime(all.length === 0)
        setPast(all.filter(g => g.entry_date !== today && g.body).slice(0, 3))
      })
      .catch(() => {})
  }, [phase])

  function onChange(v: string) {
    setText(v)
    if (showCrisis && !detectCrisisLanguage(v)) setShowCrisis(false)
  }

  async function persist(bodyValue: string | null, signal: 'answered' | 'quiet' | 'heavy') {
    setPhase('saving')
    try {
      await authedFetch('/api/glimmer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: bodyValue, signal }),
      })
      // Weekly-active numerator. Deliberately carries no signal and no text —
      // that she showed up is the metric; what she felt is not ours to send.
      trackEvent('glimmer_saved')
    } catch {
      /* best-effort; the moment still counts for her */
    }
    setPhase('done')
  }

  function saveAnswer() {
    if (detectCrisisLanguage(text)) setShowCrisis(true)   // still saves — never silence her
    setOutcome('answered')
    persist(text, 'answered')
  }

  function finishEmpty(kind: 'quiet' | 'heavy') {
    setOutcome(kind)
    persist(null, kind)
  }

  const canSave = text.trim().length > 0 && phase !== 'saving'

  return (
    <div className="flex flex-col min-h-screen pb-28 bg-cream">
      <div className="px-[22px] pt-12 flex flex-col gap-8">

        {/* ── 1. Greeting + the warm line ────────────────────────────────── */}
        <div className="flex flex-col gap-2.5">
          <p className="font-display font-semibold text-[21px] leading-tight text-mustard">
            {timeGreeting()}, {firstName}.
          </p>

          {note ? (
            <div className="bg-mustard/[0.07] rounded-2xl px-4 py-3.5 flex flex-col gap-1">
              <p className="font-display font-semibold text-[12px] tracking-[0.03em] text-mustard">
                {note.from} left this for you
              </p>
              <p className="font-serif italic text-[19px] leading-[1.4] text-chocolate">{note.body}</p>
            </div>
          ) : (
            <p className="font-serif italic text-[19px] leading-[1.4] text-chocolate pr-3">{quote}</p>
          )}
        </div>

        {/* Gentle care nudge — only after a stretch of hard days */}
        <CareNudge />

        {/* ── 2. Today's glimmer — the hero ──────────────────────────────── */}
        <div className="bg-white rounded-[26px] px-[22px] pt-[26px] pb-[22px] shadow-[0_6px_20px_-10px_rgba(48,33,26,0.18)] flex flex-col gap-3.5">
          <p className="font-display font-semibold text-[12px] tracking-[0.16em] uppercase text-mustard">
            Today’s glimmer
          </p>

          {/* Writing */}
          {(phase === 'writing' || phase === 'saving') && (
            <div className="flex flex-col gap-3">
              <h1 className="font-serif text-[23px] leading-[1.3] text-chocolate">{prompt.text}</h1>

              {isFirstTime && (
                <p className="font-sans text-[13px] leading-[1.5] text-chocolate/55">
                  One honest sentence, whenever you’re ready. No need to finish it.
                </p>
              )}

              <textarea
                value={text}
                onChange={e => onChange(e.target.value)}
                placeholder="One sentence is plenty."
                rows={2}
                className="w-full border-0 border-b border-beige bg-transparent font-sans text-base text-chocolate placeholder:text-chocolate/35 px-0.5 py-1.5 outline-none focus:border-mustard resize-none transition-colors"
              />

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setPhase('fork')}
                  disabled={phase === 'saving'}
                  className="font-sans text-[13px] text-chocolate/45 hover:text-chocolate/70 transition-colors py-1"
                >
                  Nothing came to mind
                </button>

                {text.trim().length > 0 && (
                  <button
                    onClick={saveAnswer}
                    disabled={!canSave}
                    className="font-display font-semibold text-[13px] text-mustard py-1 px-0.5 disabled:opacity-50"
                  >
                    {phase === 'saving' ? 'Saving…' : 'Leave it here'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Fork — quiet or heavy */}
          {phase === 'fork' && (
            <div className="flex flex-col gap-3">
              <h1 className="font-serif text-[21px] leading-[1.3] text-chocolate">
                Is today just quiet, or is it heavy?
              </h1>
              <p className="font-sans text-[13px] leading-[1.5] text-chocolate/55">
                No wrong answer — it just helps me meet you where you actually are.
              </p>

              <button
                onClick={() => finishEmpty('quiet')}
                className="w-full text-left border border-beige rounded-[18px] px-4 py-3.5 hover:border-mustard/60 transition-colors"
              >
                <span className="font-display font-semibold text-[14px] text-chocolate block">Just quiet</span>
                <span className="font-sans text-[12.5px] text-chocolate/50">A calm or plain day. Nothing’s wrong.</span>
              </button>

              <button
                onClick={() => finishEmpty('heavy')}
                className="w-full text-left bg-chocolate rounded-[18px] px-4 py-3.5"
              >
                <span className="font-display font-semibold text-[14px] text-cream block">It’s heavy</span>
                <span className="font-sans text-[12.5px] text-cream/60">Today’s asking a lot of me.</span>
              </button>

              <button
                onClick={() => setPhase('writing')}
                className="font-sans text-[13px] text-chocolate/40 hover:text-chocolate/70 transition-colors self-start py-1"
              >
                Back
              </button>
            </div>
          )}

          {/* Done */}
          {phase === 'done' && (
            <div className="flex flex-col gap-3">
              {outcome === 'heavy' ? (
                <>
                  <h1 className="font-serif text-[21px] leading-[1.3] text-chocolate">Thank you for being honest.</h1>
                  <p className="font-sans text-[13.5px] leading-[1.6] text-chocolate/60">
                    Some days ask more of you than a glimmer can answer. You don’t have to find the
                    bright side today.
                  </p>

                  <button
                    onClick={() => router.push('/check-in')}
                    className="w-full flex items-center justify-between bg-chocolate rounded-[18px] px-4 py-3.5"
                  >
                    <span className="text-left">
                      <span className="font-display font-semibold text-[14px] text-cream block">Check in with me</span>
                      <span className="font-sans text-[12.5px] text-cream/60">Two minutes. No performing, no fixing.</span>
                    </span>
                    <ArrowRight className="w-[18px] h-[18px] text-mustard flex-shrink-0" />
                  </button>

                  <div className="bg-[#f0e9e2] rounded-[18px] px-4 py-3.5">
                    <p className="font-sans text-[12.5px] leading-[1.6] text-chocolate/70">
                      If today feels like more than you can hold, you can talk to someone who gets
                      it — no crisis required.
                    </p>
                    <a href="tel:18009444773" className="flex items-center gap-2 font-display font-semibold text-[13px] text-chocolate mt-2">
                      <span className="text-mustard">♡</span>
                      Postpartum Support International: 1-800-944-4773
                    </a>
                    <p className="font-sans text-[11px] text-chocolate/40 mt-1.5">
                      In crisis right now? Call or text <a href="tel:988" className="underline">988</a>.
                    </p>
                  </div>
                </>
              ) : outcome === 'answered' && text.trim() ? (
                <>
                  <h1 className="font-serif text-[21px] leading-[1.3] text-chocolate">
                    Left here. That’s one small thing, noticed.
                  </h1>
                  <p className="font-serif italic text-[15px] leading-[1.6] text-chocolate/55">“{text.trim()}”</p>
                </>
              ) : (
                <h1 className="font-serif text-[21px] leading-[1.3] text-chocolate">
                  Some days there isn’t one, and that’s allowed. You still showed up.
                </h1>
              )}

              <div className="flex items-center gap-3.5 pt-0.5">
                <Link href="/glimmers" className="font-sans text-[13px] text-chocolate/50 hover:text-chocolate transition-colors">
                  Your glimmers
                </Link>
                <span className="text-chocolate/20">·</span>
                <button
                  onClick={() => setPhase('writing')}
                  className="font-sans text-[13px] text-chocolate/50 hover:text-chocolate transition-colors"
                >
                  Edit today’s
                </button>
              </div>
            </div>
          )}
        </div>

        {showCrisis && <CrisisCard />}

        {/* ── 3. Three ways in ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-3.5 items-center">
          <p className="font-sans text-[13px] text-chocolate/45">or, if you’d rather</p>
          <div className="flex gap-[22px] justify-center">
            {CIRCLES.map(({ label, href, icon }) => (
              <button
                key={label}
                onClick={() => router.push(href)}
                className="flex flex-col items-center gap-2 group"
              >
                <span className="w-[74px] h-[74px] rounded-full bg-chocolate flex items-center justify-center text-mustard transition-all group-hover:bg-chocolate/90 group-active:scale-95">
                  {icon}
                </span>
                <span className="font-display font-semibold text-[13px] text-chocolate">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── 4. Her collection — a record, never a task ──────────────────── */}
        {past.length > 0 && (
          <div className="flex flex-col gap-3 pt-1">
            <p className="font-display font-semibold text-[11.5px] tracking-[0.14em] uppercase text-chocolate/35">
              Lately, you noticed
            </p>
            <div className="flex flex-col">
              {past.map((g, i) => (
                <div key={g.id} className={i > 0 ? 'border-t border-beige/50 pt-3 mt-3' : ''}>
                  <p className="font-serif text-[15px] leading-[1.5] text-chocolate/75">“{g.body}”</p>
                  <p className="font-sans text-[11.5px] text-chocolate/35 mt-1">{shortDate(g.entry_date)}</p>
                </div>
              ))}
            </div>
            <Link
              href="/glimmers"
              className="font-sans text-[13px] text-chocolate/45 hover:text-chocolate transition-colors"
            >
              All your glimmers →
            </Link>
          </div>
        )}

        {/* ── 5. Pass it on — only once today's already behind her ─────────── */}
        {phase === 'done' && <InviteCard />}

      </div>
    </div>
  )
}
