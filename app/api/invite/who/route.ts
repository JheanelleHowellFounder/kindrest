/**
 * GET /api/invite/who?code=ABC1234 — who sent this invite.
 *
 * Public, because the person opening the link hasn't signed up yet. Returns a
 * first name and nothing else: enough to make the page feel like it came from
 * someone real, and not enough to be worth harvesting. Codes are random, so
 * guessing your way to a list of names isn't practical.
 *
 * An unknown or unmigrated code returns { name: null }, never an error — she
 * gets the ordinary welcome instead of a broken page.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get('code') ?? '').trim().toUpperCase()
  if (!code || !supabaseAdmin) return NextResponse.json({ name: null })

  const { data: owner } = await supabaseAdmin
    .from('referral_codes')
    .select('user_id')
    .eq('code', code)
    .maybeSingle()

  if (!owner) return NextResponse.json({ name: null })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('name')
    .eq('user_id', owner.user_id)
    .maybeSingle()

  const first = (profile?.name ?? '').trim().split(/\s+/)[0] || null
  return NextResponse.json({ name: first })
}
