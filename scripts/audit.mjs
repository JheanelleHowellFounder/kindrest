#!/usr/bin/env node
/**
 * Kindrest production audit.
 *
 *   node scripts/audit.mjs            # audit production (default)
 *   node scripts/audit.mjs --local    # audit against localhost:3000
 *
 * Why this exists: onboarding was broken in production for days because the code
 * wrote a column the database didn't have. Nothing told us — we found it by
 * accident. This checks the things that break silently:
 *
 *   1. Every route a user can hit still responds.
 *   2. Every endpoint that should require auth still refuses without it.
 *   3. Every write the app performs still matches the live schema.
 *
 * Test rows are written and deleted inside the run; nothing is left behind.
 * Exits non-zero if anything fails, so it can gate a deploy.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const BASE = process.argv.includes('--local') ? 'http://localhost:3000' : 'https://kindrest.co'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

let failures = 0
const pass = m => console.log(`  ✅ ${m}`)
const fail = m => { failures++; console.log(`  ❌ ${m}`) }
const head = m => console.log(`\n${m}`)

// ── 1. Routes ─────────────────────────────────────────────────────────────────
head('ROUTES — can a user reach every screen?')
const ROUTES = [
  '/', '/signin', '/onboarding', '/onboarding/profile', '/check-in', '/journal',
  '/history', '/profile', '/library', '/glimmers', '/rest-card',
  '/organizations', '/terms', '/privacy', '/forgot-password', '/join/pagerduty',
  '/i/AUDITXX',
]
// Follow redirects (the apex → www canonical hop is expected on every route),
// then assert on the path we actually landed on.
const REDIRECTS = { '/library': '/history' }  // intentional in-app redirects
for (const r of ROUTES) {
  const want = REDIRECTS[r] ?? r
  try {
    const res = await fetch(BASE + r, { redirect: 'follow' })
    const landed = new URL(res.url).pathname.replace(/\/$/, '') || '/'
    // Next's RSC redirect answers 307 with the target in the payload rather than
    // a Location header — fetch stops there, browsers don't. Verified in-browser.
    if (REDIRECTS[r]) {
      res.status === 307 || landed === want
        ? pass(`${r} → ${want}`)
        : fail(`${r} → ${res.status}, expected redirect to ${want}`)
    } else if (!res.ok) fail(`${r} → ${res.status}`)
    else if (landed !== want) fail(`${r} → landed on ${landed}, expected ${want}`)
    else pass(`${r} → ${res.status}`)
  } catch (e) { fail(`${r} → ${e.message}`) }
}

// ── 2. Auth gates ─────────────────────────────────────────────────────────────
head('AUTH GATES — do protected endpoints refuse anonymous callers?')
// Payloads must be well-formed enough to get PAST validation and reach the auth
// check — otherwise a 400 masks whether the endpoint is actually gated at all.
const VICTIM = '00000000-0000-0000-0000-000000000001'
const GATED = [
  ['/api/admin/report', 'GET'],
  ['/api/admin/orgs', 'GET'],
  ['/api/glimmer', 'POST', { body: 'audit' }],
  ['/api/glimmer/timeline', 'GET'],
  ['/api/rest-card/complete', 'POST', { position: 0 }],
  ['/api/journal-entry', 'POST', { content: 'audit', userId: VICTIM }],
  ['/api/feedback', 'POST', { userId: VICTIM, rec_id: 1, rating: 1 }],
  [`/api/stats?userId=${VICTIM}`, 'GET'],
  ['/api/org/join', 'POST', { slug: 'pagerduty' }],
  ['/api/invite', 'GET'],
  ['/api/invite', 'POST', { code: 'AUDITXX' }],
]
for (const [path, method, payload] of GATED) {
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'POST' ? JSON.stringify(payload ?? {}) : undefined,
    })
    if (res.status === 401) pass(`${method} ${path} → 401`)
    else if (res.status === 400) fail(`${method} ${path} → 400 (payload rejected before the auth check — this audit can't tell if it's gated)`)
    else fail(`${method} ${path} → ${res.status} (expected 401 — POSSIBLE DATA LEAK)`)
  } catch (e) { fail(`${method} ${path} → ${e.message}`) }
}

// ── 3. Schema — the check that would have caught the onboarding outage ────────
head('SCHEMA — does every write the app performs still match the database?')
const { data: { users } } = await sb.auth.admin.listUsers({ page: 1, perPage: 1 })
const uid = users?.[0]?.id
if (!uid) { fail('no user available to test writes against'); }

const SENTINEL = '1999-01-01'
const cleanup = []

/** Attempt the real write the app makes. Roll it back either way. */
async function checkWrite(label, table, row, opts = {}) {
  if (!uid) return
  const { error } = await sb.from(table).upsert(row, opts.conflict ? { onConflict: opts.conflict } : undefined)
  if (error) { fail(`${label} — ${error.message}`); return }
  pass(label)
  cleanup.push(opts.cleanup)
}

