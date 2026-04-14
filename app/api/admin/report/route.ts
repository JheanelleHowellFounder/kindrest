/**
 * GET /api/admin/report
 * Server-side data for the admin report dashboard.
 * Protected — only callable from the admin page which gates on auth.
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const now = new Date()
  const startOfWeek     = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString()
  const startOfLastWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()

  // ── Auth users (everyone who signed up) ───────────────────────────────────
  const { data: authData } = await supabaseAdmin.auth.admin.listUsers()
  const authUsers = authData?.users ?? []

  // ── Profiles (everyone who completed at least step 1 of onboarding) ───────
  const { data: allProfiles } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id, name, motherhood_stage, onboarding_completed, created_at')
    .order('created_at', { ascending: false })

  const profileIds = new Set((allProfiles ?? []).map(p => p.user_id))

  // ── Drop-off: in Auth but no profile row ──────────────────────────────────
  const dropOffUsers = authUsers
    .filter(u => !profileIds.has(u.id))
    .map(u => ({
      name: u.user_metadata?.name ?? 'Unknown',
      email: u.email ?? '—',
      stage: '—',
      joined: u.created_at,
      completed: false,
      authOnly: true,
    }))

  const completedOnboarding = (allProfiles ?? []).filter(p => p.onboarding_completed).length

  // ── Build full user list (profile users + auth-only drop-offs) ────────────
  const emailMap: Record<string, string> = {}
  for (const u of authUsers) emailMap[u.id] = u.email ?? '—'

  const profileUsers = (allProfiles ?? []).map(p => ({
    name: p.name ?? 'Anonymous',
    email: emailMap[p.user_id] ?? '—',
    stage: p.motherhood_stage ?? '—',
    joined: p.created_at,
    completed: p.onboarding_completed,
    authOnly: false,
  }))

  // Combined — profile users first (most recent), then drop-offs
  const allUsers = [
    ...profileUsers,
    ...dropOffUsers,
  ].sort((a, b) => new Date(b.joined).getTime() - new Date(a.joined).getTime())

  // ── Counts ────────────────────────────────────────────────────────────────
  const totalSignups  = authUsers.length          // everyone who gave their email
  const totalInApp    = allProfiles?.length ?? 0  // everyone who made it into the app
  const totalDropOff  = dropOffUsers.length        // lost between signup and app

  const newThisWeek = authUsers.filter(u => u.created_at >= startOfWeek).length
  const newLastWeek = authUsers.filter(
    u => u.created_at >= startOfLastWeek && u.created_at < startOfWeek
  ).length

  // ── Feedback ──────────────────────────────────────────────────────────────
  const { data: allFeedback } = await supabaseAdmin
    .from('recommendation_feedback')
    .select('user_id, rec_title, rating, check_in_mood, category, created_at')
    .order('created_at', { ascending: false })

  const totalCheckins     = Math.ceil((allFeedback?.length ?? 0) / 3)
  const checkinsThisWeek  = Math.ceil(
    (allFeedback?.filter(f => f.created_at >= startOfWeek).length ?? 0) / 3
  )
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

  // ── Top recommendations ───────────────────────────────────────────────────
  const recMap: Record<string, { title: string; category: string; liked: number; total: number }> = {}
  for (const f of allFeedback ?? []) {
    if (!f.rec_title) continue
    if (!recMap[f.rec_title]) recMap[f.rec_title] = { title: f.rec_title, category: f.category ?? '', liked: 0, total: 0 }
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
    if (f.category) catCounts[f.category] = (catCounts[f.category] ?? 0) + 1
  }
  const categoryBreakdown = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }))

  return NextResponse.json({
    generatedAt: now.toISOString(),
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
    checkins: {
      total: totalCheckins,
      thisWeek: checkinsThisWeek,
      activeUsersThisWeek: activeThisWeek,
    },
    moodBreakdown,
    topRecs,
    categoryBreakdown,
    allUsers,
    dropOffUsers,
  })
}
