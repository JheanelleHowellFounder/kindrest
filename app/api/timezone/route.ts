/**
 * POST /api/timezone
 *
 * Learns her timezone from the browser, once, so her days are her days.
 *
 * Called on app load when we do not have one yet, and again if it changes —
 * mothers move, and travel. Deliberately tiny and non-fatal: if this never
 * succeeds, every date falls back to UTC exactly as before.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth-server'
import { validZone } from '@/lib/days'

export async function POST(req: NextRequest) {
  const requester = await requireUser(req)
  if (!requester) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false })
  }

  const { timezone } = await req.json().catch(() => ({ timezone: null }))

  // The value comes from a browser, so it is checked before it is stored. A
  // bad string here would throw on every later read of her history.
  const zone = validZone(timezone)
  if (!zone) {
    return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('user_preference_profile')
    .upsert({ user_id: requester.id, timezone: zone }, { onConflict: 'user_id' })

  if (error) {
    console.error('[timezone] save failed:', error.message)
    return NextResponse.json({ ok: false })
  }

  return NextResponse.json({ ok: true, timezone: zone })
}
