/**
 * GET /api/stats?userId=demo-user-001
 *
 * Returns live wellness stats for a user, derived from Supabase:
 *   - total check-ins
 *   - top techniques (most saved/completed recs)
 *   - recent history (last 20 feedback events)
 *   - saved recommendations (rating = 2)
 *   - most common mood
 *   - active days (for calendar)
 *   - preferred categories from profile
 *
 * Check-ins are counted from the `checkins` table: one row per time she went
 * through the check-in process, however many times she tapped "Something
 * else", and whether or not she rated anything. They used to be inferred from
 * ratings, so a mother who checked in without rating saw nothing here at all.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth-server'
import { dayKey, daysAgoKey, type Zone } from '@/lib/days'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  // A mom's check-in stats and mood history are hers alone — verify the
  // caller is actually signed in as the user they're asking about.
  const requester = await requireUser(req)
  if (!requester || requester.id !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Fetch user preference profile ─────────────────────────────────────────
  const { data: profile } = await supabaseAdmin
    .from('user_preference_profile')
    .select('preferred_categories, avoided_categories, total_checkins, motherhood_stage, updated_at, timezone')
    .eq('user_id', userId)
    .single()

  // ── Fetch raw feedback history ────────────────────────────────────────────
  const { data: feedback } = await supabaseAdmin
    .from('recommendation_feedback')
    .select('rec_id, rec_title, rating, check_in_mood, category, effort_level, regulation_type, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200)

  // ── Check-ins ─────────────────────────────────────────────────────────────
  // Before supabase/checkins.sql is run the table is missing; fall back to the
  // old inference (days with a rating) so nothing goes blank.
  const { data: checkinRows, error: checkinErr } = await supabaseAdmin
    .from('checkins')
    .select('created_at, mood')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(2000)
  const haveCheckinTable = !checkinErr

  // ── Glimmers and journal entries ──────────────────────────────────────────
  // Insights used to count check-ins only, so a mother answering the daily
  // question every day saw an empty page — the main loop contributed nothing
  // to her sense of showing up.
  const { data: glimmerRows } = await supabaseAdmin
    .from('glimmers')
    .select('entry_date, responded, body')
    .eq('user_id', userId)
    .order('entry_date', { ascending: false })
    .limit(400)

  const { data: journalRows } = await supabaseAdmin
    .from('journal_entries')
    .select('entry_date')
    .eq('user_id', userId)
    .order('entry_date', { ascending: false })
    .limit(400)

  // Her day, not the server's. Null timezone falls back to UTC, which is the
  // old behaviour exactly — nothing changes for a mother we have not learned
  // a zone for yet.
  const zone: Zone = (profile?.timezone as string | null) ?? null
  const dayOf = (iso: string) => dayKey(iso, zone)
  const weekAgo = daysAgoKey(7, zone)

  // Every moment she checked in: the real records, plus any rating (a rating
  // always happens inside a check-in, so it can only add days, never inflate).
  const checkinStamps = [
    ...(checkinRows ?? []).map(c => c.created_at as string),
    ...(feedback ?? []).map(f => f.created_at as string),
  ].filter(Boolean)

  const glimmerDays = new Set((glimmerRows ?? []).map(g => g.entry_date).filter(Boolean))
  const journalDays = new Set((journalRows ?? []).map(j => j.entry_date).filter(Boolean))
  const checkinDays = new Set(checkinStamps.map(dayOf))

  // TIMES she checked in, not days: two check-ins on one day are two.
  const ratingDayCount = new Set((feedback ?? []).map(f => dayOf(f.created_at))).size
  const checkinsTotal = haveCheckinTable ? (checkinRows ?? []).length : ratingDayCount
  const checkinsThisWeek = haveCheckinTable
    ? (checkinRows ?? []).filter(c => dayOf(c.created_at) >= weekAgo).length
    : new Set((feedback ?? []).map(f => dayOf(f.created_at)).filter(d => d >= weekAgo)).size

  const showingUp = {
    glimmersThisWeek: Array.from(glimmerDays).filter(d => d >= weekAgo).length,
    journalThisWeek:  Array.from(journalDays).filter(d => d >= weekAgo).length,
    checkinsThisWeek,
    glimmersTotal: glimmerDays.size,
    journalTotal:  journalDays.size,
    checkinsTotal,
    // Any day she did any one of the three. This is the honest "you showed up".
    daysThisWeek: new Set(
      [...Array.from(glimmerDays), ...Array.from(journalDays), ...Array.from(checkinDays)]
        .filter(d => d >= weekAgo)
    ).size,
    daysTotal: new Set(
      [...Array.from(glimmerDays), ...Array.from(journalDays), ...Array.from(checkinDays)]
    ).size,
  }

  // ── All check-in days (for the multi-month calendar) ─────────────────────
  // Noon UTC, not midnight: a date rendered back in her timezone must not slip
  // to the previous day, which midnight does for anyone west of Greenwich.
  const activeDays = Array.from(new Set(checkinStamps.map(dayOf)))
    .map(d => new Date(`${d}T12:00:00Z`).toISOString())

  // ── Streak: consecutive days with check-ins ending today/yesterday ────────
  // Compared as day keys in her timezone, so a 9pm check-in counts for the
  // evening she did it rather than for tomorrow.
  const distinctDays = Array.from(new Set(checkinStamps.map(dayOf))).sort().reverse()

  let streakDays = 0
  const todayStr      = daysAgoKey(0, zone)
  const yesterdayStr  = daysAgoKey(1, zone)
  const twoDaysAgoStr = daysAgoKey(2, zone)
  const mostRecent    = distinctDays[0]

  // 2-day grace window: streak stays alive if last check-in was today, yesterday, or 2 days ago
  if (mostRecent === todayStr || mostRecent === yesterdayStr || mostRecent === twoDaysAgoStr) {
    let offset = mostRecent === todayStr ? 0 : mostRecent === yesterdayStr ? 1 : 2
    for (const d of distinctDays) {
      if (d === daysAgoKey(offset, zone)) {
        streakDays++
        offset++
      } else {
        break
      }
    }
  }


  // ── Mood series: one point per day she told us how she was ───────────────
  //
  // Built from `checkins.mood`, not from ratings. The chart used to plot
  // `recommendation_feedback.check_in_mood`, a copy taken when she tapped Done
  // or Save — so a mother who checked in Overwhelmed and could not manage
  // anything else had no point on the graph of her own mood. She is exactly
  // who it is for.
  //
  // Ratings still fill in days from before the checkins table existed, where
  // they are the only record of a mood there is.
  const MOOD_SCORE: Record<string, number> = {
    overwhelmed: 1, struggling: 1.5, okay: 2.5, good: 3.5, thriving: 4,
  }

  const moodByDay = new Map<string, number>()
  // Oldest first in each pass, so the last mood of a day is the one kept —
  // if she checked in twice, the later one is the more current truth.
  for (const f of [...(feedback ?? [])].reverse()) {
    const m = (f.check_in_mood ?? '').toLowerCase()
    if (m in MOOD_SCORE) moodByDay.set(dayOf(f.created_at), MOOD_SCORE[m])
  }
  // Check-ins last so they win wherever both exist.
  for (const c of [...(checkinRows ?? [])].reverse()) {
    const m = ((c as { mood?: string | null }).mood ?? '').toLowerCase()
    if (m in MOOD_SCORE) moodByDay.set(dayOf(c.created_at), MOOD_SCORE[m])
  }

  const moodSeries = Array.from(moodByDay.entries())
    .map(([day, score]) => ({ day, score }))
    .sort((a, b) => a.day.localeCompare(b.day))


  // ── Done events: the raw record behind "what's been working" ─────────────
  //
  // Sent as events rather than a ranked list so the History range toggle can
  // drive this card and the mood chart from one source. The old ranking was a
  // lifetime cumulative count with no window at all, which froze: a technique
  // last touched in June outranked things done last week, and nothing new
  // could ever accumulate enough to displace it.
  //
  // Rating 3 only. Rating 2 is "saved for later", and a card headed "what's
  // been working" should mean she actually did it.
  const doneEvents = (feedback ?? [])
    .filter(f => f.rating === 3 && f.rec_title)
    .map(f => ({
      rec_id:     f.rec_id,
      title:      f.rec_title,
      category:   f.category ?? '',
      // What kind of thing it is and what it costs her — the two facts that
      // help her choose one now. A count and a date only say what she did.
      effort:     (f.effort_level as string | null) ?? null,
      created_at: f.created_at,
    }))

  const totalCheckins = haveCheckinTable
    ? checkinsTotal
    : (profile?.total_checkins ?? Math.ceil((feedback ?? []).length / 3))

  // No ratings yet. She may still have checked in — before, this returned zero
  // check-ins and an empty calendar for exactly those mothers.
  if (!feedback || feedback.length === 0) {
    return NextResponse.json({
      showingUp,
      totalCheckins,
      topTechniques: [],
      recentHistory: [],
      savedRecs: [],
      commonMood: null,
      activeDays,
      moodSeries,
      doneEvents,
      preferredCategories: profile?.preferred_categories ?? [],
      motherhoodStage: profile?.motherhood_stage ?? null,
      streakDays,
    })
  }

  // ── Top techniques: recs rated 2 or 3, ranked by frequency ───────────────
  const techMap = new Map<string, { rec_id: number; title: string; category: string; liked: number; total: number; lastUsed: string }>()
  for (const f of feedback) {
    if (!f.rec_title) continue
    const existing = techMap.get(f.rec_title) ?? {
      rec_id: f.rec_id,
      title: f.rec_title,
      category: f.category ?? '',
      liked: 0,
      total: 0,
      lastUsed: f.created_at,
    }
    existing.total++
    if (f.rating >= 2) existing.liked++
    techMap.set(f.rec_title, existing)
  }

  const topTechniques = Array.from(techMap.values())
    .filter(t => t.liked > 0)
    .sort((a, b) => b.liked - a.liked || b.total - a.total)
    .slice(0, 5)
    .map(t => ({
      rec_id: t.rec_id,
      title: t.title,
      category: t.category,
      usedCount: t.total,
      likedCount: t.liked,
      lastUsed: t.lastUsed,
    }))

  // ── Saved recs (rating = 2, deduplicated by rec_title) ────────────────────
  const savedSeen = new Set<string>()
  const savedRecs = feedback
    .filter(f => f.rating === 2 && f.rec_title && !savedSeen.has(f.rec_title) && savedSeen.add(f.rec_title!))
    .slice(0, 10)
    .map(f => ({
      rec_id: f.rec_id,
      title: f.rec_title,
      category: f.category,
      created_at: f.created_at,
    }))

  // ── Recent history (last 20 events, grouped display) ─────────────────────
  const recentHistory = feedback.slice(0, 20).map(f => ({
    rec_id: f.rec_id,
    title: f.rec_title,
    rating: f.rating,
    mood: f.check_in_mood,
    category: f.category,
    created_at: f.created_at,
  }))

  // ── Most common mood ──────────────────────────────────────────────────────
  const moodCounts = new Map<string, number>()
  for (const f of feedback) {
    if (f.check_in_mood) {
      moodCounts.set(f.check_in_mood, (moodCounts.get(f.check_in_mood) ?? 0) + 1)
    }
  }
  const commonMood = Array.from(moodCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  return NextResponse.json({
    showingUp,
    totalCheckins,
    topTechniques,
    recentHistory,
    savedRecs,
    commonMood,
    activeDays,
    moodSeries,
    doneEvents,
    preferredCategories: profile?.preferred_categories ?? [],
    motherhoodStage: profile?.motherhood_stage ?? null,
    streakDays,
  })
}
