'use client'

import { useState } from 'react'
import Link from 'next/link'

// ── Waitlist Form (reused in Hero + Final CTA) ────────────────────────────────
function WaitlistForm({ dark = false }: { dark?: boolean }) {
  const [email, setEmail]     = useState('')
  const [status, setStatus]   = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

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
      if (res.ok) {
        setStatus('success')
        setEmail('')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <p className={`font-display text-sm font-semibold ${dark ? 'text-mustard' : 'text-mustard'}`}>
        You're on the list. Your invite is coming. 🤎
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className={`flex-1 px-4 py-3 rounded-[15px] font-sans text-sm outline-none transition-colors border-2
          ${dark
            ? 'bg-white/10 border-white/20 text-cream placeholder:text-cream/40 focus:border-mustard'
            : 'bg-white border-beige text-chocolate placeholder:text-chocolate/40 focus:border-mustard'
          }`}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-6 py-3 bg-mustard text-white font-display font-semibold text-sm rounded-[15px] whitespace-nowrap transition-opacity disabled:opacity-60"
      >
        {status === 'loading' ? 'Joining...' : 'Get Early Access'}
      </button>
      {status === 'error' && (
        <p className="text-sm text-red-400 font-sans">Something went wrong. Try again.</p>
      )}
    </form>
  )
}

