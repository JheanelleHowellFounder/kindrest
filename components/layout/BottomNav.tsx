'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, HeartPulse, Clock, User } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/',         label: 'Home',     icon: Home       },
  { href: '/check-in', label: 'Check-in', icon: HeartPulse },
  { href: '/history',  label: 'History',  icon: Clock      },
  { href: '/profile',  label: 'Profile',  icon: User       },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-beige/50 z-50">
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[52px] ${
                active ? 'text-mustard' : 'text-chocolate/40 hover:text-chocolate/60'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-display font-semibold leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
