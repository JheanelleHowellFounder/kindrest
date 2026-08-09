/**
 * GET /api/at-risk
 *
 * Quietly notices a stretch of hard days from the `heavy` glimmer signals she
 * chose to share — so Kindrest can gently offer support before she hits the wall
 * (persona 5). This is NOT crisis detection: it never reads content, only counts
 * how many days she told us were heavy. Automated, not human-monitored — the
 * response is a soft in-app nudge, never an alarm.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

const WINDOW_DAYS = 14
const HEAVY_THRESHOLD = 3   // heavy days within the window that trigger a gentle nudge

export async function GET(req: NextRequest) {
  const requester = await requireUser(req)
  if (!requester || !supabaseAdmin) return NextResponse.json({ atRisk: false })

  const uid = requester.id
  const cutoff = new Date(Date.now() - WINDOW_DAYS * 86_400_000)
  const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`

  // A "hard day" is one she told us was heavy on the glimmer, OR a day she checked
  // in as overwhelmed or struggling. This catches the moms who don't tap "heavy"
  // but do register a hard state in a check-in — including the ones who mask.
  const hardDays = new Set<string>()

  const { data: heavy } = await supabaseAdmin
    .from('glimmers')
    .select('entry_date')
    .eq('user_id', uid)
    .eq('mood_signal', 'heavy')
    .gte('entry_date', cutoffKey)
  for (const g of heavy ?? []) if (g.entry_date) hardDays.add(g.entry_date)

  const { data: checkins } = await supabaseAdmin
    .from('recommendation_feedback')
    .select('check_in_mood, created_at')
    .eq('user_id', uid)
    .in('check_in_mood', ['overwhelmed', 'struggling'])
    .gte('created_at', cutoff.toISOString())
  for (const c of checkins ?? []) if (c.created_at) hardDays.add(c.created_at.split('T')[0])

  const count = hardDays.size
  return NextResponse.json({ atRisk: count >= HEAVY_THRESHOLD, hardDays: count })
}
