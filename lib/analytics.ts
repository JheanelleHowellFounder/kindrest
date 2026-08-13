/**
 * Funnel tracking.
 *
 * We went 66 days without noticing signups had stopped, and had no way to tell
 * whether a launch post drove four visitors or four hundred. These events answer
 * the two questions we couldn't: how far people get, and where they fall out.
 *
 * PRIVACY — non-negotiable. Kindrest holds what mothers write on their hardest
 * days. Nothing she writes, and nothing about her mood, ever goes to analytics.
 * These events carry funnel position and error codes only. No content, no
 * free text, no email, no user id, no mood signal. If you find yourself adding
 * a property to answer "what did she say", the answer belongs in the database
 * behind auth, not here.
 */

import { track } from '@vercel/analytics'

export type FunnelEvent =
  /** Landed on the first onboarding screen. Top of the funnel. */
  | 'signup_started'
  /** Auth account created. Between this and signup_started sits form drop-off. */
  | 'account_created'
  /** Profile saved — the only point at which someone becomes a real user. */
  | 'onboarding_completed'
  /** Onboarding write failed. This is the alarm: it fires the moment schema
   *  drift or an outage blocks the front door, instead of days later. */
  | 'onboarding_failed'
  /** Arrived through a pilot link, so we can separate B2B from organic. */
  | 'pilot_link_opened'
  /** Returning engagement — the weekly-active numerator. Never the content. */
  | 'glimmer_saved'
  | 'checkin_completed'
  /** The referral loop. Together these give the invite rate and accept rate
   *  that G3 is measured on: sent → opened → converted. */
  | 'invite_sent'
  | 'invite_opened'
  | 'invite_converted'

type Props = Record<string, string | number | boolean>

/**
 * Events fired from a mount effect can beat the analytics script to the page —
 * `signup_started` and `pilot_link_opened` both do, and they were being dropped,
 * which would have silently cost us the entire top of the funnel. Hold anything
 * sent before the SDK is ready and flush it once it lands.
 */
const pending: [FunnelEvent, Props | undefined][] = []
let flushing = false

function ready(): boolean {
  return typeof window !== 'undefined' && typeof (window as { va?: unknown }).va === 'function'
}

function flush() {
  if (flushing) return
  flushing = true
  const attempt = (tries: number) => {
    if (ready()) {
      while (pending.length) {
        const [name, props] = pending.shift()!
        try { track(name, props) } catch { /* never break her flow */ }
      }
      flushing = false
      return
    }
    // Give up after ~5s rather than holding events forever.
    if (tries > 25) { pending.length = 0; flushing = false; return }
    setTimeout(() => attempt(tries + 1), 200)
  }
  attempt(0)
}

export function trackEvent(event: FunnelEvent, properties?: Props) {
  if (typeof window === 'undefined') return
  if (!ready()) {
    pending.push([event, properties])
    flush()
    return
  }
  try {
    track(event, properties)
  } catch {
    // Analytics must never be able to break a user's flow.
  }
}