// ── Phone Mockup ──────────────────────────────────────────────────────────────
function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[240px] sm:w-[260px]">
      {/* Phone shell */}
      <div className="relative bg-[#1a1a1a] rounded-[42px] p-[10px] shadow-2xl border border-white/10">
        {/* Notch */}
        <div className="absolute top-[14px] left-1/2 -translate-x-1/2 w-[80px] h-[20px] bg-[#1a1a1a] rounded-full z-10" />
        {/* Screen */}
        <div className="bg-cream rounded-[34px] overflow-hidden" style={{ minHeight: '480px' }}>
          {/* Status bar */}
          <div className="bg-cream pt-8 px-5 pb-3">
            {/* Greeting */}
            <div className="flex items-start justify-between mt-1">
              <div>
                <h3 className="font-serif text-[22px] text-chocolate leading-tight">
                  Good morning, mama
                </h3>
                <div className="h-[2px] w-8 bg-mustard mt-1 mb-2" />
                <p className="font-sans text-[10px] text-chocolate/50 italic leading-tight">
                  "You haven't lost yourself.
                  <br />You are still here."
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-beige flex items-center justify-center mt-1">
                <span className="font-display font-bold text-[13px] text-chocolate">J</span>
              </div>
            </div>

            {/* Check-in CTA */}
            <div className="mt-4 bg-chocolate rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="font-display font-bold text-[13px] text-white">Start Check-In</p>
                <p className="font-sans text-[10px] text-white/60 mt-0.5">Get your care kit</p>
              </div>
              <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                <span className="text-mustard text-sm">✦</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-3 flex gap-2">
              <div className="flex-1 bg-chocolate rounded-xl p-3">
                <p className="font-sans text-[9px] text-white/50">Check-ins</p>
                <p className="font-serif text-[22px] text-mustard leading-none mt-0.5">5</p>
              </div>
              <div className="flex-1 bg-beige/50 rounded-xl p-3">
                <p className="font-sans text-[9px] text-chocolate/50">Day Streak</p>
                <p className="font-serif text-[22px] text-chocolate leading-none mt-0.5">3</p>
              </div>
            </div>

            {/* Top techniques */}
            <div className="mt-3">
              <p className="font-display font-semibold text-[9px] text-chocolate/40 tracking-widest uppercase mb-2">
                Top Techniques
              </p>
              {[
                'Stand in sunlight briefly',
                'Prep one small thing for tomorrow',
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-beige flex items-center justify-center text-[10px] font-display font-bold text-mustard flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="font-sans text-[10px] text-chocolate leading-tight">{t}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom nav */}
          <div className="bg-cream border-t border-beige/30 px-5 py-3 flex justify-around items-center">
            {['Home', 'Check-In', 'History', 'Profile'].map((item, i) => (
              <div key={item} className="flex flex-col items-center gap-0.5">
                <div className={`w-4 h-4 rounded-sm ${i === 0 ? 'bg-mustard' : 'bg-chocolate/20'}`} />
                <span className={`font-display text-[8px] ${i === 0 ? 'text-mustard font-semibold' : 'text-chocolate/40'}`}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Glow effect */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-48 h-12 bg-mustard/20 blur-2xl rounded-full" />
    </div>
  )
}

// ── Main Landing Page ─────────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <div className="fixed inset-0 overflow-y-auto z-[100] bg-cream">

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-chocolate/95 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-0">
            <span className="font-serif text-xl text-cream">Kind</span>
            <span className="font-serif text-xl text-mustard">rest</span>
          </Link>
          <div className="flex items-center gap-6">
            <a href="#how-it-works" className="hidden sm:block font-display text-sm text-cream/60 hover:text-cream transition-colors">
              How It Works
            </a>
            <a href="#our-story" className="hidden sm:block font-display text-sm text-cream/60 hover:text-cream transition-colors">
              Our Story
            </a>
            <a
              href="#waitlist"
              className="px-4 py-2 bg-mustard text-white font-display font-semibold text-sm rounded-[15px]"
            >
              Get Early Access
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="bg-chocolate min-h-[92vh] flex items-center">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left — copy */}
            <div>
              <p className="font-display text-xs text-mustard tracking-[0.2em] uppercase mb-6">
                Wellness for mothers
              </p>
              <h1 className="font-serif text-[42px] sm:text-[54px] lg:text-[58px] text-cream leading-[1.1] mb-3">
                You've been taking care of everyone.
              </h1>
              <h2 className="font-serif text-[42px] sm:text-[54px] lg:text-[58px] text-mustard leading-[1.1] mb-8">
                Kindrest takes care of you.
              </h2>
              <p className="font-sans text-base text-cream/60 mb-10 max-w-md leading-relaxed">
                Check in with yourself. Get care recommendations built around where you actually are right now, not where you're supposed to be.
              </p>
              <WaitlistForm dark />
            </div>

            {/* Right — phone */}
            <div className="flex justify-center lg:justify-end">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Truth Statement ───────────────────────────────────────────────────── */}
      <section className="bg-cream py-24 px-5 sm:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <p className="font-serif text-[28px] sm:text-[36px] lg:text-[42px] text-chocolate leading-[1.3]">
            Most wellness tools weren't built for the reality of motherhood.
          </p>
          <div className="h-[3px] w-16 bg-mustard mx-auto my-6 rounded-full" />
          <p className="font-serif text-[28px] sm:text-[36px] lg:text-[42px] text-mustard leading-[1.3]">
            Kindrest was.
          </p>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-[#f2ebe5] py-24 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <p className="font-display text-xs text-mustard tracking-[0.2em] uppercase text-center mb-4">
            How It Works
          </p>
          <h2 className="font-serif text-[32px] sm:text-[40px] text-chocolate text-center mb-16 leading-tight">
            Support that fits where you are
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                number: '01',
                title: 'Check In',
                body: 'Answer a few honest questions about how you\'re feeling mentally, physically, and emotionally, and how much time you have. That\'s it.',
              },
              {
                number: '02',
                title: 'Get Your Care Kit',
                body: 'Kindrest identifies where your nervous system is right now and gives you 3 recommendations matched to your mood, your capacity, and your time. Not generic. Yours.',
              },
              {
                number: '03',
                title: 'Come Back',
                body: 'Over time, Kindrest learns your patterns. You start to understand them too. The more you show up, the more it works.',
              },
            ].map(step => (
              <div key={step.number} className="bg-white rounded-3xl p-8">
                <span className="font-serif text-[40px] text-mustard/30 leading-none block mb-4">
                  {step.number}
                </span>
                <h3 className="font-serif text-[22px] text-chocolate mb-3">{step.title}</h3>
                <p className="font-sans text-sm text-chocolate/60 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Not Just Postpartum ───────────────────────────────────────────────── */}
      <section className="bg-cream py-24 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-sans text-sm text-chocolate/50 uppercase tracking-widest font-display mb-6">
            For every season
          </p>
          <h2 className="font-serif text-[28px] sm:text-[36px] text-chocolate leading-[1.3] mb-10">
            Not just for the fourth trimester.
            <br />For every transition motherhood brings.
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              'The fourth trimester',
              'Returning to work',
              'Identity shifts',
              'Sleepless seasons',
              'The in-between',
              'When you\'ve lost yourself a little',
            ].map(tag => (
              <span
                key={tag}
                className="px-4 py-2 bg-beige/50 rounded-full font-sans text-sm text-chocolate/70"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Founder ───────────────────────────────────────────────────────────── */}
      <section id="our-story" className="bg-chocolate py-24 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Photo */}
            <div className="flex justify-center lg:justify-start">
              <div className="relative">
                <div className="w-[280px] h-[320px] sm:w-[320px] sm:h-[370px] rounded-3xl overflow-hidden">
                  <img
                    src="/founder.jpg"
                    alt="Jheanelle Howell, Founder of Kindrest"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-mustard/20 rounded-full blur-2xl" />
              </div>
            </div>

            {/* Quote */}
            <div>
              <p className="font-display text-xs text-mustard tracking-[0.2em] uppercase mb-8">
                Our Story
              </p>
              <blockquote className="font-serif text-[22px] sm:text-[26px] text-cream leading-[1.5] mb-8">
                "I had never heard the term 'fourth trimester' until I was in one. My nervous system was overwhelmed. It had no anchor. Every piece of advice I got assumed I had capacity I didn't have.
                <br /><br />
                I needed something that could meet me where I actually was. So I built it."
              </blockquote>
              <div className="h-[2px] w-12 bg-mustard mb-6" />
              <p className="font-display font-semibold text-cream text-sm">Jheanelle Howell</p>
              <p className="font-sans text-cream/50 text-sm mt-1">Founder, Kindrest</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────────── */}
      <section id="waitlist" className="bg-cream py-28 px-5 sm:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-[36px] sm:text-[48px] text-chocolate leading-tight mb-4">
            You don't have to figure it all out alone.
          </h2>
          <p className="font-sans text-base text-chocolate/50 mb-10">
            Join the waitlist. Your invite is coming.
          </p>
          <div className="flex justify-center">
            <WaitlistForm />
          </div>
          <p className="font-sans text-xs text-chocolate/30 mt-6">
            Kindrest is not a replacement for therapy or clinical care. It's the daily layer.
          </p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="bg-chocolate px-5 sm:px-8 py-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-0">
            <span className="font-serif text-lg text-cream">Kind</span>
            <span className="font-serif text-lg text-mustard">rest</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-display text-sm text-cream/50 hover:text-cream transition-colors"
            >
              Instagram
            </a>
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-display text-sm text-cream/50 hover:text-cream transition-colors"
            >
              TikTok
            </a>
            <a href="/privacy" className="font-display text-sm text-cream/50 hover:text-cream transition-colors">
              Privacy
            </a>
            <a href="/terms" className="font-display text-sm text-cream/50 hover:text-cream transition-colors">
              Terms
            </a>
          </div>

          <p className="font-sans text-xs text-cream/30">
            2026 Kindrest. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  )
}
