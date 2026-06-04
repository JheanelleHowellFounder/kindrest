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

      {/*
        Single render — children appear exactly once in the DOM.
        "mobile-shell" gives the 430px phone layout on small screens.
        "md-web-shell" overrides to max-w-2xl desktop layout at md+.
        Dual render was previously used but caused position:fixed children
        to render twice on desktop (visible through display:none in Safari/Chrome
        on macOS), breaking click events on the landing page.
      */}
      <div
        className={`transition-all duration-300 md:min-h-screen md:bg-[#e8e0d8] ${
          collapsed ? 'md:ml-[72px]' : 'md:ml-[280px]'
        }`}
      >
        <div className="mobile-shell md-web-shell">
          {children}
        </div>
      </div>
    </>
  )
}
