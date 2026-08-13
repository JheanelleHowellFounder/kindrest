'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Home, HeartPulse, Clock, User } from 'lucide-react'
import { track as trackGrowth } from '@/lib/posthog'

// ── Waitlist Form ─────────────────────────────────────────────────────────────
const SELF_CARE_OPTIONS = [
  'Journaling', 'Therapy', 'Exercise', 'Social outings', 'Meditation', 'Other',
]

const inputClass = 'w-full px-5 py-4 rounded-[15px] font-sans text-sm outline-none transition-all border-2 bg-white border-beige/60 text-chocolate placeholder:text-chocolate/35 focus:border-mustard'
const labelClass = 'font-display font-semibold text-sm text-chocolate mb-1.5 block'

function WaitlistForm({ dark = false }: { dark?: boolean }) {
  const [step, setStep]           = useState<'email' | 'details' | 'success'>('email')
  const [email, setEmail]         = useState('')
  const [name, setName]           = useState('')
  const [numKids, setNumKids]     = useState('')
  const [zipCode, setZipCode]     = useState('')
  const [selfCare, setSelfCare]   = useState('')
  const [isMom, setIsMom]         = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState('')

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStep('details')
  }

  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    const kids = numKids ? parseInt(numKids, 10) : 0
    const momStatus = kids >= 1
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          numKids: kids,
          zipCode,
          selfCareRoutine: selfCare,
          isMom: momStatus,
        }),
      })
      if (res.ok) {
        setIsMom(momStatus)
        setStep('success')
      } else {
        setError('Something went wrong. Try again.')
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="space-y-1">
        {isMom ? (
          <>
            <p className="font-display text-base font-semibold text-mustard">
              You&apos;re on the list. Your invite is coming. 🤎
            </p>
            <p className="font-sans text-sm text-chocolate/50">
              We&apos;ll reach out when your spot is ready.
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-base font-semibold text-mustard">
              You&apos;re in. We&apos;ll keep you in the loop. 🤎
            </p>
            <p className="font-sans text-sm text-chocolate/50">
              Kindrest is built for moms right now, but the moms in your life will thank you for knowing about it.
            </p>
          </>
        )}
      </div>
    )
  }

  // ── Step 2: Details ──────────────────────────────────────────────────────────
  if (step === 'details') {
    return (
      <form onSubmit={handleDetailsSubmit} className="w-full max-w-lg space-y-4 text-left">
        <div className="mb-2">
          <p className="font-serif text-[22px] text-chocolate leading-snug">
            Thanks! Now a little about you.
          </p>
          <p className="font-sans text-xs text-chocolate/40 mt-1">Step 2 of 2</p>
        </div>

        {/* Name */}
        <div>
          <label className={labelClass}>Your name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="First name"
            className={inputClass}
          />
        </div>

        {/* Number of kids */}
        <div>
          <label className={labelClass}>How many kids do you have?</label>
          <input
            type="number"
            value={numKids}
            onChange={e => setNumKids(e.target.value)}
            placeholder="0"
            min={0}
            max={20}
            className={inputClass}
          />
        </div>

        {/* Zip code */}
        <div>
          <label className={labelClass}>Zip code</label>
          <input
            type="text"
            value={zipCode}
            onChange={e => setZipCode(e.target.value)}
            placeholder="e.g. 10001"
            maxLength={10}
            className={inputClass}
          />
        </div>

        {/* Self-care routine dropdown */}
        <div>
          <label className={labelClass}>Current self-care routine</label>
          <select
            value={selfCare}
            onChange={e => setSelfCare(e.target.value)}
            className={`${inputClass} appearance-none cursor-pointer`}
          >
            <option value="" disabled>Select one</option>
            {SELF_CARE_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-400 font-sans">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-7 py-4 bg-mustard text-white font-display font-semibold text-sm rounded-[15px] transition-opacity disabled:opacity-60 hover:opacity-90"
        >
          {isLoading ? 'Joining…' : 'Join the email list'}
        </button>
      </form>
    )
  }

  // ── Step 1: Email ────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-lg">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className={`flex-1 px-5 py-4 rounded-[15px] font-sans text-sm outline-none transition-all border-2
          ${dark
            ? 'bg-white/10 border-white/15 text-cream placeholder:text-cream/35 focus:border-mustard focus:bg-white/15'
            : 'bg-white border-beige/60 text-chocolate placeholder:text-chocolate/35 focus:border-mustard'
          }`}
      />
      <button
        type="submit"
        className="px-7 py-4 bg-mustard text-white font-display font-semibold text-sm rounded-[15px] whitespace-nowrap transition-opacity hover:opacity-90"
      >
        Join the email list
      </button>
    </form>
  )
}

// ── Expandable Help Card ──────────────────────────────────────────────────────
function HelpCard({
  number, title, teaser, detail, isOpen, onToggle,
}: {
  number: string
  title: string
  teaser: string
  detail: string
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full text-left bg-white rounded-3xl p-8 transition-all duration-300 hover:shadow-md group"
      style={{ boxShadow: isOpen ? '0 8px 40px rgba(48,33,26,0.10)' : undefined }}
    >
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <span className="font-serif text-[42px] text-mustard/20 leading-none block mb-4">{number}</span>
          <h3 className="font-serif text-[24px] text-chocolate leading-tight mb-3">{title}</h3>
          <p className="font-sans text-sm text-chocolate/50 leading-relaxed">{teaser}</p>
          <div
            className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-40 mt-5 opacity-100' : 'max-h-0 opacity-0'}`}
          >
            <div className="h-px bg-beige/60 mb-5" />
            <p className="font-sans text-sm text-chocolate/70 leading-relaxed">{detail}</p>
          </div>
        </div>
        <div className={`w-8 h-8 rounded-full border-2 border-beige flex items-center justify-center flex-shrink-0 mt-1 transition-all ${isOpen ? 'bg-mustard border-mustard' : 'group-hover:border-mustard/50'}`}>
          <span className={`text-sm transition-transform duration-300 ${isOpen ? 'rotate-45 text-white' : 'text-chocolate/40'}`}>+</span>
        </div>
      </div>
    </button>
  )
}

