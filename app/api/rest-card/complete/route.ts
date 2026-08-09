/**
 * POST /api/rest-card/complete  { squareId }
 *
 * Toggles a square. Completing it grants gems (idempotent per square) and, if it
 * finishes a line, the line bonus. Un-completing it reverses that square's gems
 * and claws back any line bonus that is no longer earned — so the reserve only
 * ever reflects what she actually did. Returns the updated wallet.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth-server'
import { grantGems, getWalletState, GEM_VALUES } from '@/lib/gems'
import { completedLines, LINES } from '@/lib/restcard'

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

    // Self and user (centre) squares are tappable. App-linked squares mark
    // themselves and must never be toggled by hand.
    if (square.source !== 'self' && square.source !== 'user') {
      const wallet = await getWalletState(requester.id)
      return NextResponse.json({ ok: true, ignored: true, wallet })
    }

    const cardId = square.card_id
    const nowDone = square.status !== 'done'   // toggling on if currently open

    if (nowDone) {
      await supabaseAdmin
        .from('rest_card_squares')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', squareId)
      await grantGems(requester.id, GEM_VALUES.rest_square, 'rest_square', 'rest_square', squareId)
    } else {
      await supabaseAdmin
        .from('rest_card_squares')
        .update({ status: 'open', completed_at: null })
        .eq('id', squareId)
      // Reverse this square's gems.
      await supabaseAdmin
        .from('gem_ledger')
        .delete()
        .eq('user_id', requester.id)
        .eq('ref_type', 'rest_square')
        .eq('ref_id', squareId)
    }

    // Recompute which lines are currently complete.
    const { data: squares } = await supabaseAdmin
      .from('rest_card_squares')
      .select('position, status')
      .eq('card_id', cardId)

    const done = new Set((squares ?? []).filter(s => s.status === 'done').map(s => s.position))
    const currentLineIdxs = new Set(
      completedLines(done).map(line => LINES.findIndex(l => l.join(',') === line.join(','))),
    )

    // Grant any newly-complete line bonuses (idempotent).
    for (const idx of Array.from(currentLineIdxs)) {
      await grantGems(requester.id, GEM_VALUES.rest_line, 'rest_line', 'rest_line', `${cardId}-${idx}`)
    }

    // Claw back line bonuses for lines that are no longer complete.
    const { data: lineEntries } = await supabaseAdmin
      .from('gem_ledger')
      .select('id, ref_id')
      .eq('user_id', requester.id)
      .eq('ref_type', 'rest_line')
      .like('ref_id', `${cardId}-%`)

    const staleIds = (lineEntries ?? [])
      .filter(e => {
        const idx = Number(e.ref_id.slice(cardId.length + 1))
        return !currentLineIdxs.has(idx)
      })
      .map(e => e.id)

    if (staleIds.length > 0) {
      await supabaseAdmin.from('gem_ledger').delete().in('id', staleIds)
    }

    const wallet = await getWalletState(requester.id)
    return NextResponse.json({ ok: true, done: nowDone, wallet, completedLineCount: currentLineIdxs.size })
  } catch (err) {
    console.error('[rest-card/complete] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
