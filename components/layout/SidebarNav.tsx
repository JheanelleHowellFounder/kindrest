'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Sparkles, Clock, User, MessageCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useState } from 'react'
import { FeedbackSheet } from '@/components/shared/FeedbackSheet'

const NAV_ITEMS = [
  { href: '/',          label: 'Home',     icon: Home,     num: '01' },
  { href: '/check-in',  label: 'Check-In', icon: Sparkles, num: '02' },
  { href: '/history',   label: 'History',  icon: Clock,    num: '03' },
  { href: '/profile',   label: 'Profile',  icon: User,     num: '04' },
]

export function SidebarNav() {
  const pathname   = usePathname()
  const router     = useRouter()
  const { user, signOut } = useAuth()
  const [showFeedback, setShowFeedback] = useState(false)

  // Only render for authenticated users
  if (!user) return null

  const firstName  = user.user_metadata?.name?.split(' ')[0] ?? 'there'
  const userId     = user.id
  const email      = user.email ?? ''

  return (
    <>
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-[240px] bg-chocolate z-40 border-r border-white/5">

        {/* Logo */}
        <div className="px-7 pt-10 pb-6">
          <div className="mb-1">
            <span className="font-serif text-[26px] text-cream leading-none">Kind</span>
            <span className="font-serif text-[26px] text-mustard leading-none">rest</span>
          </div>
          <p className="font-sans text-[11px] text-cream/35 leading-snug">
            Your daily wellness companion
          </p>
        </div>

        {/* Divider */}
        <div className="mx-7 h-px bg-white/8 mb-6" />

        {/* Nav section label */}
        <p className="px-7 text-[9px] font-display font-semibold text-mustard/60 tracking-[0.2em] uppercase mb-3">
          App
        </p>

        {/* Nav items */}
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon, num }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                  active
                    ? 'bg-white/10 text-cream'
                    : 'text-cream/40 hover:text-cream/70 hover:bg-white/5'
                }`}
              >
                <span className={`font-display text-[10px] font-semibold w-5 flex-shrink-0 ${
                  active ? 'text-mustard' : 'text-cream/25 group-hover:text-cream/40'
                }`}>
                  {num}
                </span>
                <Icon
                  size={15}
                  strokeWidth={active ? 2.5 : 1.8}
                  className={active ? 'text-mustard' : ''}
                />
                <span className="font-display font-semibold text-sm">{label}</span>
                {active && (
                  <div className="ml-auto w-1 h-4 bg-mustard rounded-full" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Divider */}
        <div className="mx-7 h-px bg-white/8 mb-5" />

        {/* Bottom section */}
        <div className="px-3 pb-8 space-y-0.5">
          {/* Greeting */}
          <div className="px-4 pb-3">
            <p className="text-[10px] text-cream/30 font-sans">Signed in as</p>
            <p className="font-display font-semibold text-sm text-cream/60 truncate">{firstName}</p>
          </div>

          <button
            onClick={() => setShowFeedback(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-cream/40 hover:text-cream/70 hover:bg-white/5 transition-all"
          >
            <MessageCircle size={15} strokeWidth={1.8} />
            <span className="font-display font-semibold text-sm">Share Feedback</span>
          </button>

          <button
            onClick={async () => { await signOut(); router.replace('/') }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-cream/25 hover:text-cream/50 hover:bg-white/5 transition-all"
          >
            <span className="font-display text-sm">Sign out</span>
          </button>
        </div>
      </aside>

      {showFeedback && (
        <FeedbackSheet
          userId={userId}
          email={email}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </>
  )
}
