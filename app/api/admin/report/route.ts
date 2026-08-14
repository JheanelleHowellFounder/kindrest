import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ADMIN_EMAILS } from '@/lib/admin'
import { isMissingTable } from '@/lib/pg-errors'
import { LINES } from '@/lib/restcard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ProfileRow {
  user_id: string
  name: string | null
  motherhood_stage: string | null
  onboarding_completed: boolean | null
  created_at: string
  signup_source?: string | null
}

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  // ── Require a valid session belonging to an admin — this route returns
  // every user's name, email, and mood/check-in history, so it must never
  // be reachable without proof of who's asking. ─────────────────────────────
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: { user: requester }, error: authError } = await supabaseAdmin.auth.getUser(token)

  if (authError || !requester || !ADMIN_EMAILS.includes(requester.email ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const startOfWeek     = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString()
  const startOfLastWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const atRiskCutoff    = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()

  // ── Auth users — paginate to get all ──────────────────────────────────────
  const authUsers: import('@supabase/supabase-js').User[] = []
  let page = 1
  while (true) {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
    if (!data?.users?.length) break
    authUsers.push(...data.users)
    if (data.users.length < 1000) break
    page++
  }

  // ── Profiles + feedback in parallel ───────────────────────────────────────
  // signup_source only exists where the Founding Moms migration has been run.
  // Ask for it, and fall back cleanly where the column isn't there — otherwise the
  // whole report silently returns zero users.
  const profilesWithSource = await supabaseAdmin
    .from('user_profiles')
    .select('user_id, name, motherhood_stage, onboarding_completed, created_at, signup_source')
    .order('created_at', { ascending: false })

  const profilesFallback = profilesWithSource.error
    ? await supabaseAdmin
        .from('user_profiles')
        .select('user_id, name, motherhood_stage, onboarding_completed, created_at')
        .order('created_at', { ascending: false })
    : null

  const [profilesResult, feedbackResult] = await Promise.all([
    Promise.resolve(profilesFallback ?? profilesWithSource),
    supabaseAdmin
      .from('recommendation_feedback')
      .select('user_id, rec_title, rating, check_in_mood, category, created_at')
      .order('created_at', { ascending: false }),
  ])

  const allProfiles = (profilesResult.data ?? []) as ProfileRow[]
  const feedback    = feedbackResult.data ?? []
  const profileIds  = new Set(allProfiles.map(p => p.user_id))

  // ── Auth lookup maps ───────────────────────────────────────────────────────
  const emailMap: Record<string, string>   = {}
  const lastSeenMap: Record<string, string> = {}
  for (const u of authUsers) {
    emailMap[u.id]   = u.email ?? '—'
    lastSeenMap[u.id] = u.last_sign_in_at ?? u.created_at
  }

  // ── Per-user activity ─────────────────────────────────────────────────────
  const userCheckinDates:  Record<string, Set<string>>                    = {}
  const userLastMood:      Record<string, string>                         = {}
  const userLastCheckin:   Record<string, string>                         = {}
  const userSessionMoods:  Record<string, { date: string; mood: string }[]> = {}

  for (const f of feedback) {
    const date = f.created_at.split('T')[0]
    if (!userCheckinDates[f.user_id]) userCheckinDates[f.user_id] = new Set()
    userCheckinDates[f.user_id].add(date)

    if (!userLastCheckin[f.user_id] || f.created_at > userLastCheckin[f.user_id]) {
      userLastCheckin[f.user_id] = f.created_at
      if (f.check_in_mood) userLastMood[f.user_id] = f.check_in_mood
    }

    if (f.check_in_mood) {
      if (!userSessionMoods[f.user_id]) userSessionMoods[f.user_id] = []
      const already = userSessionMoods[f.user_id].some(m => m.date === date)
      if (!already && userSessionMoods[f.user_id].length < 5) {
        userSessionMoods[f.user_id].push({ date, mood: f.check_in_mood })
      }
    }
  }

  // ── Build user rows ────────────────────────────────────────────────────────
  const profileUsers = allProfiles.map(p => ({
    name:          p.name ?? 'Anonymous',
    email:         emailMap[p.user_id] ?? '—',
    stage:         p.motherhood_stage ?? '—',
    joined:        p.created_at,
    lastSeen:      lastSeenMap[p.user_id] ?? p.created_at,
    completed:     p.onboarding_completed,
    authOnly:      false,
    totalCheckins: userCheckinDates[p.user_id]?.size ?? 0,
    lastCheckin:   userLastCheckin[p.user_id] ?? null,
    lastMood:      userLastMood[p.user_id] ?? null,
    recentMoods:   userSessionMoods[p.user_id] ?? [],
    signupSource:  p.signup_source ?? null,
  }))

  const dropOffUsers = authUsers
    .filter(u => !profileIds.has(u.id))
    .map(u => ({
      name:          u.user_metadata?.name ?? 'Unknown',
      email:         u.email ?? '—',
      stage:         '—',
      joined:        u.created_at,
      lastSeen:      u.last_sign_in_at ?? u.created_at,
      completed:     false,
      authOnly:      true,
      totalCheckins: 0,
      lastCheckin:   null,
      lastMood:      null,
      recentMoods:   [],
      signupSource:  null,
    }))

  const allUsers = [
    ...profileUsers,
    ...dropOffUsers,
  ].sort((a, b) => new Date(b.joined).getTime() - new Date(a.joined).getTime())

  // ── Signup metrics ─────────────────────────────────────────────────────────
  const totalSignups  = authUsers.length
  const totalInApp    = allProfiles.length
  const totalDropOff  = dropOffUsers.length
  const completedOnboarding = allProfiles.filter(p => p.onboarding_completed).length

  const newThisWeek = authUsers.filter(u => u.created_at >= startOfWeek).length
  const newLastWeek = authUsers.filter(u => u.created_at >= startOfLastWeek && u.created_at < startOfWeek).length

  // ── Engagement funnel ──────────────────────────────────────────────────────
  const everCheckedIn  = profileUsers.filter(u => u.totalCheckins >= 1).length
  const retained       = profileUsers.filter(u => u.totalCheckins >= 3).length  // 3+ sessions = retained
  const retentionRate  = totalInApp > 0 ? Math.round((retained / totalInApp) * 100) : 0
  const avgCheckins    = everCheckedIn > 0
    ? Math.round(profileUsers.filter(u => u.totalCheckins > 0).reduce((s, u) => s + u.totalCheckins, 0) / everCheckedIn * 10) / 10
    : 0

  // ── Check-in counts ────────────────────────────────────────────────────────
  const totalCheckins = Object.values(userCheckinDates).reduce((s, d) => s + d.size, 0)

  const checkinsThisWeekSet  = new Set<string>()
  const activeThisWeekUsers  = new Set<string>()
  for (const f of feedback) {
    if (f.created_at >= startOfWeek) {
      checkinsThisWeekSet.add(`${f.user_id}:${f.created_at.split('T')[0]}`)
      activeThisWeekUsers.add(f.user_id)
    }
  }
  const checkinsThisWeek = checkinsThisWeekSet.size
  const activeThisWeek   = activeThisWeekUsers.size

  // ── At-risk: in app, seen the app at some point, but not in 14+ days ───────
  const atRiskUsers = profileUsers.filter(u =>
    u.lastSeen < atRiskCutoff && u.totalCheckins > 0
  ).sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())

  // ── Stage breakdown ────────────────────────────────────────────────────────
  const stageCounts: Record<string, number> = {}
  for (const p of allProfiles) {
    const s = p.motherhood_stage ?? 'Unknown'
    stageCounts[s] = (stageCounts[s] ?? 0) + 1
  }
  const stageBreakdown = Object.entries(stageCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([stage, count]) => ({ stage, count }))

  // ── Top recs ───────────────────────────────────────────────────────────────
  const recMap: Record<string, { title: string; category: string; liked: number; skipped: number; total: number }> = {}
  for (const f of feedback) {
    if (!f.rec_title) continue
    if (!recMap[f.rec_title]) recMap[f.rec_title] = { title: f.rec_title, category: f.category ?? '', liked: 0, skipped: 0, total: 0 }
    recMap[f.rec_title].total++
    if (f.rating >= 2) recMap[f.rec_title].liked++
    if (f.rating === 1) recMap[f.rec_title].skipped++
  }
  const topRecs = Object.values(recMap)
    .filter(r => r.total > 0)
    .sort((a, b) => b.liked - a.liked)
    .slice(0, 5)

  // ── Signup source cohorts (e.g. founding_mom campaign) ─────────────────────
  const sourceGroups: Record<string, typeof profileUsers> = {}
  for (const u of profileUsers) {
    const src = u.signupSource
    if (!src) continue
    if (!sourceGroups[src]) sourceGroups[src] = []
    sourceGroups[src].push(u)
  }
  const cohorts = Object.entries(sourceGroups).map(([source, users]) => {
    const totalSignups   = users.length
    const everCheckedIn  = users.filter(u => u.totalCheckins >= 1).length
    const retained       = users.filter(u => u.totalCheckins >= 3).length
    const avgCheckins    = everCheckedIn > 0
      ? Math.round(users.filter(u => u.totalCheckins > 0).reduce((s, u) => s + u.totalCheckins, 0) / everCheckedIn * 10) / 10
      : 0
    return { source, totalSignups, everCheckedIn, retained, avgCheckins, users }
  })

  // ── Bingo: users who completed a Rest Card line ───────────────────────────
  // A line "lands" at the moment its last square is marked, so we take the latest
  // completed_at across the line. The free centre has no timestamp and is skipped.
  const bingo = { last7: 0, last14: 0, last30: 0, total: 0 }

  const { data: bingoCards } = await supabaseAdmin
    .from('rest_cards')
    .select('id, user_id')

  if (bingoCards?.length) {
    const { data: bingoSquares } = await supabaseAdmin
      .from('rest_card_squares')
      .select('card_id, position, status, completed_at')
      .eq('status', 'done')

    // card → { position → completed_at }
    const byCard = new Map<string, Map<number, string | null>>()
    for (const sq of bingoSquares ?? []) {
      if (!byCard.has(sq.card_id)) byCard.set(sq.card_id, new Map())
      byCard.get(sq.card_id)!.set(sq.position, sq.completed_at)
    }

    // user → earliest moment they ever hit a line
    const firstBingoAt = new Map<string, number>()
    for (const card of bingoCards) {
      const done = byCard.get(card.id)
      if (!done) continue
      for (const line of LINES) {
        if (!line.every(pos => done.has(pos))) continue
        const stamps = line
          .map(pos => done.get(pos))
          .filter((t): t is string => Boolean(t))
          .map(t => new Date(t).getTime())
        if (!stamps.length) continue
        const landedAt = Math.max(...stamps)
        const prev = firstBingoAt.get(card.user_id)
        if (prev === undefined || landedAt < prev) firstBingoAt.set(card.user_id, landedAt)
      }
    }

    const nowMs = now.getTime()
    const within = (days: number) =>
      Array.from(firstBingoAt.values()).filter(t => nowMs - t <= days * 86_400_000).length

    bingo.total  = firstBingoAt.size
    bingo.last7  = within(7)
    bingo.last14 = within(14)
    bingo.last30 = within(30)
  }

  // ── Kindrest @ Work cohorts ───────────────────────────────────────────────
  // Per-pilot enrollment and engagement. Empty until the organizations tables
  // are migrated and a pilot exists.
  const orgs: { name: string; slug: string; cohortSize: number | null; joined: number; everCheckedIn: number; activeThisWeek: number }[] = []

  const { data: orgRows } = await supabaseAdmin
    .from('organizations')
    .select('id, slug, name, cohort_size')
    .eq('status', 'active')

  if (orgRows?.length) {
    const { data: members } = await supabaseAdmin.from('org_members').select('org_id, user_id')
    const checkedIn = new Set(profileUsers.filter(u => u.totalCheckins > 0).map(u => u.email))
    void checkedIn
    const byUserCheckins = new Map(allProfiles.map(p => [p.user_id, userCheckinDates[p.user_id]?.size ?? 0]))

    for (const o of orgRows) {
      const ids = (members ?? []).filter(m => m.org_id === o.id).map(m => m.user_id)
      orgs.push({
        name: o.name,
        slug: o.slug,
        cohortSize: o.cohort_size ?? null,
        joined: ids.length,
        everCheckedIn: ids.filter(id => (byUserCheckins.get(id) ?? 0) > 0).length,
        activeThisWeek: ids.filter(id => activeThisWeekUsers.has(id)).length,
      })
    }
  }

  // ── Landing page: views, and what fraction of them became signups ─────────
  // The only place we can see the people who looked and left. Directional only:
  // the counter is public, so treat it as a trend rather than an audited number.
  const dayKey = (d: Date) => d.toISOString().slice(0, 10)
  const since = (days: number) => dayKey(new Date(now.getTime() - days * 86_400_000))

  let landing = {
    views7: 0, views30: 0,
    signups7: 0, signups30: 0,
    conversion7: null as string | null,
    conversion30: null as string | null,
    needsMigration: false,
    devices: [] as { label: string; count: number }[],
    sources: [] as { label: string; count: number }[],
    referrers: [] as { label: string; count: number }[],
    heardAbout: [] as { label: string; count: number }[],
  }

  if (supabaseAdmin) {
    const { data: views, error: viewErr } = await supabaseAdmin
      .from('landing_views')
      .select('day, views')
      .gte('day', since(30))

    if (isMissingTable(viewErr)) {
      landing.needsMigration = true
    } else {
      for (const v of views ?? []) {
        landing.views30 += v.views
        if (v.day >= since(7)) landing.views7 += v.views
      }
    }

    // Signups over the same windows, so the ratio compares like with like.
    const ms7 = now.getTime() - 7 * 86_400_000
    const ms30 = now.getTime() - 30 * 86_400_000
    for (const u of authUsers) {
      const t = new Date(u.created_at).getTime()
      if (t >= ms30) landing.signups30++
      if (t >= ms7) landing.signups7++
    }

    const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 1000) / 10}%` : null)
    landing.conversion7  = pct(landing.signups7,  landing.views7)
    landing.conversion30 = pct(landing.signups30, landing.views30)

    // Where the people who *did* sign up came from.
    const { data: attribution, error: attrErr } = await supabaseAdmin
      .from('user_profiles')
      .select('device_type, utm_source, referrer, heard_about_us')

    if (!attrErr) {
      const tally = (pick: (r: Record<string, string | null>) => string | null | undefined, blank = 'Unknown') => {
        const counts = new Map<string, number>()
        for (const row of (attribution ?? []) as Record<string, string | null>[]) {
          const key = (pick(row) || '').trim() || blank
          counts.set(key, (counts.get(key) ?? 0) + 1)
        }
        return Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .map(([label, count]) => ({ label, count }))
      }
      // Hostname only — the full URL is noise in a table.
      const host = (u: string | null | undefined) => {
        if (!u) return null
        try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u }
      }
      landing.devices    = tally(r => r.device_type)
      landing.sources    = tally(r => r.utm_source, 'Direct / none')
      landing.referrers  = tally(r => host(r.referrer), 'None')
      landing.heardAbout = tally(r => r.heard_about_us, 'Not answered')
    }
  }

  return NextResponse.json({
    generatedAt: now.toISOString(),
    landing,
    bingo,
    orgs,
    users: {
      totalSignups,
      totalInApp,
      totalDropOff,
      completedOnboarding,
      newThisWeek,
      newLastWeek,
      weekOverWeekChange: newLastWeek > 0
        ? Math.round(((newThisWeek - newLastWeek) / newLastWeek) * 100)
        : null,
    },
    funnel: {
      signedUp:     totalSignups,
      openedApp:    totalInApp,
      everCheckedIn,
      retained,
      retentionRate,
      avgCheckins,
    },
    checkins: {
      total: totalCheckins,
      thisWeek: checkinsThisWeek,
      activeUsersThisWeek: activeThisWeek,
    },
    stageBreakdown,
    topRecs,
    atRiskUsers,
    allUsers,
    dropOffUsers,
    cohorts,
  })
}
