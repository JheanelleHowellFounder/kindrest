'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

/**
 * The way in to her village, on the home screen.
 *
 * Shown after she's answered, next to the invite card. The two look similar and
 * do opposite things on purpose: the invite hands Kindrest to someone else,
 * this asks her people to hold her. Wording stays soft, because asking for
 * support is the harder of the two to press.
 */
export function VillageCard({ noteCount }: { noteCount: number }) {
  const has = noteCount > 0

  return (
    <Link
      href="/village"
      className="bg-white rounded-[22px] px-5 py-[18px] flex items-center gap-3 active:opacity-80 transition-opacity"
    >
      <div className="flex-1 flex flex-col gap-1">
        <p className="font-display font-semibold text-[14px] text-chocolate">
          {has ? 'Your village' : 'Let your people say something'}
        </p>
        <p className="font-sans text-[13px] leading-[1.5] text-chocolate/55">
          {has
            ? `${noteCount} ${noteCount === 1 ? 'note' : 'notes'} left for you.`
            : 'Send them a link. They can leave you a note — they can’t see anything you write.'}
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-mustard flex-shrink-0" />
    </Link>
  )
}
