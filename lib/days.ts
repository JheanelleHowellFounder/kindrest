/**
 * Which day something happened on, in her timezone rather than the server's.
 *
 * Everything in Kindrest used to be dated in UTC. For a mother east of
 * Greenwich that is sometimes wrong by a day; for a mother in the Americas it
 * is wrong every evening, which is when most journalling happens. A check-in at
 * 8pm Tuesday in New York was filed under Wednesday.
 *
 * `user_preference_profile.timezone` holds an IANA name once we have learned
 * it. Until then every function here falls back to UTC, which is exactly the
 * old behaviour — so a mother who has not opened the app since this shipped
 * sees no change rather than a broken page.
 */

/** Her own clock, or UTC when we do not know it yet. */
export type Zone = string | null | undefined

/**
 * YYYY-MM-DD for an instant, in her timezone.
 *
 * Uses `en-CA` because it formats as YYYY-MM-DD natively, which avoids
 * reassembling parts by hand and getting the padding wrong.
 */
export function dayKey(instant: string | Date, zone: Zone): string {
  const d = instant instanceof Date ? instant : new Date(instant)
  if (Number.isNaN(d.getTime())) return ''

  if (!zone) return d.toISOString().slice(0, 10)

  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d)
  } catch {
    // An unrecognised zone must never take a page down — a bad string in one
    // row would otherwise throw on every read of her history.
    return d.toISOString().slice(0, 10)
  }
}

/** Today, in her timezone. What a new entry_date should be stamped with. */
export function todayKey(zone: Zone): string {
  return dayKey(new Date(), zone)
}

/** The day key `daysAgo` days before today, in her timezone. */
export function daysAgoKey(daysAgo: number, zone: Zone): string {
  return dayKey(new Date(Date.now() - daysAgo * 86_400_000), zone)
}

/**
 * Valid IANA name, or null.
 *
 * The timezone arrives from the browser, so it is input and gets checked
 * before it is stored — a value that throws here would throw on every later
 * read of her history.
 */
export function validZone(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 64) return null
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: raw })
    return raw
  } catch {
    return null
  }
}
