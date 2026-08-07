/**
 * POST /api/feedback
 *
 * Called when a user taps Skip / Save / Did It on a recommendation.
 * Saves the raw event to recommendation_feedback, then recomputes
 * and upserts the user_preference_profile.
 *
 * Request body:
 *   {
 *     userId: string
 *     rec_id: number
 *     rec_title: string
 *     rating: 1 | 2 | 3          // 1=skip  2=save  3=did_it
 *     checkInMood?: string
 *     regulationPhase?: string
 *     regulationType?: string
 *     category?: string
 *     effortLevel?: string
 *   }
 *
 * Response: { ok: true }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth-server'
import { grantGems, GEM_VALUES } from '@/lib/gems'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      rec_id,
      rec_title,
      rating,
      checkInMood,
      regulationPhase,
      regulationType,
      category,
      effortLevel,
    } = body as {
      userId: string
      rec_id: number
      rec_title: string
      rating: 1 | 2 | 3
      checkInMood?: string
      regulationPhase?: string
      regulationType?: string
      category?: string
      effortLevel?: string
    }

    if (!userId || !rec_id || !rating) {
      return NextResponse.json({ error: 'userId, rec_id, and rating are required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      // Supabase not configured — acknowledge but don't fail the UX
      console.warn('[feedback] Supabase not configured, skipping persistence')
      return NextResponse.json({ ok: true, persisted: false })
    }

    // Only the real, signed-in owner of this userId may write feedback under it —
    // otherwise anyone could spoof ratings and skew another mom's recommendations.
    const requester = await requireUser(req)
    if (!requester || requester.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const timeOfDay = getTimeOfDay()

    // ── Step 1: Insert raw feedback event ────────────────────────────────────
    const { error: insertError } = await supabaseAdmin
      .from('recommendation_feedback')
      .insert({
        user_id: userId,
        rec_id,
        rec_title,
        rating,
        check_in_mood: checkInMood,
        regulation_phase: regulationPhase,
        regulation_type: regulationType,
        category,
        effort_level: effortLevel,
        time_of_day: timeOfDay,
      })

    if (insertError) {
      console.error('[feedback] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
    }

    // Reward a practice she actually did ("did it" = 3). Idempotent per rec per
    // day, so re-tapping the same practice today doesn't farm gems.
    if (rating === 3) {
      const day = new Date().toISOString().split('T')[0]
      await grantGems(userId, GEM_VALUES.practice_done, 'practice_done', 'practice', `${rec_id}-${day}`)
    }

    // ── Step 2: Recompute user preference profile ────────────────────────────
    // Pull the last 100 feedback events for this user to rebuild preferences
    const { data: history } = await supabaseAdmin
      .from('recommendation_feedback')
      .select('category, effort_level, regulation_type, rating')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (history && history.length > 0) {
      const preferred_categories = topN(
        history.filter(h => h.rating >= 2).map(h => h.category).filter(Boolean), 3
      )
      // Avoid categories by SKIP RATE (not raw count) to prevent beloved-but-frequent
      // categories from being falsely flagged after occasional skips.
      // Minimum 3 exposures required before a category can be marked avoided.
      const avoided_categories = topNBySkipRate(history, 3)
      const preferred_effort = topN(
        history.filter(h => h.rating >= 2).map(h => h.effort_level).filter(Boolean), 1
      )[0] ?? 'Low'
      const strong_regulation_types = topN(
        history.filter(h => h.rating >= 2).map(h => h.regulation_type).filter(Boolean), 3
      )

      // Update preference profile — do NOT overwrite total_checkins here,
      // that is tracked accurately in the care-kit route (1 per session).
      await supabaseAdmin
        .from('user_preference_profile')
        .upsert({
          user_id: userId,
          preferred_categories,
          avoided_categories,
          preferred_effort,
          strong_regulation_types,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id', ignoreDuplicates: false })
    }

    return NextResponse.json({ ok: true, persisted: true })
  } catch (err) {
    console.error('[feedback] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function topN(items: string[], n: number): string[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([item]) => item)
}

/**
 * Ranks categories by skip rate (skips ÷ total exposures) rather than raw
 * skip count. A category must have at least `minExposures` appearances before
 * it can be flagged as avoided — this prevents categories that only appeared
 * once or twice from being incorrectly labelled.
 * Only categories with a skip rate ≥ 40% are considered truly avoided.
 */
function topNBySkipRate(
  history: { category: string | null; rating: number }[],
  n: number,
  minExposures = 3,
  minSkipRate = 0.4
): string[] {
  const totals = new Map<string, { skips: number; total: number }>()
  for (const h of history) {
    if (!h.category) continue
    const existing = totals.get(h.category) ?? { skips: 0, total: 0 }
    totals.set(h.category, {
      skips: existing.skips + (h.rating === 1 ? 1 : 0),
      total: existing.total + 1,
    })
  }
  return Array.from(totals.entries())
    .filter(([, { total, skips }]) => total >= minExposures && skips / total >= minSkipRate)
    .sort((a, b) => (b[1].skips / b[1].total) - (a[1].skips / a[1].total))
    .slice(0, n)
    .map(([category]) => category)
}

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}
