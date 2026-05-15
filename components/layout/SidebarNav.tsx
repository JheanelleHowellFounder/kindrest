'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Sparkles, Clock, User, MessageCircle, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useState } from 'react'
import { FeedbackSheet } from '@/components/shared/FeedbackSheet'

const NAV_ITEMS = [
  { href: '/',          label: 'Home',     icon: Home,     num: '01' },
  { href: '/check-in',  label: 'Check-In', icon: Sparkles, num: '02' },
  { href: '/history',   label: 'History',  icon: Clock,    num: '03' },
  { href: '/profile',   label: 'Profile',  icon: User,     num: '04' },
]

interface SidebarNavProps {
  collapsed: boolean
  onToggle: () => void
}

export function SidebarNav({ collapsed, onToggle }: SidebarNavProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const { user, signOut } = useAuth()
  const [showFeedback, setShowFeedback] = useState(false)

  if (!user) return null

  const firstName = user.user_metadata?.name?.split(' ')[0] ?? 'there'
  const userId    = user.id
  const email     = user.email ?? ''

  return (
    <>
      <aside
        className={`hidden md:flex flex-col fixed left-0 top-0 h-screen bg-chocolate z-40 border-r border-white/5 transition-all duration-300 overflow-hidden ${
          collapsed ? 'w-[72px]' : 'w-[280px]'
        }`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 pt-9 pb-6 transition-all duration-300 ${collapsed ? 'px-5 justify-center' : 'px-7'}`}>
          {collapsed ? (
            <span className="font-serif text-[22px] text-mustard leading-none">K</span>
          ) : (
            <div>
              <div>
                <span className="font-serif text-[26px] text-cream leading-none">Kind</span>
                <span className="font-serif text-[26px] text-mustard leading-none">rest</span>
              </div>
              <p className="font-sans text-[11px] text-cream/35 mt-0.5 leading-snug whitespace-nowrap">
                Your daily wellness companion
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-white/8 mb-5" />

        {/* Section label */}
        {!collapsed && (
          <p className="px-7 text-[9px] font-display font-semibold text-mustard/50 tracking-[0.2em] uppercase mb-2">
            App
          </p>
        )}

        {/* Nav items */}
        <nav className="flex-1 px-2 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon, num }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-xl transition-all group relative ${
                  collapsed ? 'px-0 py-3 justify-center' : 'px-4 py-3'
                } ${
                  active
                    ? 'bg-white/10 text-cream'
                    : 'text-cream/40 hover:text-cream/70 hover:bg-white/5'
                }`}
              >
                {!collapsed && (
                  <span className={`font-display text-[10px] font-semibold w-5 flex-shrink-0 ${
                    active ? 'text-mustard' : 'text-cream/25 group-hover:text-cream/40'
                  }`}>
                    {num}
                  </span>
                )}
                <Icon
                  size={18}
                  strokeWidth={active ? 2.5 : 1.8}
                  className={`flex-shrink-0 ${active ? 'text-mustard' : ''}`}
                />
                {!collapsed && (
                  <>
                    <span className="font-display font-semibold text-sm">{label}</span>
                    {active && (
                      <div className="ml-auto w-1 h-4 bg-mustard rounded-full" />
                    )}
                  </>
                )}
                {/* Active dot when collapsed */}
                {collapsed && active && (
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1 h-4 bg-mustard rounded-full" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Divider */}
        <div className="mx-4 h-px bg-white/8 mb-4" />

        {/* Bottom section */}
        <div className={`pb-6 px-2 space-y-0.5 ${collapsed ? '' : ''}`}>

          {/* User label when expanded */}
          {!collapsed && (
            <div className="px-4 pb-3">
              <p className="text-[10px] text-cream/30 font-sans">Signed in as</p>
              <p className="font-display font-semibold text-sm text-cream/60 truncate">{firstName}</p>
            </div>
          )}

          <button
            onClick={() => setShowFeedback(true)}
            title={collapsed ? 'Share Feedback' : undefined}
            className={`w-full flex items-center gap-3 rounded-xl text-cream/40 hover:text-cream/70 hover:bg-white/5 transition-all py-2.5 ${
              collapsed ? 'justify-center px-0' : 'px-4'
            }`}
          >
            <MessageCircle size={17} strokeWidth={1.8} className="flex-shrink-0" />
            {!collapsed && <span className="font-display font-semibold text-sm">Share Feedback</span>}
          </button>

          <button
            onClick={async () => { await signOut(); router.replace('/') }}
            title={collapsed ? 'Sign out' : undefined}
            className={`w-full flex items-center gap-3 rounded-xl text-cream/25 hover:text-cream/50 hover:bg-white/5 transition-all py-2.5 ${
              collapsed ? 'justify-center px-0' : 'px-4'
            }`}
          >
            <span className="font-display text-sm whitespace-nowrap">
              {collapsed ? '→' : 'Sign out'}
            </span>
          </button>

          {/* Toggle button */}
          <div className="pt-2">
            <button
              onClick={onToggle}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={`w-full flex items-center gap-3 rounded-xl text-cream/20 hover:text-cream/50 hover:bg-white/5 transition-all py-2.5 ${
                collapsed ? 'justify-center px-0' : 'px-4'
              }`}
            >
              {collapsed
                ? <PanelLeftOpen size={17} strokeWidth={1.5} />
                : <><PanelLeftClose size={17} strokeWidth={1.5} /><span className="font-display text-sm">Collapse</span></>
              }
            </button>
          </div>
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
