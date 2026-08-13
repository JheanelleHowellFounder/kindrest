'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CrisisCard } from '@/components/shared/CrisisCard'
import { OrgInquiryForm } from './OrgInquiryForm'

export function OrganizationsPage() {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="fixed inset-0 overflow-y-auto z-[100] bg-cream">

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-cream border-b border-chocolate/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-[68px] flex items-center justify-between">
          <Link href="/">
            <span className="font-serif text-[22px] text-chocolate">Kind</span>
            <span className="font-serif text-[22px] text-mustard">rest</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="font-display text-sm text-chocolate/50 hover:text-chocolate transition-colors">
              For individuals
            </Link>
            <a
              href="mailto:jheanelle@kindrest.co?subject=Kindrest%20Founding%20Partner%20Pilot"
              className="px-5 py-2.5 bg-mustard text-white font-display font-semibold text-sm rounded-[15px] hover:opacity-90 transition-opacity"
            >
              Talk to us
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative bg-chocolate overflow-hidden min-h-[85vh] flex items-center">

        {/* Hero image — right side, full bleed with gradient fade, matching the homepage pattern */}
        <div className="absolute inset-y-0 right-0 w-full lg:w-[55%] hidden lg:block">
          <img
            src="/org-hero.jpg"
            alt="Two colleagues, confident and ready to plan"
            className="w-full h-full object-cover object-[45%_55%] -scale-x-100"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-chocolate from-[30%] via-chocolate/40 via-[45%] to-transparent" />
          <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-chocolate to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-24 lg:py-32 w-full">
          <div className="max-w-xl lg:max-w-2xl">
            <p className="font-display text-xs text-mustard tracking-[0.25em] uppercase mb-8">
              For organizations
            </p>
            <h1 className="font-serif text-[40px] sm:text-[52px] lg:text-[60px] text-cream leading-[1.08] mb-8">
              She&apos;s still building your company. Motherhood doesn&apos;t change that, but it does change her.
            </h1>
            <p className="font-sans text-[16px] lg:text-[17px] text-cream/55 mb-12 max-w-[480px] leading-[1.75]">
              Kindrest is a daily companion for the mothers on your team, built for the years
              after the leave policy stops applying: the identity shift, the return to work,
              the everyday weight that doesn&apos;t show up on an HR dashboard.
            </p>
            <a
              href="mailto:jheanelle@kindrest.co?subject=Kindrest%20Founding%20Partner%20Pilot"
              className="inline-block px-8 py-4 bg-mustard text-white font-display font-semibold text-sm rounded-[15px] hover:opacity-90 transition-opacity"
            >
              Scope your founding pilot
            </a>
          </div>
        </div>
      </section>

      {/* ── The blind spot ───────────────────────────────────────────────────── */}
      <section className="bg-[#f0e9e2] py-24 lg:py-28 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="font-display text-xs text-mustard tracking-[0.2em] uppercase mb-5">The blind spot</p>
            <h2 className="font-serif text-[32px] sm:text-[40px] text-chocolate leading-tight mb-6">
              The support ends. Motherhood doesn&apos;t.
            </h2>
            <p className="font-sans text-base text-chocolate/60 leading-relaxed mb-10">
              Most benefits cover pregnancy and the weeks around birth, then go quiet.
              What actually stretches across years (the identity shift, the return to
              work, the invisible load) is happening inside your workforce right now,
              mostly unseen and mostly unsupported. That's usually where retention
              quietly breaks.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="font-serif text-[36px] text-mustard leading-none mb-2">$14.2B</p>
                <p className="font-sans text-[13px] text-chocolate/55 leading-snug">
                  Annual U.S. cost of untreated maternal mental health. The largest share
                  is lost workforce productivity.
                </p>
                <p className="font-sans text-[10px] text-chocolate/30 italic mt-2">
                  Mathematica, American Journal of Public Health
                </p>
              </div>
              <div>
                <p className="font-serif text-[36px] text-mustard leading-none mb-2">47%</p>
                <p className="font-sans text-[13px] text-chocolate/55 leading-snug">
                  Of mothers who screen positive for a maternal mental health need go on to
                  start any support. The rest are in your workforce, unsupported.
                </p>
                <p className="font-sans text-[10px] text-chocolate/30 italic mt-2">
                  Policy Center for Maternal Mental Health, CDC data
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl overflow-hidden">
            <img
              src="/org-blindspot.jpg"
              alt="A mother, exhausted, carrying the weight of an unfinished workday"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="bg-cream py-24 lg:py-28 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-16">
            <p className="font-display text-xs text-mustard tracking-[0.2em] uppercase mb-5">How it works</p>
            <h2 className="font-serif text-[32px] sm:text-[40px] text-chocolate leading-tight">
              Fifteen seconds a day, not another thing to keep up with.
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              { n: '01', t: 'She’s asked one question', d: 'The same small question every mother gets that day, in about fifteen seconds. On the days she has nothing, it asks for less than that.' },
              { n: '02', t: 'She takes what she needs', d: 'A check-in that returns a few micro-practices matched to her state and the time she actually has — or a Rest Card, if that’s more her speed today.' },
              { n: '03', t: 'Kindrest learns her', d: 'Every skip, save, and done refines what she sees next. It gets more personal, not more generic, over time.' },
            ].map(({ n, t, d }) => (
              <div key={n} className="bg-white rounded-3xl p-10">
                <span className="font-serif text-[52px] text-mustard/20 leading-none block mb-6">{n}</span>
                <h3 className="font-serif text-[24px] text-chocolate mb-4">{t}</h3>
                <p className="font-sans text-[15px] text-chocolate/55 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Safety net ───────────────────────────────────────────────────────── */}
      <section className="bg-[#f0e9e2] py-24 lg:py-28 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="font-display text-xs text-mustard tracking-[0.2em] uppercase mb-5">Built-in safety net</p>
            <h2 className="font-serif text-[32px] sm:text-[40px] text-chocolate leading-tight mb-6">
              When something feels off, she doesn&apos;t get a wellness tip.
            </h2>
            <p className="font-sans text-base text-chocolate/60 leading-relaxed">
              Every check-in and journal entry is quietly screened for language that
              suggests real danger, to her or her baby. When it's caught, real crisis
              resources surface immediately, every time. No delay, no judgment. Nothing
              she writes is ever blocked or lost. Kindrest just makes sure she's not
              carrying it alone.
            </p>
          </div>
          <div className="max-w-sm lg:justify-self-end w-full">
            <p className="font-display text-[11px] text-chocolate/40 uppercase tracking-[0.15em] mb-3">
              What she sees, in the moment
            </p>
            <CrisisCard />
          </div>
        </div>
      </section>

      {/* ── Kindrest at Work ──────────────────────────────────────────────────── */}
      <section className="bg-chocolate py-24 lg:py-28 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <p className="font-display text-xs text-mustard tracking-[0.2em] uppercase mb-5">Kindrest at Work</p>
            <h2 className="font-serif text-[32px] sm:text-[40px] text-cream leading-tight mb-6">
              Bring Kindrest to the mothers on your team.
            </h2>
            <p className="font-sans text-base text-cream/60 leading-relaxed mb-6">
              Most organizations want to support working mothers but have no way to actually
              do it. Nothing meets her in the years after leave, when the weight is heaviest
              and the least visible. Kindrest is that support: a personalized daily
              companion, built for her, hers to use however she needs.
            </p>
            <p className="font-sans text-base text-cream/60 leading-relaxed mb-6">
              Most workplace mental health benefits go unused. Kindrest is built the other
              way around: one question a day, arriving by email each morning, with nothing
              to book and nobody to be matched with. The bar to use it is fifteen seconds,
              which is the only reason a tired mother uses anything at all.
            </p>
            <p className="font-sans text-base text-cream/60 leading-relaxed mb-10">
              You&apos;ll know whether it&apos;s working. Every week you see how many of
              your cohort enrolled and how many are actually using it. What she writes
              stays hers — you never see her check-ins, her entries, or anything she&apos;d
              want kept private. You see that she&apos;s being supported, not what
              she&apos;s carrying.
            </p>

            <p className="font-display font-semibold text-cream text-sm uppercase tracking-[0.15em] mb-5">
              What happens next
            </p>
            <div className="space-y-5 mb-10">
              {[
                { n: '1', t: 'We connect.', d: 'A short call to understand your organization and the mothers you support.' },
                { n: '2', t: 'We design your pilot.', d: 'We tailor it to your team and agree on what support looks like.' },
                { n: '3', t: 'We run it together.', d: 'Over 90 days, your people get real support and you get a clear read that it\'s working.' },
              ].map(({ n, t, d }) => (
                <div key={n} className="flex gap-4">
                  <span className="font-serif text-xl text-mustard leading-none flex-shrink-0 w-5">{n}</span>
                  <p className="font-sans text-sm text-cream/70 leading-relaxed">
                    <span className="font-display font-semibold text-cream">{t}</span> {d}
                  </p>
                </div>
              ))}
            </div>

            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="px-8 py-4 bg-mustard text-white font-display font-semibold text-sm rounded-[15px] hover:opacity-90 transition-opacity"
              >
                Let&apos;s talk
              </button>
            )}
          </div>
          {showForm ? (
            <OrgInquiryForm onClose={() => setShowForm(false)} />
          ) : (
            <div className="rounded-3xl overflow-hidden lg:sticky lg:top-24">
              <img
                src="/org-partnership.jpg"
                alt="Hands joined together, committed to a shared plan"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="bg-chocolate border-t border-white/5 px-6 lg:px-10 py-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <span className="font-serif text-xl text-cream">Kind</span>
            <span className="font-serif text-xl text-mustard">rest</span>
          </div>
          <div className="flex items-center gap-8">
            <Link href="/" className="font-display text-sm text-cream/40 hover:text-cream transition-colors">For individuals</Link>
            <Link href="/privacy" className="font-display text-sm text-cream/40 hover:text-cream transition-colors">Privacy</Link>
            <Link href="/terms" className="font-display text-sm text-cream/40 hover:text-cream transition-colors">Terms</Link>
          </div>
          <p className="font-sans text-xs text-cream/25">2026 Kindrest. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}
