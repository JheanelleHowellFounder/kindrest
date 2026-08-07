/**
 * GET /api/rest-card/progress
 *
 * Lightweight, read-only progress for the home entry strip. Unlike /api/rest-card
 * it never generates a card — so simply loading the home doesn't create one. The
 * card is generated when she actually opens the Rest Card.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth-server'
import { CARD_SIZE } from '@/lib/restcard'

export const dynamic = 'force-dynamic'
const UNDEFINED_TABLE = '42P01'

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function GET(req: NextRequest) {
  const empty = { hasCard: false, doneCount: 0, total: CARD_SIZE }
  const requester = await requireUser(req)
  if (!requester || !supabaseAdmin) return NextResponse.json(empty)

  const { data: card, error } = await supabaseAdmin
    .from('rest_cards')
    .select('id')
    .eq('user_id', requester.id)
    .eq('status', 'active')
    .gte('cycle_end', today())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error?.code === UNDEFINED_TABLE || !card) return NextResponse.json(empty)

  const { data: squares } = await supabaseAdmin
    .from('rest_card_squares')
    .select('status')
    .eq('card_id', card.id)

  const total = squares?.length ?? CARD_SIZE
  const doneCount = (squares ?? []).filter(s => s.status === 'done').length
  return NextResponse.json({ hasCard: true, doneCount, total })
}
