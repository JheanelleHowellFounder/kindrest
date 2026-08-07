/**
 * GET /api/rest-card
 *
 * Returns the user's active Rest Card, generating a fresh one if she has none
 * or the current cycle has ended. Degrades to { card: null } if unauthenticated
 * or the tables aren't migrated yet.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth-server'
import { pickCardActions, CARD_CYCLE_DAYS } from '@/lib/restcard'

const UNDEFINED_TABLE = '42P01'

function localDateKey(d = new Date()): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function GET(req: NextRequest) {
  const requester = await requireUser(req)
  if (!requester || !supabaseAdmin) {
    return NextResponse.json({ card: null })
  }

  const today = localDateKey()

  // Look for an active, unexpired card.
  const { data: existing, error: findErr } = await supabaseAdmin
    .from('rest_cards')
    .select('id, cycle_start, cycle_end, status')
    .eq('user_id', requester.id)
    .eq('status', 'active')
    .gte('cycle_end', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (findErr?.code === UNDEFINED_TABLE) return NextResponse.json({ card: null })

  if (existing) {
    return NextResponse.json({ card: await withSquares(existing) })
  }

  // None active (or the last one expired) → archive stale ones and make a fresh card.
  await supabaseAdmin
    .from('rest_cards')
    .update({ status: 'archived' })
    .eq('user_id', requester.id)
    .eq('status', 'active')

  const cycleEnd = new Date()
  cycleEnd.setDate(cycleEnd.getDate() + CARD_CYCLE_DAYS)

  const { data: card, error: makeErr } = await supabaseAdmin
    .from('rest_cards')
    .insert({ user_id: requester.id, cycle_start: today, cycle_end: localDateKey(cycleEnd), status: 'active' })
    .select('id, cycle_start, cycle_end, status')
    .single()

  if (makeErr || !card) {
    if (makeErr?.code === UNDEFINED_TABLE) return NextResponse.json({ card: null })
    console.error('[rest-card] create failed:', makeErr?.message)
    return NextResponse.json({ card: null })
  }

  const squares = pickCardActions().map((a, i) => ({
    card_id: card.id, user_id: requester.id, position: i, label: a.label, source: 'kindrest', status: 'open',
  }))
  await supabaseAdmin.from('rest_card_squares').insert(squares)

  return NextResponse.json({ card: await withSquares(card) })
}

async function withSquares(card: { id: string; cycle_start: string; cycle_end: string; status: string }) {
  const { data: squares } = await supabaseAdmin!
    .from('rest_card_squares')
    .select('id, position, label, source, status')
    .eq('card_id', card.id)
    .order('position', { ascending: true })
  return { ...card, squares: squares ?? [] }
}
