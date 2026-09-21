'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

/**
 * The way into her care plan, from the home screen.
 *
 * Shows from day one, before she has checked in even once — that is the whole
 * point. A brand-new mother has answered four questions and otherwise has an
 * empty History; this is the one place that turns those answers into something
 * she can act on.
 */
export function PlanCard() {
  return (
    <Link
      href="/plan"
      className="bg-white rounded-[22px] px-5 py-[18px] flex items-center gap-3 active:opacity-80 transition-opacity"
    >
      <div className="flex-1 flex flex-col gap-1">
        <p className="font-display font-semibold text-[14px] text-chocolate">Your plan</p>
        {/* The page itself says whether it was built from her answers or her
            history, so this line doesn't need to guess. */}
        <p className="font-sans text-[13px] leading-[1.5] text-chocolate/55">
          What support looks like for you, without having to work it out.
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-mustard flex-shrink-0" />
    </Link>
  )
}
