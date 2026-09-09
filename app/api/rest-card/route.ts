/**
 * GET /api/rest-card
 *
 * Returns the user's active Rest Card, dealing a fresh one if she has none or
 * the cycle has ended.
 *
 * The eight squares come from the "Rest Card Squares" Airtable table: written by
 * hand in her own voice, filtered to her stage, one per theme across the six
 * themes plus two more, and rendered **exactly as stored**.
 *
 * ⚠️ This route used to derive squares from the Recommendations table, filtering
 * to `effort_level === 'Low'` and conjugating the first verb of each title into
 * past tense. That produced sentences like "You got one thing out of your head
 * and ontoed paper" in production. It also padded short deals from a hardcoded
 * list, which could repeat a label already on the card. Both are gone. If a
 * square reads wrong now, the fix is the Airtable row.
 *
 * There is no silent substitute card. If the table is empty or unreachable, this
 * returns an error and logs it, because a card built from placeholder copy is
 * worse than no card.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth-server'
import { buildCardSquares, CARD_CYCLE_DAYS, type SelfAction } from '@/lib/restcard'
import { getRestCardSquares } from '@/lib/airtable'
import { STAGE_TO_AIRTABLE, type MotherhoodStage } from '@/lib/types'
import { isMissingTable } from '@/lib/pg-errors'

/** Postgres unique-violation — another request won the race to deal her card. */
const UNIQUE_VIOLATION = '23505'

const CARD_COLUMNS = 'id, cycle_start, cycle_end, status'

function localDateKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function GET(req: NextRequest) {
  const requester = await requireUser(req)
  if (!requester || !supabaseAdmin) return NextResponse.json({ card: null })

  const uid = requester.id
  const today = localDateKey()

  const { data: existing, error: findErr } = await supabaseAdmin
    .from('rest_cards')
    .select(CARD_COLUMNS)
    .eq('user_id', uid)
    .eq('status', 'active')
    .gte('cycle_end', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (isMissingTable(findErr)) return NextResponse.json({ card: null })

  let card = existing
  if (!card) {
    const pool = await stageEligiblePool(uid)
    if (pool.length === 0) {
      console.error('[rest-card] no eligible squares — Airtable empty, unreachable, or all inactive')
      return NextResponse.json(
        { card: null, error: 'No Rest Card squares available' },
        { status: 503 },
      )
    }

    const recentLabels = await recentCardLabels(uid)
    const squares = buildCardSquares({ pool, recentLabels })
    if (!squares) {
      console.error(`[rest-card] pool of ${pool.length} could not fill a card with 8 unique labels`)
      return NextResponse.json(
        { card: null, error: 'Not enough Rest Card squares to deal a card' },
        { status: 503 },
      )
    }

    const dealt = await dealCard(uid, today, squares)
    if (!dealt) return NextResponse.json({ card: null })
    card = dealt
  }

  const { data: squares } = await supabaseAdmin
    .from('rest_card_squares')
    .select('id, position, label, source, status')
    .eq('card_id', card.id)
    .order('position', { ascending: true })

  return NextResponse.json({ card: { ...card, squares: squares ?? [] } })
}

/**
 * Archive whatever was active, insert the new card and its squares.
 *
 * A partial unique index on `rest_cards (user_id) where status = 'active'` means
 * two simultaneous requests cannot both create a card. The loser gets 23505 and
 * returns the winner's card rather than an error, so a double tap is invisible.
 */
async function dealCard(
  uid: string,
  today: string,
  squares: ReturnType<typeof buildCardSquares>,
): Promise<{ id: string; cycle_start: string; cycle_end: string; status: string } | null> {
  if (!supabaseAdmin || !squares) return null

  await supabaseAdmin.from('rest_cards').update({ status: 'archived' })
    .eq('user_id', uid).eq('status', 'active')

  const cycleEnd = new Date()
  cycleEnd.setDate(cycleEnd.getDate() + CARD_CYCLE_DAYS)

  const { data: made, error: makeErr } = await supabaseAdmin
    .from('rest_cards')
    .insert({ user_id: uid, cycle_start: today, cycle_end: localDateKey(cycleEnd), status: 'active' })
    .select(CARD_COLUMNS)
    .single()

  if (makeErr || !made) {
    if (makeErr?.code === UNIQUE_VIOLATION) {
      // Another request dealt her card a moment ago. Hand back that one.
      const { data: winner } = await supabaseAdmin
        .from('rest_cards').select(CARD_COLUMNS)
        .eq('user_id', uid).eq('status', 'active')
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (winner) return winner
    }
    if (!isMissingTable(makeErr)) console.error('[rest-card] create failed:', makeErr?.message)
    return null
  }

  const { error: sqErr } = await supabaseAdmin.from('rest_card_squares')
    .insert(squares.map(s => ({ ...s, card_id: made.id, user_id: uid })))

  if (sqErr) {
    // A card with missing squares is unusable, and leaving it active would block
    // every later deal. Roll it back so the next request tries again cleanly.
    console.error('[rest-card] squares insert failed, rolling back card:', sqErr.message)
    await supabaseAdmin.from('rest_cards').delete().eq('id', made.id)
    return null
  }

  return made
}

/**
 * The squares she is eligible for: active, and tagged either 'all' or her own
 * stage.
 *
 * A mother with no stage set gets the 'all' squares, which is every square today.
 */
async function stageEligiblePool(uid: string): Promise<SelfAction[]> {
  let stage: string | null = null
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from('user_profiles').select('motherhood_stage').eq('user_id', uid).maybeSingle()
    const raw = data?.motherhood_stage as MotherhoodStage | null | undefined
    stage = raw ? STAGE_TO_AIRTABLE[raw] ?? null : null
  }

  try {
    const squares = await getRestCardSquares()
    return squares
      .filter(s => s.active && (s.stage === 'all' || (stage !== null && s.stage === stage)))
      .map(s => ({ label: s.label, theme: s.theme, stage: s.stage }))
  } catch (err) {
    console.error('[rest-card] Airtable fetch failed:', err instanceof Error ? err.message : err)
    return []
  }
}

/**
 * Labels from her last few cards, so a new card doesn't repeat what she just saw.
 * The selector drops this automatically if the pool gets too small to fill a card.
 */
async function recentCardLabels(uid: string, cards = 3): Promise<string[]> {
  if (!supabaseAdmin) return []
  const { data: recent } = await supabaseAdmin
    .from('rest_cards')
    .select('id')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(cards)
  if (!recent?.length) return []

  const { data: squares } = await supabaseAdmin
    .from('rest_card_squares')
    .select('label')
    .in('card_id', recent.map(c => c.id))
    .eq('source', 'self')

  return (squares ?? []).map(s => s.label).filter(Boolean)
}
