/**
 * Who gets the daily reminder.
 *
 * The audience is derived from Kindrest accounts, never from a hand-managed
 * list. The old "Active Users" group had drifted to 56 people, only 14 of whom
 * had accounts — so a daily email claiming "you're getting this because you
 * have a Kindrest account" would have been false for most of them, and five
 * real users would have missed it entirely.
 *
 * This syncs a dedicated group to match the account list before each send.
 * New users are picked up automatically; nobody else is ever added.
 *
 * UNSUBSCRIBES ARE SACRED. Someone who opted out stays opted out, even though
 * she still has an account. The sync only ever adds people MailerLite considers
 * active, and never changes an existing subscriber's status.
 */

import { supabaseAdmin } from '@/lib/supabase'

const ML_API = 'https://connect.mailerlite.com/api'
const GROUP_NAME = 'Daily Reminder'

function ml(path: string, options: RequestInit = {}) {
  return fetch(`${ML_API}${path}`, {
    ...options,
    // Next caches fetch GETs by default, even inside a force-dynamic route.
    // Without this the sync reads a stale group and subscriber list — it once
    // looked straight past a group it had just created, then failed to recreate
    // it because the name was taken. The audience must always be read live.
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${process.env.MAILERLITE_API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
}

export interface AudienceResult {
  groupId: string | null
  /** Accounts eligible to receive it. */
  accounts: number
  /** Currently in the group and receiving. */
  subscribed: number
  added: number
  removed: number
  /** Account holders skipped because they unsubscribed. Expected, not an error. */
  optedOut: number
  errors: string[]
}

/**
 * The dedicated group, created on first run so there's nothing to set up by hand.
 * Reports why it failed rather than returning a bare null — a silent null here
 * is indistinguishable from a config problem, an outage, or a rate limit.
 */
async function getOrCreateGroup(errors: string[]): Promise<string | null> {
  if (!process.env.MAILERLITE_API_KEY) {
    errors.push('MAILERLITE_API_KEY is not set')
    return null
  }

  const res = await ml('/groups?limit=100')
  if (!res.ok) {
    errors.push(`list groups: ${res.status} ${(await res.text()).slice(0, 200)}`)
  } else {
    const groups = (await res.json())?.data ?? []
    const found = groups.find((g: { id: string; name: string }) => g.name === GROUP_NAME)
    if (found) return found.id
    errors.push(`"${GROUP_NAME}" not among ${groups.length} groups: ${groups.map((g: { name: string }) => g.name).join(', ')}`)
  }

  const made = await ml('/groups', { method: 'POST', body: JSON.stringify({ name: GROUP_NAME }) })
  if (!made.ok) {
    errors.push(`create group: ${made.status} ${(await made.text()).slice(0, 200)}`)
    return null
  }
  return (await made.json())?.data?.id ?? null
}

/**
 * Everyone with a Kindrest account.
 *
 * Deliberately not just the fully-onboarded ten: of 19 accounts, 5 started
 * onboarding and stopped and 4 never began. They all created an account, so the
 * email's "you have a Kindrest account" is true for every one of them — and the
 * people who drifted off mid-signup are exactly who a daily nudge might bring
 * back. Narrowing this to completed profiles would silently exclude half.
 */
async function accountEmails(): Promise<Set<string>> {
  const emails = new Set<string>()
  if (!supabaseAdmin) return emails

  // Paginate — listUsers caps per page, and this must not quietly truncate.
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
    const users = data?.users ?? []
    if (error) break
    for (const u of users) if (u.email) emails.add(u.email.toLowerCase())
    if (users.length < 1000) break
  }
  return emails
}

async function groupMembers(groupId: string): Promise<Map<string, string>> {
  const members = new Map<string, string>()   // email → subscriber id
  let page = 1
  // Paginate so this keeps working past the first hundred users.
  for (;;) {
    const res = await ml(`/groups/${groupId}/subscribers?limit=100&page=${page}`)
    if (!res.ok) break
    const rows = (await res.json())?.data ?? []
    for (const s of rows) members.set(s.email.toLowerCase(), s.id)
    if (rows.length < 100) break
    page++
  }
  return members
}

/**
 * Make the group match the account list. Returns what changed, so the caller can
 * report it without sending anything.
 */
export async function syncReminderAudience(): Promise<AudienceResult> {
  const result: AudienceResult = {
    groupId: null, accounts: 0, subscribed: 0, added: 0, removed: 0, optedOut: 0, errors: [],
  }

  const groupId = await getOrCreateGroup(result.errors)
  if (!groupId) return result
  result.groupId = groupId

  const accounts = await accountEmails()
  const current = await groupMembers(groupId)
  result.accounts = accounts.size

  // ── Add account holders who aren't receiving it yet ──────────────────────
  for (const email of Array.from(accounts)) {
    if (current.has(email)) continue

    const existing = await ml(`/subscribers/${encodeURIComponent(email)}`)
    if (existing.ok) {
      const sub = (await existing.json())?.data
      // She unsubscribed. Having an account doesn't undo that.
      if (sub?.status !== 'active') { result.optedOut++; continue }
      const add = await ml(`/subscribers/${sub.id}/groups/${groupId}`, { method: 'POST' })
      if (add.ok || add.status === 409) result.added++
      else result.errors.push(`add ${email}: ${add.status}`)
      continue
    }

    // Not a subscriber yet — create her directly into the group.
    const create = await ml('/subscribers', {
      method: 'POST',
      body: JSON.stringify({ email, groups: [groupId] }),
    })
    if (create.ok) result.added++
    else result.errors.push(`create ${email}: ${create.status}`)
  }

  // ── Remove anyone who no longer has an account ───────────────────────────
  for (const [email, id] of Array.from(current.entries())) {
    if (accounts.has(email)) continue
    const del = await ml(`/subscribers/${id}/groups/${groupId}`, { method: 'DELETE' })
    if (del.ok) result.removed++
    else result.errors.push(`remove ${email}: ${del.status}`)
  }

  // Counted, not re-read. MailerLite's group listing is eventually consistent —
  // straight after a sync it can still report zero, and an earlier version of
  // this gated sending on that number and would have skipped the first send.
  result.subscribed = current.size + result.added - result.removed
  return result
}
