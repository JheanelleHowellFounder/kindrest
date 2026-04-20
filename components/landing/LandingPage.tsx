'use client'

import { useState } from 'react'
import Link from 'next/link'

// ── Waitlist Form ─────────────────────────────────────────────────────────────
function WaitlistForm({ dark = false }: { dark?: boolean }) {
  const [email, setEmail]   = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      const res = await fetch('/api/mailerlite/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, group: 'waitlist' }),
      })
      setStatus(res.ok ? 'success' : 'error')
      if (res.ok) setEmail('')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <p className="font-display text-base font-semibold text-mustard">
        You're on the list. Your invite is coming. 🤎
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-lg">
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
        disabled={status === 'loading'}
        className="px-7 py-4 bg-mustard text-white font-display font-semibold text-sm rounded-[15px] whitespace-nowrap transition-opacity disabled:opacity-60 hover:opacity-90"
      >
        {status === 'loading' ? 'Joining...' : 'Get Early Access'}
      </button>
      {status === 'error' && (
        <p className="text-sm text-red-400 font-sans mt-1">Something went wrong. Try again.</p>
      )}
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
        <div className="bg-cream rounded-[36px] overflow-hidden" style={{ minHeight: '500px' }}>
          <div className="pt-10 px-5 pb-3">
            <div className="flex items-start justify-between mt-2">
              <div>
                <h3 className="font-serif text-[20px] text-chocolate leading-tight">Good morning, mama</h3>
                <div className="h-[2px] w-7 bg-mustard mt-1.5 mb-2" />
                <p className="font-sans text-[10px] text-chocolate/45 italic leading-snug">
                  "You haven't lost yourself.<br />You are still here."
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-beige flex items-center justify-center mt-0.5">
                <span className="font-display font-bold text-[13px] text-chocolate">J</span>
              </div>
            </div>
            <div className="mt-4 bg-chocolate rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="font-display font-bold text-[13px] text-white">Start Check-In</p>
                <p className="font-sans text-[10px] text-white/50 mt-0.5">Get your care kit</p>
              </div>
              <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                <span className="text-mustard text-sm">✦</span>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <div className="flex-1 bg-chocolate rounded-xl p-3">
                <p className="font-sans text-[8px] text-white/40 uppercase tracking-wide">Check-ins</p>
                <p className="font-serif text-[22px] text-mustard leading-none mt-1">5</p>
              </div>
              <div className="flex-1 bg-beige/40 rounded-xl p-3">
                <p className="font-sans text-[8px] text-chocolate/40 uppercase tracking-wide">Streak</p>
                <p className="font-serif text-[22px] text-chocolate leading-none mt-1">3</p>
              </div>
            </div>
            <p className="font-display font-semibold text-[8px] text-chocolate/40 tracking-[0.15em] uppercase mt-4 mb-2">Top Techniques</p>
            {['Stand in sunlight briefly', 'Prep one small thing', 'Write what worked today'].map((t, i) => (
              <div key={i} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 mb-1.5 shadow-sm">
                <span className="w-5 h-5 rounded-full bg-beige flex items-center justify-center text-[9px] font-bold text-mustard flex-shrink-0">{i + 1}</span>
                <p className="font-sans text-[10px] text-chocolate">{t}</p>
              </div>
            ))}
          </div>
          <div className="bg-cream border-t border-beige/30 px-5 py-2.5 flex justify-around mt-2">
            {['Home', 'Check-In', 'History', 'Profile'].map((item, i) => (
              <div key={item} className="flex flex-col items-center gap-0.5">
                <div className={`w-4 h-4 rounded-sm ${i === 0 ? 'bg-mustard' : 'bg-chocolate/15'}`} />
                <span className={`font-display text-[7px] ${i === 0 ? 'text-mustard font-semibold' : 'text-chocolate/30'}`}>{item}</span>
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
  const [openCard, setOpenCard] = useState<number | null>(null)

  return (
    <div className="fixed inset-0 overflow-y-auto z-[100] bg-cream">

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-chocolate/97 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-[68px] flex items-center justify-between">
          <Link href="/">
            <span className="font-serif text-[22px] text-cream">Kind</span>
            <span className="font-serif text-[22px] text-mustard">rest</span>
          </Link>
          <div className="hidden md:flex items-center gap-10">
            <a href="#how-it-works" className="font-display text-sm text-cream/50 hover:text-cream transition-colors">How It Works</a>
            <a href="#what-it-does" className="font-display text-sm text-cream/50 hover:text-cream transition-colors">What It Does</a>
            <a href="#our-story" className="font-display text-sm text-cream/50 hover:text-cream transition-colors">Our Story</a>
          </div>
          <a href="#waitlist" className="px-5 py-2.5 bg-mustard text-white font-display font-semibold text-sm rounded-[15px] hover:opacity-90 transition-opacity">
            Get Early Access
          </a>
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
              Kindrest takes care of you.
            </h2>
            <p className="font-sans text-[16px] lg:text-[17px] text-cream/55 mb-12 max-w-[480px] leading-[1.75]">
              A personalized wellness app that helps mothers reconnect with themselves through check-ins, emotional insights, and care recommendations that evolve with you.
            </p>
            {/* Two CTAs */}
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <a
                href="#waitlist"
                className="px-8 py-4 bg-mustard text-white font-display font-semibold text-sm rounded-[15px] hover:opacity-90 transition-opacity"
              >
                Join the Waitlist
              </a>
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
              { value: '5', label: 'Regulation phases tracked' },
              { value: '45+', label: 'Personalized care recommendations' },
              { value: '6', label: 'Stages of motherhood supported' },
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
            Like Spotify curates music to your mood, Kindrest curates care recommendations that evolve with yours. Technology that adapts to your emotional rhythm, not just your data.
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
                title: 'Check In',
                body: 'Answer a few honest questions about how you\'re feeling mentally, physically, and emotionally. Tell us how much time you have. That\'s it.',
              },
              {
                step: '02',
                title: 'Get Your Care Kit',
                body: 'Kindrest identifies your regulation state and gives you 3 recommendations built around your mood, your capacity, and your time right now. Not generic. Yours.',
              },
              {
                step: '03',
                title: 'Come Back',
                body: 'Every check-in teaches Kindrest something about you. Over time you start to recognize your patterns and understand what you need before you\'re already overwhelmed.',
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
                Gentle systems for real life.
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
                  title: 'Know where you are',
                  teaser: 'Most moms are running on autopilot. Kindrest helps you pause long enough to notice.',
                  detail: 'Your nervous system is always communicating. Through a quick check-in, Kindrest identifies your current regulation state — whether you\'re in survival mode, stabilizing, or thriving — and responds accordingly. Naming it is the first step to shifting it.',
                },
                {
                  number: '02',
                  title: 'Get support that actually fits',
                  teaser: 'Generic wellness advice doesn\'t account for the reality of your day. This does.',
                  detail: 'Your care kit is built around your actual mood, your available time, and your capacity right now. Not a rigid routine. A responsive system. What you get when you\'re overwhelmed is completely different from what you get when you\'re thriving.',
                },
                {
                  number: '03',
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
                <a
                  href="#waitlist"
                  className="inline-block px-8 py-4 bg-mustard text-white font-display font-semibold text-sm rounded-[15px] hover:opacity-90 transition-opacity"
                >
                  Sign up to meet yourself again
                </a>
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
            You don't have to figure it all out alone.
          </h2>
          <p className="font-sans text-[16px] text-chocolate/45 mb-12 leading-relaxed">
            Join the waitlist. Your personalized invite is coming.
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
            <a href="/privacy" className="font-display text-sm text-cream/40 hover:text-cream transition-colors">Privacy</a>
            <a href="/terms" className="font-display text-sm text-cream/40 hover:text-cream transition-colors">Terms</a>
          </div>
          <p className="font-sans text-xs text-cream/25">2026 Kindrest. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}
