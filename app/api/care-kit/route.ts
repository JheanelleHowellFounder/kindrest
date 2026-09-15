/**
 * POST /api/care-kit
 *
 * Accepts a user's check-in state, fetches pre-filtered recommendations from
 * Airtable, scores them, and picks the one line that sits at the top of the kit.
 *
 * Request body:
 *   {
 *     mood: string                     // 'overwhelmed' | 'struggling' | 'okay' | 'good' | 'thriving'
 *     timeAvailable: string            // '2_minutes' | '5_minutes' | '10_minutes' | '15_plus_minutes'
 *     selectedIndicators: string[]     // every label she tapped, all three screens
 *     emotionalIndicators?: string[]   // just the heart-screen taps, in the order she tapped them
 *     regulationTypes: string[]        // derived types (e.g. ["Emotional", "Mental"])
 *     userId?: string                  // optional — enables personalisation
 *     excludedIds?: number[]           // shown already — skipped on "Something else"
 *   }
 *
 * Response:
 *   {
 *     recommendations: Recommendation[]  // 2 on hard days, 3 otherwise
 *     header: string                     // one hand-written line, or '' if unavailable
 *     people: Record<number, string>     // rec_id → "Maya or Tasha might be good for this."
 *   }
 *
 * ⚠️ The header used to be written by Claude on every check-in: 55–70 words that
 * restated her selections, listed the suggestions, used em dashes in every run,
 * and named her support circle only some of the time. It is now chosen from the
 * founder's "Care Kit Lines" table. Don't reintroduce a generated header here;
 * edit the table instead.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getFilteredRecommendations, getCareKitLines } from '@/lib/airtable'
import { pickTopN, getMoodPhase } from '@/lib/recommendation-engine'
import { supabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth-server'
import type { RegulationType, Recommendation } from '@/lib/types'

/** On these days she sees two cards instead of three. Choosing is its own load. */
const HARD_DAY_MOODS = new Set(['overwhelmed', 'struggling'])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      mood,
      timeAvailable,
      selectedIndicators = [],
      emotionalIndicators = [],
      regulationTypes = [],
      userId,
      excludedIds = [],
    } = body as {
      mood: string
      timeAvailable: string
      selectedIndicators: string[]
      emotionalIndicators?: string[]
      regulationTypes: RegulationType[]
      userId?: string
      excludedIds?: number[]
    }

    if (!mood || !timeAvailable) {
      return NextResponse.json({ error: 'mood and timeAvailable are required' }, { status: 400 })
    }

    // When a userId is supplied, verify the requester owns that account.
    // This prevents one user from fetching or writing data for another user's id.
    if (userId) {
      const requester = await requireUser(req)
      if (!requester || requester.id !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const regulationPhase = getMoodPhase(mood)

    // ── Step 1: Pre-filter recommendations (Option B) ────────────────────────
    const candidates = await getFilteredRecommendations({
      regulationPhase,
      regulationTypes: regulationTypes.length > 0 ? regulationTypes : undefined,
    })

    // ── Step 2: Load user feedback history for personalisation ───────────────
    let feedbackWeights: { rec_id: number; avg_rating: number; usage_count: number }[] = []
    let userPrefs: {
      preferred_categories?: string[]
      avoided_categories?: string[]
      preferred_effort?: string
      total_checkins?: number
    } = {}
    let recentlyUsedIds: number[] = []
    let supportPeople: { name: string; relationship: string }[] = []
    let journalContext: { recurring_triggers?: string[]; what_helps?: string[] } = {}

    if (userId && supabaseAdmin) {
      // Aggregate past feedback for this user
      const { data: feedback } = await supabaseAdmin
        .from('recommendation_feedback')
        .select('rec_id, rating')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (feedback && feedback.length > 0) {
        const weightMap = new Map<number, { sum: number; count: number }>()
        feedback.forEach(f => {
          const existing = weightMap.get(f.rec_id) ?? { sum: 0, count: 0 }
          weightMap.set(f.rec_id, { sum: existing.sum + f.rating, count: existing.count + 1 })
        })
        feedbackWeights = Array.from(weightMap.entries()).map(([rec_id, { sum, count }]) => ({
          rec_id,
          avg_rating: sum / count,
          usage_count: count,
        }))

        // Recently used (last 15 unique rec ids)
        const seen = new Set<number>()
        for (const f of feedback) {
          if (seen.size >= 15) break
          seen.add(f.rec_id)
        }
        recentlyUsedIds = Array.from(seen)
      }

      // Preference profile, support circle, and journal profile in parallel
      const [{ data: profile }, { data: userProfile }, { data: journalProfile }] = await Promise.all([
        supabaseAdmin
          .from('user_preference_profile')
          .select('preferred_categories, avoided_categories, preferred_effort, strong_regulation_types, total_checkins')
          .eq('user_id', userId)
          .single(),
        supabaseAdmin
          .from('user_profiles')
          .select('support_people')
          .eq('user_id', userId)
          .single(),
        supabaseAdmin
          .from('journal_profile')
          .select('what_helps, recurring_triggers')
          .eq('user_id', userId)
          .single(),
      ])

      if (profile) userPrefs = profile
      if (userProfile?.support_people?.length) {
        supportPeople = userProfile.support_people.filter(
          (p: { name: string; relationship: string }) => p.name?.trim()
        )
      }
      if (journalProfile) journalContext = journalProfile
    }

    // ── Step 3: Score and pick — 2 on hard days, 3 otherwise ─────────────────
    // On "Something else" requests, filter out currently-shown recs so she
    // always gets fresh suggestions. If the pool shrinks too far, fall back to
    // the full candidate set (the scoring novelty penalty still applies).
    const count = HARD_DAY_MOODS.has(mood.toLowerCase()) ? 2 : 3
    const excludedSet     = new Set(excludedIds)
    const freshCandidates = candidates.filter(c => !excludedSet.has(c.rec_id))
    const scoringPool     = freshCandidates.length >= count ? freshCandidates : candidates

    const mergedRecentIds = [
      ...excludedIds,
      ...recentlyUsedIds.filter(id => !excludedSet.has(id)),
    ]

    const recommendations = pickTopN(
      mood,
      timeAvailable as any,
      scoringPool,
      count,
      feedbackWeights,
      mergedRecentIds,
      userPrefs,
      { whatHelps: journalContext.what_helps, recurringTriggers: journalContext.recurring_triggers }
    )

    // ── Step 4: The line at the top, and who to reach out to ─────────────────
    const header = await chooseHeader(mood, emotionalIndicators)
    const people = peopleLines(recommendations, supportPeople, userPrefs.total_checkins ?? 0)
    const showedUp = HARD_DAY_MOODS.has(mood.toLowerCase()) ? await chooseShowedUp() : null

    // ── Step 5: Increment check-in count ────────────────────────────────────
    // A check-in = a care kit being generated, regardless of whether the user
    // rates any recommendations. This gives an accurate session count.
    if (userId && supabaseAdmin && recommendations.length > 0) {
      const { data: existing } = await supabaseAdmin
        .from('user_preference_profile')
        .select('total_checkins')
        .eq('user_id', userId)
        .single()

      if (existing) {
        await supabaseAdmin
          .from('user_preference_profile')
          .update({
            total_checkins: (existing.total_checkins ?? 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
      } else {
        await supabaseAdmin
          .from('user_preference_profile')
          .insert({ user_id: userId, total_checkins: 1, updated_at: new Date().toISOString() })
      }

      // Stamp her first check-in, once. Activation in the growth table is
      // "first check-in within 48h of signup", and this is the only record of
      // when that happened — recommendation_feedback only exists if she rates
      // something, which about a third of users never do.
      // Non-fatal, and a no-op where the growth migration hasn't been run.
      try {
        await supabaseAdmin
          .from('user_profiles')
          .update({ first_checkin_at: new Date().toISOString() })
          .eq('user_id', userId)
          .is('first_checkin_at', null)
      } catch { /* never let instrumentation break a care kit */ }
    }

    // ── Step 6: Store selected indicators for pattern tracking ──────────────
    if (userId && supabaseAdmin && selectedIndicators.length > 0) {
      try {
        await supabaseAdmin
          .from('user_preference_profile')
          .upsert(
            { user_id: userId, recent_indicators: selectedIndicators, updated_at: new Date().toISOString() },
            { onConflict: 'user_id', ignoreDuplicates: false }
          )
      } catch {
        // Non-fatal — column may not exist yet until migration is run
      }
    }

    return NextResponse.json({ recommendations, header, people, showedUp })
  } catch (err) {
    console.error('[care-kit] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * The line at the top of her kit.
 *
 * If she tapped something on the heart screen, respond to that, taking the
 * first heart option she tapped that has an active row. Otherwise rotate
 * through the lines for her mood.
 *
 * Responds to what she's feeling rather than repeating what she selected.
 * Returns '' if the table is unreachable or has nothing active for her mood:
 * the page then shows "Your care kit" with no line under it, which reads fine,
 * and the error is logged so a missing line never goes unnoticed.
 */
async function chooseHeader(mood: string, heartTaps: string[]): Promise<string> {
  try {
    const lines = (await getCareKitLines())
      .filter(l => l.active && l.mood.toLowerCase() === mood.toLowerCase())

    for (const tap of heartTaps) {
      const hit = lines.find(l => l.type === 'heart' && l.option === tap)
      if (hit) return hit.text
    }

    const moodLines = lines.filter(l => l.type === 'mood')
    if (moodLines.length > 0) return moodLines[Math.floor(Math.random() * moodLines.length)].text

    console.error(`[care-kit] no active header lines for mood "${mood}"`)
  } catch (err) {
    console.error('[care-kit] header lines unavailable:', err instanceof Error ? err.message : err)
  }
  return ''
}

/**
 * On a hard day, the words for two moments: when she taps Done, and when she
 * heads home. One line of each, rotating.
 *
 * Hard days only. Checking in while overwhelmed is itself her choosing herself,
 * and saying so on a good day would ring hollow. No counts, no streaks: the
 * product removed points on purpose, and this must not turn into them.
 *
 * Returns null if neither is available, and the page simply skips the moments.
 */
async function chooseShowedUp(): Promise<{ done: string; leaving: string } | null> {
  try {
    const lines = (await getCareKitLines()).filter(l => l.active)
    const pick = (type: 'done' | 'leaving') => {
      const pool = lines.filter(l => l.type === type)
      return pool.length ? pool[Math.floor(Math.random() * pool.length)].text : ''
    }
    const done = pick('done')
    const leaving = pick('leaving')
    return done || leaving ? { done, leaving } : null
  } catch (err) {
    console.error('[care-kit] hard-day lines unavailable:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * "Maya or Tasha might be good for this." on every card that involves reaching
 * out to someone.
 *
 * Two names, rotating with each check-in, so it doesn't settle on one person.
 * Relationship can't be used to choose: nobody has filled in "best for", and
 * choosing by label alone picked the husband 4 times out of 5, which could land
 * badly for a mother whose partner is part of what's heavy.
 */
function peopleLines(
  recs: Recommendation[],
  circle: { name: string }[],
  rotation: number,
): Record<number, string> {
  const names = circle.map(p => p.name.trim()).filter(Boolean)
  if (names.length === 0) return {}

  const line = names.length === 1
    ? `${names[0]} might be good for this.`
    : `${names[rotation % names.length]} or ${names[(rotation + 1) % names.length]} might be good for this.`

  return Object.fromEntries(
    recs.filter(r => r.category === 'Connection').map(r => [r.rec_id, line])
  )
}
