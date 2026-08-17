'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

/**
 * Love Notes, on the home screen.
 *
 * Sits next to the invite card. The two look similar and do opposite things on
 * purpose: the invite hands Kindrest to someone else, this asks her people to
 * hold her. The empty state has to explain the whole feature in one line — it's
 * the only place most mothers will ever read what this is.
 */
export function VillageCard({ noteCount }: { noteCount: number }) {
  const has = noteCount > 0

  return (
    <Link
      href="/village"
      className="bg-white rounded-[22px] px-5 py-[18px] flex items-center gap-3 active:opacity-80 transition-opacity"
    >
      <div className="flex-1 flex flex-col gap-1">
        <p className="font-display font-semibold text-[14px] text-chocolate">Love Notes</p>
        <p className="font-sans text-[13px] leading-[1.5] text-chocolate/55">
          {has
            ? `${noteCount} ${noteCount === 1 ? 'note' : 'notes'} from your people, waiting for you.`
            : 'Send your people a link. They leave you a note, and it shows up right here — they never see anything you write.'}
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-mustard flex-shrink-0" />
    </Link>
  )
}
