/**
 * POST /api/landing-view — someone looked at the landing page.
 *
 * Bumps a daily counter and nothing else. No visitor id, no IP, no session,
 * no body. It exists so conversion (views → signups) is answerable at all;
 * every other number we hold describes people who already signed up.
 *
 * Public by necessity — the caller hasn't got an account. That means the number
 * is directional, not audited: a bot could inflate it. Fine for "is the landing
 * page working", not something to quote to anyone.
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isMissingTable } from '@/lib/pg-errors'

export const dynamic = 'force-dynamic'

export async function POST() {
  if (!supabaseAdmin) return NextResponse.json({ ok: true, counted: false })

  const today = new Date().toISOString().slice(0, 10)

  const { error } = await supabaseAdmin.rpc('increment_landing_view', { on_day: today })

  // Migration not run yet — say so quietly rather than erroring at a visitor.
  if (error && !isMissingTable(error)) {
    console.error('[landing-view] increment failed:', error.message)
  }

  return NextResponse.json({ ok: true, counted: !error })
}
