/**
 * POST /api/rest-card/complete  { squareId }
 *
 * Marks a square done, grants gems (idempotent per square), and if that finished
 * a line, grants the line bonus (idempotent per line). Returns the updated
 * wallet and any newly-completed lines so the UI can celebrate.
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

    // Verify ownership + get the card this square belongs to.
    const { data: square } = await supabaseAdmin
      .from('rest_card_squares')
      .select('id, card_id, user_id, status')
      .eq('id', squareId)
      .maybeSingle()

    if (!square || square.user_id !== requester.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (square.status !== 'done') {
      await supabaseAdmin
        .from('rest_card_squares')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', squareId)
      await grantGems(requester.id, GEM_VALUES.rest_square, 'rest_square', 'rest_square', squareId)
    }

    // Recompute completed lines and grant each line's bonus once (idempotent).
    const { data: squares } = await supabaseAdmin
      .from('rest_card_squares')
      .select('position, status')
      .eq('card_id', square.card_id)

    const done = new Set((squares ?? []).filter(s => s.status === 'done').map(s => s.position))
    const lines = completedLines(done)
    for (const line of lines) {
      const lineIdx = LINES.findIndex(l => l.join(',') === line.join(','))
      await grantGems(requester.id, GEM_VALUES.rest_line, 'rest_line', 'rest_line', `${square.card_id}-${lineIdx}`)
    }

    const wallet = await getWalletState(requester.id)
    return NextResponse.json({ ok: true, wallet, completedLineCount: lines.length })
  } catch (err) {
    console.error('[rest-card/complete] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
