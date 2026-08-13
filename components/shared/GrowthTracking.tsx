'use client'

import { useEffect } from 'react'
import { captureAttribution } from '@/lib/attribution'
import { initPostHog } from '@/lib/posthog'

/**
 * Mounted once in the root layout.
 *
 * Attribution is captured here rather than on the landing page alone, because
 * campaign traffic doesn't only arrive there: a flyer QR lands on /join/<slug>
 * and an invite lands on /i/<code>, and both are answers we want. First-touch
 * means calling it everywhere is safe — the second call does nothing.
 *
 * Renders nothing.
 */
export function GrowthTracking() {
  useEffect(() => {
    captureAttribution()
    initPostHog()
  }, [])

  return null
}
