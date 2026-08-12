import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ADMIN_EMAILS } from '@/lib/admin'
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

  // ── Mood breakdown (one per session) ──────────────────────────────────────
  const MOOD_ORDER = ['overwhelmed', 'struggling', 'okay', 'good', 'thriving']
  const moodSessionsSeen = new Set<string>()
  const moodCounts: Record<string, number> = {}
  let moodScoreTotal = 0, moodScoreCount = 0

  for (const f of feedback) {
    if (!f.check_in_mood) continue
    const key = `${f.user_id}:${f.created_at.split('T')[0]}`
    if (moodSessionsSeen.has(key)) continue
    moodSessionsSeen.add(key)
    moodCounts[f.check_in_mood] = (moodCounts[f.check_in_mood] ?? 0) + 1
    const score = MOOD_ORDER.indexOf(f.check_in_mood)
    if (score >= 0) { moodScoreTotal += score; moodScoreCount++ }
  }

  const moodBreakdown = Object.entries(moodCounts)
    .sort((a, b) => MOOD_ORDER.indexOf(a[0]) - MOOD_ORDER.indexOf(b[0]))
    .map(([mood, count]) => ({ mood, count }))

  // Average mood score → label (0=overwhelmed … 4=thriving)
  const avgMoodScore = moodScoreCount > 0 ? moodScoreTotal / moodScoreCount : null
  const avgMoodLabel = avgMoodScore === null ? null : MOOD_ORDER[Math.round(avgMoodScore)]

  // ── Mood trend: last 4 weeks, one avg score per week ─────────────────────
  const weeklyMood: { week: string; avgScore: number; count: number }[] = []
  for (let w = 3; w >= 0; w--) {
    const wStart = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000).toISOString()
    const wEnd   = new Date(now.getTime() - w       * 7 * 24 * 60 * 60 * 1000).toISOString()
    const seen   = new Set<string>()
    let total = 0, count = 0
    for (const f of feedback) {
      if (!f.check_in_mood || f.created_at < wStart || f.created_at >= wEnd) continue
      const key = `${f.user_id}:${f.created_at.split('T')[0]}`
      if (seen.has(key)) continue
      seen.add(key)
      const score = MOOD_ORDER.indexOf(f.check_in_mood)
      if (score >= 0) { total += score; count++ }
    }
    weeklyMood.push({
      week: new Date(+new Date(wEnd) - 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      avgScore: count > 0 ? Math.round((total / count) * 10) / 10 : -1,
      count,
    })
  }

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

  // ── Category breakdown ─────────────────────────────────────────────────────
  const catCounts: Record<string, number> = {}
  for (const f of feedback) {
    if (f.category) catCounts[f.category] = (catCounts[f.category] ?? 0) + 1
  }
  const categoryBreakdown = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }))

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

  return NextResponse.json({
    generatedAt: now.toISOString(),
    bingo,
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
    mood: {
      avgMoodLabel,
      avgMoodScore,
      breakdown: moodBreakdown,
      weeklyTrend: weeklyMood,
    },
    stageBreakdown,
    topRecs,
    categoryBreakdown,
    atRiskUsers,
    allUsers,
    dropOffUsers,
    cohorts,
  })
}
