/**
 * POST /api/rest-card/complete  { squareId }
 *
 * Toggles a square: marks it true, or un-marks it. Nothing is earned and nothing
 * is spent — the card is a record, not a score. Returns which lines are complete
 * so the UI can offer a warm word when one lands.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth-server'
import { completedLines } from '@/lib/restcard'

export async function POST(req: NextRequest) {
  try {
    const { squareId } = await req.json() as { squareId?: string }
    const requester = await requireUser(req)
    if (!requester) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!squareId) return NextResponse.json({ error: 'squareId required' }, { status: 400 })
    if (!supabaseAdmin) return NextResponse.json({ ok: true, persisted: false })

    const { data: square } = await supabaseAdmin
      .from('rest_card_squares')
      .select('id, card_id, user_id, status, source')
      .eq('id', squareId)
      .maybeSingle()


    if (!square || square.user_id !== requester.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // The free centre is already true and isn't hers to un-mark.
    if (square.source === 'free') {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const nowDone = square.status !== 'done'
    await supabaseAdmin
      .from('rest_card_squares')
      .update({
        status: nowDone ? 'done' : 'open',
        completed_at: nowDone ? new Date().toISOString() : null,
      })
      .eq('id', squareId)

    const { data: squares } = await supabaseAdmin
      .from('rest_card_squares')
      .select('position, status')
      .eq('card_id', square.card_id)

    const done = new Set((squares ?? []).filter(s => s.status === 'done').map(s => s.position))
    const lines = completedLines(done)

    // Bingo. Retire this card so the next GET lays out a fresh one — but only
    // the first time, so un-marking and re-marking can't retire it twice.
    let bingo = false
    if (lines.length > 0) {
      const { data: retired } = await supabaseAdmin
        .from('rest_cards')
        .update({ status: 'archived' })
        .eq('id', square.card_id)
        .eq('status', 'active')      // no-op if it's already been retired
        .select('id')

      bingo = (retired?.length ?? 0) > 0
    }

    return NextResponse.json({
      ok: true,
      done: nowDone,
      completedLineCount: lines.length,
      bingo,
      // Squares she marked herself — the free centre isn't hers to claim.
      marked: (squares ?? []).filter(s => s.status === 'done').length - 1,
    })
  } catch (err) {
    console.error('[rest-card/complete] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
