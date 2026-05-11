/**
 * GET /api/stats?userId=demo-user-001
 *
 * Returns live wellness stats for a user, derived from Supabase:
 *   - total check-ins
 *   - top techniques (most saved/completed recs)
 *   - recent history (last 20 feedback events)
 *   - saved recommendations (rating = 2)
 *   - most common mood
 *   - active days this month (for calendar)
 *   - preferred categories from profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  // ── Fetch raw feedback history ────────────────────────────────────────────
  const { data: feedback } = await supabaseAdmin
    .from('recommendation_feedback')
    .select('rec_id, rec_title, rating, check_in_mood, category, effort_level, regulation_type, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200)

  // ── Fetch user preference profile ─────────────────────────────────────────
  const { data: profile } = await supabaseAdmin
    .from('user_preference_profile')
    .select('preferred_categories, avoided_categories, total_checkins, updated_at')
    .eq('user_id', userId)
    .single()

  if (!feedback || feedback.length === 0) {
    return NextResponse.json({
      totalCheckins: 0,
      topTechniques: [],
      recentHistory: [],
      savedRecs: [],
      commonMood: null,
      activeDays: [],
      preferredCategories: [],
      streakDays: 0,
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

  // ── All check-in dates as ISO strings (for multi-month calendar) ──────────
  const activeDays = Array.from(
    new Set(feedback.map(f => new Date(f.created_at).toDateString()))
  ).map(d => new Date(d).toISOString())

  // ── Streak: consecutive days with check-ins ending today/yesterday ────────
  const distinctDates = Array.from(
    new Set(feedback.map(f => new Date(f.created_at).toDateString()))
  ).map(d => new Date(d)).sort((a, b) => b.getTime() - a.getTime())

  let streakDays = 0
  const todayStr        = new Date().toDateString()
  const yesterdayStr    = new Date(Date.now() - 86400000).toDateString()
  const twoDaysAgoStr   = new Date(Date.now() - 86400000 * 2).toDateString()
  const mostRecent      = distinctDates[0]?.toDateString()

  // 2-day grace window: streak stays alive if last check-in was today, yesterday, or 2 days ago
  if (mostRecent === todayStr || mostRecent === yesterdayStr || mostRecent === twoDaysAgoStr) {
    let cursor = mostRecent === todayStr
      ? new Date()
      : mostRecent === yesterdayStr
      ? new Date(Date.now() - 86400000)
      : new Date(Date.now() - 86400000 * 2)
    for (const d of distinctDates) {
      if (d.toDateString() === cursor.toDateString()) {
        streakDays++
        cursor = new Date(cursor.getTime() - 86400000)
      } else {
        break
      }
    }
  }

  return NextResponse.json({
    totalCheckins: profile?.total_checkins ?? Math.ceil(feedback.length / 3),
    topTechniques,
    recentHistory,
    savedRecs,
    commonMood,
    activeDays,
    preferredCategories: profile?.preferred_categories ?? [],
    streakDays,
  })
}
