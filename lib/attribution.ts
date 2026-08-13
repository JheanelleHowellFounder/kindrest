/**
 * First-touch attribution.
 *
 * Captures where someone came from the first time they arrive, and keeps that
 * answer. If she clicks an Instagram link today and a friend's invite next week,
 * Instagram gets the credit — the thing that introduced her, not the thing that
 * happened to be last.
 *
 * Everything lives under one localStorage key so it can be read in one go at
 * signup and cleared in one go afterwards.
 */

export const ATTRIBUTION_KEY = 'kindrest_attribution'

export interface Attribution {
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  referrer: string | null
  device_type: 'mobile' | 'desktop'
  first_seen_at: string
}

/** Coarse on purpose — enough to know if flyers and QR codes are landing on phones. */
function deviceType(): 'mobile' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop'
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
}

/** Empty strings are noise; store nothing rather than "". */
function clean(v: string | null): string | null {
  const t = (v ?? '').trim()
  return t.length ? t.slice(0, 400) : null
}

/**
 * Record this arrival, unless one is already recorded. Safe to call on every
 * page — the first-touch check makes repeat calls a no-op.
 */
export function captureAttribution(): void {
  if (typeof window === 'undefined') return
  try {
    if (window.localStorage.getItem(ATTRIBUTION_KEY)) return   // first touch wins

    const params = new URLSearchParams(window.location.search)
    const referrer = clean(document.referrer)

    const attribution: Attribution = {
      utm_source: clean(params.get('utm_source')),
      utm_medium: clean(params.get('utm_medium')),
      utm_campaign: clean(params.get('utm_campaign')),
      // Our own pages aren't a referral source.
      referrer: referrer && !referrer.includes(window.location.host) ? referrer : null,
      device_type: deviceType(),
      first_seen_at: new Date().toISOString(),
    }

    window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution))
  } catch {
    // Private browsing, storage disabled — attribution is never worth an error.
  }
}

/** What was captured on arrival, if anything. */
export function readAttribution(): Attribution | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_KEY)
    return raw ? JSON.parse(raw) as Attribution : null
  } catch {
    return null
  }
}
