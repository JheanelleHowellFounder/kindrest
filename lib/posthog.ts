/**
 * PostHog — four events, deliberately.
 *
 * The funnel this answers is: someone arrived, someone clicked, someone signed
 * up, someone actually used it. Anything beyond that is noise we'd have to
 * maintain, so the event name is a closed type rather than a string.
 *
 * No-ops without NEXT_PUBLIC_POSTHOG_KEY, so local and preview builds are quiet.
 *
 * PRIVACY: same rule as lib/analytics.ts. Nothing a mother writes, and no mood
 * signal, ever leaves for an analytics vendor. Autocapture and session recording
 * are off for exactly that reason — this app has journal text on the page.
 */

import posthog from 'posthog-js'

export type GrowthEvent =
  | 'landing_view'
  | 'cta_click'
  | 'signup_completed'
  | 'first_checkin_completed'

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'

let started = false

export function initPostHog(): void {
  if (started || !KEY || typeof window === 'undefined') return
  started = true
  try {
    posthog.init(KEY, {
      api_host: HOST,
      // We send our four events by hand. Autocapture would hoover up clicks and
      // input names from screens containing her journal.
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
      persistence: 'localStorage',
    })
  } catch {
    started = false
  }
}

export function track(event: GrowthEvent, properties?: Record<string, string | number | boolean>): void {
  if (!KEY || typeof window === 'undefined') return
  try {
    posthog.capture(event, properties)
  } catch {
    // Analytics must never break a user's flow.
  }
}
