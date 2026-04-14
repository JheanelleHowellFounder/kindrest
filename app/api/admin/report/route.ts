/**
 * GET /api/admin/report
 * Server-side data for the admin report dashboard.
 * Protected — only callable from the admin page which gates on auth.
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const now = new Date()
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const startOfLastWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()

  // ── Total users ────────────────────────────────────────────────────────────
  const { data: allProfiles } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id, name, motherhood_stage, onboarding_completed, created_at')
    .order('created_at', { ascending: false })

  const totalUsers = allProfiles?.length ?? 0
  const completedOnboarding = allProfiles?.filter(p => p.onboarding_completed).length ?? 0

  // ── New signups this week ──────────────────────────────────────────────────
  const newThisWeek = allProfiles?.filter(p => p.created_at >= startOfWeek).length ?? 0
  const newLastWeek = allProfiles?.filter(
    p => p.created_at >= startOfLastWeek && p.created_at < startOfWeek
  ).length ?? 0

  // ── All feedback ──────────────────────────────────────────────────────────
  const { data: allFeedback } = await supabaseAdmin
    .from('recommendation_feedback')
    .select('user_id, rec_title, rating, check_in_mood, category, created_at')
    .order('created_at', { ascending: false })

  const totalCheckins = Math.ceil((allFeedback?.length ?? 0) / 3)
  const checkinsThisWeek = Math.ceil(
    (allFeedback?.filter(f => f.created_at >= startOfWeek).length ?? 0) / 3
  )

  // ── Active users this week (unique user_ids with feedback) ────────────────
  const activeThisWeek = new Set(
    allFeedback?.filter(f => f.created_at >= startOfWeek).map(f => f.user_id)
  ).size

  // ── Mood breakdown ────────────────────────────────────────────────────────
  const moodCounts: Record<string, number> = {}
  for (const f of allFeedback ?? []) {
    if (f.check_in_mood) {
      moodCounts[f.check_in_mood] = (moodCounts[f.check_in_mood] ?? 0) + 1
    }
  }
  const moodBreakdown = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([mood, count]) => ({ mood, count }))

  // ── Top recommendations (most saved/done) ─────────────────────────────────
  const recMap: Record<string, { title: string; category: string; liked: number; total: number }> = {}
  for (const f of allFeedback ?? []) {
    if (!f.rec_title) continue
    if (!recMap[f.rec_title]) {
      recMap[f.rec_title] = { title: f.rec_title, category: f.category ?? '', liked: 0, total: 0 }
    }
    recMap[f.rec_title].total++
    if (f.rating >= 2) recMap[f.rec_title].liked++
  }
  const topRecs = Object.values(recMap)
    .filter(r => r.liked > 0)
    .sort((a, b) => b.liked - a.liked)
    .slice(0, 5)

  // ── Category breakdown ────────────────────────────────────────────────────
  const catCounts: Record<string, number> = {}
  for (const f of allFeedback ?? []) {
    if (f.category) {
      catCounts[f.category] = (catCounts[f.category] ?? 0) + 1
    }
  }
  const categoryBreakdown = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }))

  // ── Recent signups ────────────────────────────────────────────────────────
  const recentSignups = (allProfiles ?? []).slice(0, 5).map(p => ({
    name: p.name ?? 'Anonymous',
    stage: p.motherhood_stage ?? '—',
    joined: p.created_at,
    completed: p.onboarding_completed,
  }))

  return NextResponse.json({
    generatedAt: now.toISOString(),
    users: {
      total: totalUsers,
      completedOnboarding,
      newThisWeek,
      newLastWeek,
      weekOverWeekChange: newLastWeek > 0
        ? Math.round(((newThisWeek - newLastWeek) / newLastWeek) * 100)
        : null,
    },
    checkins: {
      total: totalCheckins,
      thisWeek: checkinsThisWeek,
      activeUsersThisWeek: activeThisWeek,
    },
    moodBreakdown,
    topRecs,
    categoryBreakdown,
    recentSignups,
  })
}
