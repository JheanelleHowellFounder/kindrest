'use client'

/**
 * What Kindrest is, and what it isn't.
 *
 * One component, two places: the end of onboarding and her profile. Onboarding
 * is where expectations get set, before she has used it once. Profile is where
 * she can find it again later, when she wonders.
 *
 * Written to lead with what Kindrest *is*. "Not a replacement for therapy" as an
 * opening reads like a legal shield and quietly diminishes the product; the
 * boundary lands harder when it follows a claim instead of standing in for one.
 *
 * ⚠️ "shaped with input from mental health professionals" is deliberately about
 * the *practice*, not a credential. It is true today, and it stays true as more
 * reviews come back. Do not upgrade this to "reviewed by clinicians",
 * "clinically validated", or anyone's name without written permission from the
 * professionals involved — they were explicitly told we were not asking for
 * endorsement.
 *
 * Two variants:
 *   'dark'  — the chocolate completion screen at the end of onboarding
 *   'light' — the cream profile page
 */
export function WhatKindrestIs({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const dark = variant === 'dark'

  const shell = dark
    ? 'bg-cream/[0.07] border-cream/15'
    : 'bg-white border-beige/40'
  const heading = dark ? 'text-mustard' : 'text-mustard'
  const body = dark ? 'text-cream/70' : 'text-chocolate/65'
  const strong = dark ? 'text-cream' : 'text-chocolate'

  return (
    <div className={`rounded-2xl border px-5 py-5 text-left flex flex-col gap-3 ${shell}`}>
      <p className={`font-display font-semibold text-[11.5px] tracking-[0.14em] uppercase ${heading}`}>
        What Kindrest is
      </p>

      <p className={`font-sans text-[13.5px] leading-[1.65] ${body}`}>
        Kindrest is a daily support tool for mothers. A place to notice one thing,
        take something small, and be met on the hard days.
      </p>

      <p className={`font-sans text-[13.5px] leading-[1.65] ${body}`}>
        <span className={`font-semibold ${strong}`}>
          It isn&apos;t a substitute for therapy. It&apos;s the layer underneath it,
        </span>{' '}
        for the ordinary weight of a day, and for the many mothers who aren&apos;t in
        care at all. The parts that carry the most weight are shaped with input from
        mental health professionals: what happens on a hard day, and what happens when
        something is bigger than one. It holds you carefully, and it knows its limits.
      </p>

      <p className={`font-sans text-[13.5px] leading-[1.65] ${body}`}>
        If what you&apos;re carrying is heavier than a hard day, that deserves real
        support, and you are not failing by needing it.
      </p>

      <div className={`pt-1 flex flex-col gap-0.5 font-sans text-[12.5px] ${body}`}>
        <p>
          If you are ever in danger, or worried about yourself or your baby, call or
          text{' '}
          <a href="tel:988" className={`font-semibold ${dark ? 'text-mustard' : 'text-mustard'}`}>988</a>.
        </p>
        <p>
          Postpartum Support International:{' '}
          <a href="tel:1-800-944-4773" className="font-semibold text-mustard">1-800-944-4773</a>
        </p>
      </div>
    </div>
  )
}
