/**
 * /api/admin/growth — the numbers behind /admin/growth.
 *
 * All aggregation happens here, on the server. The page renders the rows as a
 * plain table and computes nothing.
 *
 * Definitions, since each was a judgement call:
 *  - **Week** starts Monday, from the account's creation date.
 *  - **Activated** = first check-in within 48h of signup. A check-in is a care
 *    kit being generated (`first_checkin_at`), falling back to her earliest
 *    rating where that predates the column — about a quarter of users check in
 *    and never rate, so ratings alone undercount.
 *  - **Returned** = any check-in, glimmer, or journal entry during the calendar
 *    week *after* the week she signed up.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ADMIN_EMAILS } from '@/lib/admin'
import { isMissingColumn } from '@/lib/pg-errors'

export const dynamic = 'force-dynamic'

async function requireAdmin(req: NextRequest) {
  if (!supabaseAdmin) return null
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user || !ADMIN_EMAILS.includes(user.email ?? '')) return null
  return user
}

/** Monday 00:00 UTC of the week containing `d`. */
function weekStart(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const shift = (x.getUTCDay() + 6) % 7          // Sunday(0) → 6, Monday(1) → 0
  x.setUTCDate(x.getUTCDate() - shift)
  return x.toISOString().slice(0, 10)
}

function addDays(iso: string, n: number): Date {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d
}

const DAY = 86_400_000

export interface WeekRow {
  week: string
  signups: number
  activated: number
  activationRate: string
  returned: number
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const sb = supabaseAdmin!

  // ── Accounts ───────────────────────────────────────────────────────────────
  const users: { id: string; created_at: string }[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 })
    const batch = data?.users ?? []
    if (error) break
    users.push(...batch.map(u => ({ id: u.id, created_at: u.created_at })))
    if (batch.length < 1000) break
  }

  // ── Profiles, which carry attribution and the first check-in ───────────────
  let { data: profiles, error: profErr } = await sb
    .from('user_profiles')
    .select('user_id, utm_source, heard_about_us, first_checkin_at')

  // The growth migration hasn't been run — everything else still works.
  const needsMigration = isMissingColumn(profErr)
  if (needsMigration) {
    ;({ data: profiles } = await sb.from('user_profiles').select('user_id'))
  }

  type Profile = { user_id: string; utm_source?: string | null; heard_about_us?: string | null; first_checkin_at?: string | null }
  const byUser = new Map<string, Profile>()
  for (const p of (profiles ?? []) as Profile[]) byUser.set(p.user_id, p)

  // ── Activity: earliest rating, plus everything that counts as "returned" ───
  const { data: feedback } = await sb.from('recommendation_feedback').select('user_id, created_at')
  const { data: glimmers } = await sb.from('glimmers').select('user_id, entry_date')
  const { data: journal }  = await sb.from('journal_entries').select('user_id, entry_date')

  const firstRating = new Map<string, number>()
  const activity = new Map<string, number[]>()          // user → activity timestamps

  const note = (uid: string, ms: number) => {
    const list = activity.get(uid)
    if (list) list.push(ms); else activity.set(uid, [ms])
  }

  for (const f of feedback ?? []) {
    if (!f.created_at) continue
    const ms = new Date(f.created_at).getTime()
    note(f.user_id, ms)
    const prev = firstRating.get(f.user_id)
    if (prev === undefined || ms < prev) firstRating.set(f.user_id, ms)
  }
  for (const g of glimmers ?? []) if (g.entry_date) note(g.user_id, new Date(g.entry_date + 'T12:00:00Z').getTime())
  for (const j of journal  ?? []) if (j.entry_date) note(j.user_id, new Date(j.entry_date + 'T12:00:00Z').getTime())

  /** When she first checked in, by the best evidence available. */
  function firstCheckIn(uid: string): number | null {
    const stamped = byUser.get(uid)?.first_checkin_at
    const a = stamped ? new Date(stamped).getTime() : null
    const b = firstRating.get(uid) ?? null
    if (a !== null && b !== null) return Math.min(a, b)
    return a ?? b
  }

  // ── One row per signup week ────────────────────────────────────────────────
  const weeks = new Map<string, { signups: number; activated: number; returned: number }>()

  for (const u of users) {
    const signedUp = new Date(u.created_at)
    const wk = weekStart(signedUp)
    const row = weeks.get(wk) ?? { signups: 0, activated: 0, returned: 0 }
    row.signups++

    const first = firstCheckIn(u.id)
    if (first !== null && first - signedUp.getTime() <= 2 * DAY) row.activated++

    // Any activity inside the following calendar week.
    const nextFrom = addDays(wk, 7).getTime()
    const nextTo = addDays(wk, 14).getTime()
    if ((activity.get(u.id) ?? []).some(t => t >= nextFrom && t < nextTo)) row.returned++

    weeks.set(wk, row)
  }

  const weekRows: WeekRow[] = Array.from(weeks.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))      // newest first
    .map(([week, r]) => ({
      week,
      signups: r.signups,
      activated: r.activated,
      activationRate: r.signups ? `${Math.round((r.activated / r.signups) * 100)}%` : '—',
      returned: r.returned,
    }))

  // ── Counts by source ───────────────────────────────────────────────────────
  function tally(pick: (p: Profile) => string | null | undefined) {
    const counts = new Map<string, number>()
    for (const u of users) {
      const p = byUser.get(u.id)
      const key = (p && pick(p)) || 'Unknown'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ label, count }))
  }

  return NextResponse.json({
    needsMigration,
    totalSignups: users.length,
    weeks: weekRows,
    byUtmSource: tally(p => p.utm_source),
    byHeardAbout: tally(p => p.heard_about_us),
  })
}
