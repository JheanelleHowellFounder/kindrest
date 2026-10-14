'use client'

/**
 * Tells the server which timezone she is in, so her days are hers.
 *
 * Renders nothing. Fires once per session, and only when the browser's zone
 * differs from the last one we sent — mothers move, and travel, and a stale
 * zone would file her evenings on the wrong day again.
 *
 * Every failure here is silent and harmless: without a stored zone, every date
 * falls back to UTC, which is exactly what Kindrest did before.
 */

import { useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { authedFetch } from '@/lib/api-client'

const SENT_KEY = 'kindrest-timezone-sent'

export function TimezoneSync() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    let zone: string
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return
    }
    if (!zone) return

    // Private windows and blocked site data make this throw, which must not
    // stop the send — it only means we send once more than we needed to.
    let alreadySent: string | null = null
    try { alreadySent = localStorage.getItem(SENT_KEY) } catch {}
    if (alreadySent === `${user.id}:${zone}`) return

    authedFetch('/api/timezone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: zone }),
    })
      .then(r => { if (r.ok) { try { localStorage.setItem(SENT_KEY, `${user.id}:${zone}`) } catch {} } })
      .catch(() => {})
  }, [user])

  return null
}