// ── Phone Mockup ──────────────────────────────────────────────────────────────
function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[240px] sm:w-[260px]">
      <div className="absolute -inset-6 bg-mustard/10 blur-3xl rounded-full pointer-events-none" />
      <div className="relative bg-[#181818] rounded-[44px] p-[9px] shadow-[0_24px_80px_rgba(0,0,0,0.35)] border border-white/10">
        <div className="absolute top-[15px] left-1/2 -translate-x-1/2 w-[88px] h-[22px] bg-[#181818] rounded-full z-10" />
        <div className="bg-cream rounded-[36px] overflow-hidden flex flex-col" style={{ minHeight: '500px' }}>
          <div className="pt-10 px-4 pb-3 flex-1">
            <p className="font-display font-semibold text-[13px] text-mustard leading-tight mt-2">Good morning, Maya.</p>
            <p className="font-serif italic text-[11px] text-chocolate leading-snug mt-1.5">
              You don&rsquo;t have to have it all together today.
            </p>

            {/* today's glimmer — the hero */}
            <div className="mt-4 bg-white rounded-2xl px-3.5 py-3.5 shadow-sm">
              <p className="font-display font-semibold text-[7px] tracking-[0.16em] uppercase text-mustard">Today&rsquo;s glimmer</p>
              <p className="font-serif text-[13px] text-chocolate leading-snug mt-1.5">
                When did you last feel most like yourself?
              </p>
              <div className="border-b border-beige mt-3 pb-1">
                <p className="font-sans text-[9px] text-chocolate/30">One sentence is plenty.</p>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="font-sans text-[8px] text-chocolate/40">Nothing came to mind</span>
                <span className="font-display font-semibold text-[8px] text-mustard">Leave it here</span>
              </div>
            </div>

            {/* three ways in */}
            <p className="font-sans text-[8px] text-chocolate/40 text-center mt-4">or, if you&rsquo;d rather</p>
            <div className="flex justify-center gap-3 mt-2">
              {[
                { l: 'Play', d: 'grid' },
                { l: 'Reflect', d: 'pen' },
                { l: 'Check-in', d: 'heart' },
              ].map(c => (
                <div key={c.l} className="flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-full bg-chocolate flex items-center justify-center">
                    {c.d === 'grid' && (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="3" width="18" height="18" rx="5" stroke="#c9981f" strokeWidth="2" />
                        <circle cx="8" cy="8" r="1.9" fill="#c9981f" />
                        <circle cx="12" cy="12" r="1.9" fill="#c9981f" />
                        <circle cx="16" cy="16" r="1.9" fill="#c9981f" />
                      </svg>
                    )}
                    {c.d === 'pen' && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c9981f" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /><path d="M14 6l3 3" />
                      </svg>
                    )}
                    {c.d === 'heart' && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c9981f" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20.2s-7-4.4-9.3-8.6C1.1 8.6 2.6 5 5.9 5c1.9 0 3.3 1.4 6.1 4 2.8-2.6 4.2-4 6.1-4 3.3 0 4.8 3.6 3.2 6.6-2.3 4.2-9.3 8.6-9.3 8.6Z" />
                      </svg>
                    )}
                  </div>
                  <span className="font-display font-semibold text-[7px] text-chocolate">{c.l}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border-t border-beige/40 px-4 py-2.5 flex justify-around mt-auto">
            {[
              { label: 'Home',     Icon: Home },
              { label: 'Check-in', Icon: HeartPulse },
              { label: 'History',  Icon: Clock },
              { label: 'Profile',  Icon: User },
            ].map(({ label, Icon }, i) => (
              <div key={label} className="flex flex-col items-center gap-[3px]">
                <Icon size={13} strokeWidth={i === 0 ? 2.4 : 1.8} className={i === 0 ? 'text-mustard' : 'text-chocolate/35'} />
                <span className={`font-display text-[7px] leading-none ${i === 0 ? 'text-mustard font-semibold' : 'text-chocolate/35'}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Landing Page ─────────────────────────────────────────────────────────
export function LandingPage() {
  // Top of the funnel. Fires once per page load.
  useEffect(() => { trackGrowth('landing_view') }, [])

  const [openCard, setOpenCard] = useState<number | null>(null)
  const [navDark, setNavDark] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    function handleScroll() {
      // Hero is ~90vh. Once scrolled past it, switch to light nav.
      setNavDark(el!.scrollTop < window.innerHeight * 0.75)
    }

    // Set correct state immediately on mount (don't wait for a scroll event)
    handleScroll()

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div ref={scrollRef} className="fixed inset-0 overflow-y-auto z-[100] bg-cream">

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className={`sticky top-0 z-50 backdrop-blur-md transition-colors duration-300 ${
        navDark
          ? 'bg-chocolate border-b border-white/5'
          : 'bg-cream border-b border-chocolate/10'
      }`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-[68px] flex items-center justify-between">
          <Link href="/">
            <span className={`font-serif text-[22px] transition-colors duration-300 ${navDark ? 'text-cream' : 'text-chocolate'}`}>Kind</span>
            <span className="font-serif text-[22px] text-mustard">rest</span>
          </Link>
          <div className="hidden md:flex items-center gap-10">
            {['#how-it-works', '#what-it-does', '#our-story'].map((href, i) => (
              <a
                key={href}
                href={href}
                className={`font-display text-sm transition-colors duration-300 ${
                  navDark ? 'text-cream/50 hover:text-cream' : 'text-chocolate/50 hover:text-chocolate'
                }`}
              >
                {['How It Works', 'What It Does', 'The Founder'][i]}
              </a>
            ))}
            <a
              href="/organizations"
              className={`font-display text-sm transition-colors duration-300 ${
                navDark ? 'text-cream/50 hover:text-cream' : 'text-chocolate/50 hover:text-chocolate'
              }`}
            >
              For organizations
            </a>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/signin"
              className={`font-display text-sm transition-colors duration-300 ${
                navDark ? 'text-cream/60 hover:text-cream' : 'text-chocolate/60 hover:text-chocolate'
              }`}
            >
              Sign in
            </a>
            <Link
              href="/onboarding"
              onClick={() => trackGrowth('cta_click', { location: 'nav' })}
              className="px-5 py-2.5 bg-mustard text-white font-display font-semibold text-sm rounded-[15px] hover:opacity-90 transition-opacity"
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative bg-chocolate overflow-hidden min-h-[90vh] flex items-center">

        {/* Hero image — right side, full bleed with gradient fade */}
        <div className="absolute inset-y-0 right-0 w-full lg:w-[55%] hidden lg:block">
          <img
            src="/hero2.jpg"
            alt="A mother, present with herself"
            className="w-full h-full object-cover object-[60%_center]"
          />
          {/* Fade into chocolate from left — clears by ~45% so subject is visible */}
          <div className="absolute inset-0 bg-gradient-to-r from-chocolate from-[30%] via-chocolate/40 via-[45%] to-transparent" />
          {/* Subtle bottom fade */}
          <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-chocolate to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-24 lg:py-32 w-full">
          <div className="max-w-xl lg:max-w-2xl">
            <p className="font-display text-xs text-mustard tracking-[0.25em] uppercase mb-8">
              Wellness for mothers
            </p>
            <h1 className="font-serif text-[46px] sm:text-[56px] lg:text-[68px] text-cream leading-[1.0] mb-6">
              You've been taking care of everyone.
            </h1>
            <h2 className="font-serif text-[46px] sm:text-[56px] lg:text-[68px] text-mustard leading-[1.0] mb-10">
              This part is for you.
            </h2>
            <p className="font-sans text-[16px] lg:text-[17px] text-cream/55 mb-12 max-w-[480px] leading-[1.75]">
              A daily companion for mothers. One small question a day, care built around the time you actually have, and room for the days when there&rsquo;s nothing good to say.
            </p>
            {/* Two CTAs */}
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link
                href="/onboarding"
                onClick={() => trackGrowth('cta_click', { location: 'hero' })}
                className="px-8 py-4 bg-mustard text-white font-display font-semibold text-sm rounded-[15px] hover:opacity-90 transition-opacity"
              >
                Start with one question
              </Link>
              <a
                href="#how-it-works"
                className="px-8 py-4 bg-transparent border-2 border-white/20 text-cream font-display font-semibold text-sm rounded-[15px] hover:border-white/40 transition-colors"
              >
                See How It Works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Strip ──────────────────────────────────────────────────────── */}
      <section className="bg-[#251a14] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-7">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-0 sm:divide-x sm:divide-white/10">
            {[
              { value: '15 sec', label: 'The whole daily ask' },
              { value: '60+', label: 'Ways to care for yourself' },
              { value: '6', label: 'Stages of motherhood, from expecting on' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-4 sm:px-12">
                <span className="font-serif text-[32px] text-mustard leading-none">{item.value}</span>
                <span className="font-sans text-[13px] text-cream/40 max-w-[140px] leading-snug">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core Message ─────────────────────────────────────────────────────── */}
      <section className="bg-cream py-28 px-6 lg:px-10">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-serif text-[30px] sm:text-[38px] lg:text-[46px] text-chocolate leading-[1.3] mb-7">
            Most wellness tools weren't built for the reality of motherhood.
          </p>
          <div className="flex items-center justify-center gap-4 mb-7">
            <div className="h-px w-12 bg-beige" />
            <div className="w-2.5 h-2.5 rounded-full bg-mustard" />
            <div className="h-px w-12 bg-beige" />
          </div>
          <p className="font-serif text-[30px] sm:text-[38px] lg:text-[46px] text-mustard leading-[1.3]">
            Kindrest was.
          </p>
          <p className="font-sans text-[16px] text-chocolate/45 mt-10 max-w-2xl mx-auto leading-relaxed">
            Built for it means the daily ask is fifteen seconds. It means you can open it on your worst day and not be asked to perform. It means nothing in here is one more thing to keep up with.
          </p>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-[#f0e9e2] py-28 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-16">
            <p className="font-display text-xs text-mustard tracking-[0.2em] uppercase mb-5">How It Works</p>
            <h2 className="font-serif text-[36px] sm:text-[46px] text-chocolate leading-tight">
              Support that fits where you are, not where you should be.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Notice one thing',
                body: 'Kindrest opens with a single question — when did you last feel like yourself? One sentence, about fifteen seconds. And if nothing comes to mind, you\'re allowed to say that.',
              },
              {
                step: '02',
                title: 'Take what you need',
                body: 'Go deeper with a two-minute check-in and get a care kit built for your mood, your capacity, and your time. Or open your Rest Card — a small board of things that might already be true today.',
              },
              {
                step: '03',
                title: 'It learns you',
                body: 'Every glimmer and every check-in teaches Kindrest what actually helps you. Over time you start to see your own patterns — and what you need before you\'re already in the deep end.',
              },
            ].map(item => (
              <div key={item.step} className="bg-white rounded-3xl p-10">
                <span className="font-serif text-[52px] text-mustard/20 leading-none block mb-6">{item.step}</span>
                <h3 className="font-serif text-[24px] text-chocolate mb-4">{item.title}</h3>
                <p className="font-sans text-[15px] text-chocolate/55 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How Kindrest Helps ────────────────────────────────────────────────── */}
      <section id="what-it-does" className="bg-cream py-28 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            {/* Left — heading + context */}
            <div className="lg:sticky lg:top-24">
              <p className="font-display text-xs text-mustard tracking-[0.2em] uppercase mb-5">What It Does</p>
              <h2 className="font-serif text-[36px] sm:text-[46px] text-chocolate leading-tight mb-6">
                Built for the days you have nothing left.
              </h2>
              <p className="font-sans text-[16px] text-chocolate/50 leading-relaxed mb-10">
                Designed for overwhelmed moms who want relief without the pressure to be "balanced." Kindrest doesn't add to your to-do list. It helps you understand yourself so you can navigate whatever's in front of you.
              </p>
              <div className="hidden lg:block">
                <PhoneMockup />
              </div>
            </div>

            {/* Right — expandable cards */}
            <div className="space-y-4">
              {[
                {
                  number: '01',
                  title: 'Notice one small thing',
                  teaser: 'Most moms are running on autopilot. Kindrest asks for fifteen seconds, not fifteen minutes.',
                  detail: 'One question a day — a glimmer — asking when you last felt like yourself. One sentence back, and you\'re done. It\'s the smallest possible ask, on purpose, because the days you need it most are the days you have the least to give.',
                },
                {
                  number: '02',
                  title: 'Get support that actually fits',
                  teaser: 'Generic wellness advice doesn\'t account for the reality of your day. This does.',
                  detail: 'Your care kit is built around your actual mood, your available time, and your capacity right now — what you get when you\'re overwhelmed is completely different from what you get when you\'re thriving. And your Rest Card is never a to-do list: it\'s a small board of things that might already be true, and you just tap the ones that are.',
                },
                {
                  number: '03',
                  title: 'Room for the hard days',
                  teaser: 'You don\'t have to have something good to say. Kindrest doesn\'t ask you to perform being okay.',
                  detail: 'If nothing comes to mind, you can say so — and Kindrest asks one thing: is today just quiet, or is it heavy? Quiet means nothing\'s wrong, see you tomorrow. Heavy means it stops asking you to find the bright side and puts real support in front of you instead. No streaks. A hard day is not a missed day.',
                },
                {
                  number: '04',
                  title: 'Understand yourself over time',
                  teaser: 'The patterns in your data tell a story. Kindrest helps you read it.',
                  detail: 'Every check-in adds to your history. Over time you start to see which categories help you most, what your common moods are, and what you need before you\'re already in the deep end. That clarity is the whole point.',
                },
              ].map((card, i) => (
                <HelpCard
                  key={i}
                  number={card.number}
                  title={card.title}
                  teaser={card.teaser}
                  detail={card.detail}
                  isOpen={openCard === i}
                  onToggle={() => setOpenCard(openCard === i ? null : i)}
                />
              ))}

              {/* Mid-page CTA */}
              <div className="pt-4">
                <Link
                  href="/onboarding"
                  onClick={() => trackGrowth('cta_click', { location: 'how-it-works' })}
                  className="inline-block px-8 py-4 bg-mustard text-white font-display font-semibold text-sm rounded-[15px] hover:opacity-90 transition-opacity"
                >
                  Sign up to meet yourself again
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── For Every Season ─────────────────────────────────────────────────── */}
      <section className="bg-[#f0e9e2] py-28 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="font-display text-xs text-mustard tracking-[0.2em] uppercase mb-5">For Every Season</p>
              <h2 className="font-serif text-[36px] sm:text-[46px] text-chocolate leading-tight">
                Not just for the fourth trimester.
              </h2>
              <p className="font-sans text-[16px] text-chocolate/50 mt-6 leading-relaxed">
                Motherhood is full of transitions. Kindrest is built for all of them.
              </p>
            </div>
            <div className="space-y-0">
              {[
                'The fourth trimester no one prepared you for',
                'Going back to work and feeling like you left part of yourself behind',
                'Not knowing who you are outside of mom',
                'When everyone\'s fine but you\'re not',
                'Running on empty but still showing up',
                'Wanting to be present but having nothing left',
              ].map((line, i) => (
                <div
                  key={i}
                  className="flex items-start gap-5 py-5 border-b border-beige/50 last:border-0"
                >
                  <span className="font-display text-[11px] text-mustard/60 font-semibold mt-1.5 flex-shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="font-serif text-[18px] text-chocolate leading-snug">{line}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Founder ───────────────────────────────────────────────────────────── */}
      <section id="our-story" className="bg-chocolate py-28 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[30%_1fr] gap-16 items-center">

            <div className="flex justify-center lg:justify-start">
              <div className="relative">
                <div className="w-[300px] h-[360px] sm:w-[340px] sm:h-[410px] rounded-3xl overflow-hidden">
                  <img
                    src="/founder.png"
                    alt="Jheanelle Howell, Founder of Kindrest"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="absolute -bottom-5 -right-5 w-36 h-36 bg-mustard/15 rounded-full blur-2xl pointer-events-none" />
              </div>
            </div>

            <div>
              <p className="font-display text-xs text-mustard tracking-[0.2em] uppercase mb-8">Meet the Founder</p>
              <div className="space-y-5 mb-8">
                <p className="font-serif text-[20px] sm:text-[24px] text-cream leading-[1.6]">
                  Postpartum was the loneliest I have ever felt. Not because I did not have a village. I did. But I had completely lost the thread back to myself, and no one knew how to help me find it.
                </p>
                <p className="font-serif text-[20px] sm:text-[24px] text-cream leading-[1.6]">
                  That is the story we tell about mothers. That the village is enough. That if the people around you show up, you will be fine. But showing up and knowing what a mother actually needs are two very different things.
                </p>
                <p className="font-serif text-[20px] sm:text-[24px] text-cream leading-[1.6]">
                  I am building Kindrest because I know I am not the only one who has had to fight to hear herself when motherhood gets loud. We deserve more than that. So we are building it.
                </p>
              </div>
              <div className="h-[2px] w-12 bg-mustard mb-6" />
              <p className="font-display font-semibold text-cream text-[15px]">Jheanelle Howell</p>
              <p className="font-sans text-cream/40 text-sm mt-1">Founder, Kindrest</p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────────── */}
      <section id="waitlist" className="bg-cream py-32 px-6 lg:px-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-[40px] sm:text-[54px] text-chocolate leading-[1.1] mb-5">
            You don't have to earn your rest.
          </h2>
          <p className="font-sans text-[16px] text-chocolate/45 mb-4 leading-relaxed">
            Kindrest is live, and it takes fifteen seconds to start.
          </p>
          <div className="flex justify-center mb-14">
            <Link
              href="/onboarding"
              onClick={() => trackGrowth('cta_click', { location: 'footer' })}
              className="px-8 py-4 bg-mustard text-white font-display font-semibold text-sm rounded-[15px] hover:opacity-90 transition-opacity"
            >
              Start with one question
            </Link>
          </div>
          <p className="font-serif text-[22px] text-chocolate leading-snug mb-2">
            Not ready yet?
          </p>
          <p className="font-sans text-[15px] text-chocolate/45 mb-8 leading-relaxed">
            Join the email list and I'll send you one honest note a month.
          </p>
          <div className="flex justify-center">
            <WaitlistForm />
          </div>
          <p className="font-sans text-xs text-chocolate/25 mt-8">
            Kindrest is not a replacement for therapy or clinical care. It's the daily layer.
          </p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="bg-chocolate border-t border-white/5 px-6 lg:px-10 py-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <span className="font-serif text-xl text-cream">Kind</span>
            <span className="font-serif text-xl text-mustard">rest</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="https://www.instagram.com/kindrestco" target="_blank" rel="noopener noreferrer" className="font-display text-sm text-cream/40 hover:text-cream transition-colors">Instagram</a>
            <a href="/organizations" className="font-display text-sm text-cream/40 hover:text-cream transition-colors">For organizations</a>
            <a href="/privacy" className="font-display text-sm text-cream/40 hover:text-cream transition-colors">Privacy</a>
            <a href="/terms" className="font-display text-sm text-cream/40 hover:text-cream transition-colors">Terms</a>
          </div>
          <p className="font-sans text-xs text-cream/25">2026 Kindrest. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}
