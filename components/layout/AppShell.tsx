'use client'

import { useState, useEffect } from 'react'
import { SidebarNav } from './SidebarNav'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  // Persist collapse preference
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  function toggle() {
    setCollapsed(c => {
      localStorage.setItem('sidebar-collapsed', String(!c))
      return !c
    })
  }

  return (
    <>
      <SidebarNav collapsed={collapsed} onToggle={toggle} />

      {/* Mobile: plain mobile shell. Desktop: web-width content shifted past sidebar. */}
      <div
        className={`transition-all duration-300 md:min-h-screen md:bg-[#e8e0d8] ${
          collapsed ? 'md:ml-[72px]' : 'md:ml-[280px]'
        }`}
      >
        {/* Mobile shell (≤ md) */}
        <div className="mobile-shell md:hidden">
          {children}
        </div>

        {/* Web shell (md+) */}
        <div className="hidden md:block w-full min-h-screen">
          <div className="max-w-5xl mx-auto px-10 py-8">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}
