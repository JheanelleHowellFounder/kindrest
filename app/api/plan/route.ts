/**
 * GET /api/plan
 *
 * Her care plan: what support looks like for her, right now, without having to
 * work it out herself.
 *
 * The point is to remove a decision, not to add a screen. A mother who has just
 * joined gets something built from the four things she told us at signup. A
 * mother who has been here a while gets something built from what she has
 * actually come back to.
 *
 * Nothing here is new intelligence — it reuses the same scoring engine as the
 * care kit, and the same feedback history. The difference is that it needs no
 * check-in, and it is a page she can return to.
 *
 * Response:
 *   {
 *     basis: 'onboarding' | 'history'   // what it was built from
 *     picks: Recommendation[]           // three things, lead first
 *     worked: { title, times }[]        // what she has marked Done or Saved before
 *     checkins: number                  // how many times she has been through a check-in
 *   }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getFilteredRecommendations } from '@/lib/airtable'
import { pickTopN, getMoodPhase } from '@/lib/recommendation-engine'
import { supabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth-server'
import type { TimeAvailable } from '@/lib/types'

/** Values the scoring engine understands. Anything else is ignored. */
const VALID_TIME: TimeAvailable[] = ['2_minutes', '5_minutes', '10_minutes', '15_plus_minutes']

/** A check-in older than this says little about how she is today. */
const MOOD_FRESH_DAYS = 14

export async function GET(req: NextRequest) {
  const requester = await requireUser(req)
  if (!requester || !supabaseAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const uid = requester.id

  const [{ data: profile }, { data: prefs }, { data: feedback }, { data: checkins }] = await Promise.all([
    supabaseAdmin.from('user_profiles')
      .select('motherhood_stage, preferred_time_window, preferred_categories')
      .eq('user_id', uid).maybeSingle(),
    supabaseAdmin.from('user_preference_profile')
      .select('preferred_categories, avoided_categories, preferred_effort')
      .eq('user_id', uid).maybeSingle(),
    supabaseAdmin.from('recommendation_feedback')
      .select('rec_id, rec_title, rating, created_at')
      .eq('user_id', uid).order('created_at', { ascending: false }).limit(100),
    supabaseAdmin.from('checkins')
      .select('mood, created_at')
      .eq('user_id', uid).order('created_at', { ascending: false }).limit(50),
  ])

  // ── How she is, as best we honestly know ─────────────────────────────────
  // Her last check-in, if it is recent enough to still mean something.
  const latest = (checkins ?? []).find(c => c.mood)
  const fresh = latest && Date.now() - new Date(latest.created_at).getTime() < MOOD_FRESH_DAYS * 86_400_000
  const mood = fresh ? (latest!.mood as string) : 'okay'

  // Her usual window, from onboarding. Five minutes is the middle option, and
  // the safest assumption for someone we know nothing else about.
  const stored = profile?.preferred_time_window as TimeAvailable | undefined
  const timeAvailable: TimeAvailable = stored && VALID_TIME.includes(stored) ? stored : '5_minutes'

  // ── What she has responded to before ─────────────────────────────────────
  const weightMap = new Map<number, { sum: number; count: number }>()
  for (const f of feedback ?? []) {
    const cur = weightMap.get(f.rec_id) ?? { sum: 0, count: 0 }
    weightMap.set(f.rec_id, { sum: cur.sum + f.rating, count: cur.count + 1 })
  }
  const feedbackWeights = Array.from(weightMap.entries())
    .map(([rec_id, { sum, count }]) => ({ rec_id, avg_rating: sum / count, usage_count: count }))

  const recentlyUsedIds: number[] = []
  for (const f of feedback ?? []) {
    if (recentlyUsedIds.length >= 10) break
    if (!recentlyUsedIds.includes(f.rec_id)) recentlyUsedIds.push(f.rec_id)
  }

  // Preferences: what she said at signup, plus what her behaviour has shown.
  const userPrefs = {
    preferred_categories: [
      ...(prefs?.preferred_categories ?? []),
      ...(profile?.preferred_categories ?? []),
    ].filter((c, i, a) => a.indexOf(c) === i),
    avoided_categories: prefs?.avoided_categories ?? [],
    preferred_effort: prefs?.preferred_effort,
  }

  const candidates = await getFilteredRecommendations({ regulationPhase: getMoodPhase(mood) })
  const picks = pickTopN(mood, timeAvailable, candidates, 3, feedbackWeights, recentlyUsedIds, userPrefs)

  // ── What has already worked for her ──────────────────────────────────────
  const workedMap = new Map<string, number>()
  for (const f of feedback ?? []) {
    if (f.rating >= 2 && f.rec_title) workedMap.set(f.rec_title, (workedMap.get(f.rec_title) ?? 0) + 1)
  }
  const worked = Array.from(workedMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([title, times]) => ({ title, times }))

  return NextResponse.json({
    basis: (feedback?.length ?? 0) > 0 || (checkins?.length ?? 0) > 0 ? 'history' : 'onboarding',
    picks,
    worked,
    checkins: checkins?.length ?? 0,
  })
}