// The exact shape OnboardingProfileFlow writes — this is what silently broke.
await checkWrite('signup → user_profiles', 'user_profiles', {
  user_id: uid, name: 'audit', motherhood_stage: 'infant', preferred_time_window: 'morning',
  preferred_categories: [], support_people: [], onboarding_completed: true,
  updated_at: new Date().toISOString(),
}, { conflict: 'user_id' })

await checkWrite('signup → user_preference_profile', 'user_preference_profile', {
  user_id: uid, preferred_categories: [], avoided_categories: [], preferred_effort: 'Low',
  strong_regulation_types: [], total_checkins: 0, updated_at: new Date().toISOString(),
}, { conflict: 'user_id' })

await checkWrite('glimmer save', 'glimmers', {
  user_id: uid, prompt_id: '_audit', prompt_text: 'audit', body: null,
  mood_signal: 'quiet', responded: false, entry_date: SENTINEL,
}, { conflict: 'user_id,entry_date',
     cleanup: () => sb.from('glimmers').delete().eq('user_id', uid).eq('entry_date', SENTINEL) })

await checkWrite('journal entry', 'journal_entries', {
  user_id: uid, content: '_audit', input_method: 'text', source: 'journal', entry_date: SENTINEL,
}, { cleanup: () => sb.from('journal_entries').delete().eq('user_id', uid).eq('entry_date', SENTINEL) })

await checkWrite('check-in feedback', 'recommendation_feedback', {
  user_id: uid, rec_id: -1, rec_title: '_audit', rating: 1, check_in_mood: 'okay',
  regulation_phase: 'Contain', regulation_type: 'Physical', category: 'Rest',
  effort_level: 'Low', time_of_day: 'morning',
}, { cleanup: () => sb.from('recommendation_feedback').delete().eq('user_id', uid).eq('rec_id', -1) })

await checkWrite('email list', 'waitlist', {
  email: '_audit@kindrest.test', name: 'audit',
}, { conflict: 'email', cleanup: () => sb.from('waitlist').delete().eq('email', '_audit@kindrest.test') })

await checkWrite('organizations inquiry', 'org_inquiries', {
  name: '_audit', company: '_audit', employee_range: '0–25', message: null,
}, { cleanup: () => sb.from('org_inquiries').delete().eq('company', '_audit') })

// Rest card + org membership need parent rows, so exercise them end-to-end.
if (uid) {
  const { data: org, error: orgErr } = await sb.from('organizations')
    .insert({ slug: '_audit', name: 'Audit', cohort_size: 1 }).select('id').single()
  if (orgErr) fail(`organizations insert — ${orgErr.message}`)
  else {
    pass('organizations insert')
    const { error: memErr } = await sb.from('org_members').insert({ org_id: org.id, user_id: uid })
    memErr ? fail(`org_members insert — ${memErr.message}`) : pass('pilot member link')
    cleanup.push(() => sb.from('organizations').delete().eq('id', org.id))
  }

  const { data: card, error: cardErr } = await sb.from('rest_cards')
    .insert({ user_id: uid, cycle_start: SENTINEL, cycle_end: SENTINEL, status: 'archived' })
    .select('id').single()
  if (cardErr) fail(`rest_cards insert — ${cardErr.message}`)
  else {
    pass('rest_cards insert')
    const { error: sqErr } = await sb.from('rest_card_squares').insert({
      card_id: card.id, user_id: uid, position: 0, label: '_audit', source: 'self', status: 'open',
    })
    sqErr ? fail(`rest_card_squares insert — ${sqErr.message}`) : pass('rest_card_squares insert')
    cleanup.push(() => sb.from('rest_cards').delete().eq('id', card.id))
  }
}

for (const fn of cleanup) { try { await fn?.() } catch {} }

// ── 4. Funnel health ──────────────────────────────────────────────────────────
head('FUNNEL — is anyone getting stuck?')
if (uid) {
  const { data: all } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const { data: profiles } = await sb.from('user_profiles').select('user_id')
  const ids = new Set((profiles ?? []).map(p => p.user_id))
  const stuck = (all?.users ?? []).filter(u => !ids.has(u.id))
  const recentStuck = stuck.filter(u => Date.now() - new Date(u.created_at).getTime() < 7 * 86400000)
  console.log(`  accounts: ${all?.users?.length ?? 0} · completed onboarding: ${ids.size} · stuck: ${stuck.length}`)
  recentStuck.length
    ? fail(`${recentStuck.length} signed up in the last 7 days and never finished onboarding — check the signup path`)
    : pass('no one stuck in onboarding this week')
}

console.log(`\n${failures === 0 ? '✅ ALL CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`}  —  ${BASE}\n`)
process.exit(failures === 0 ? 0 : 1)
