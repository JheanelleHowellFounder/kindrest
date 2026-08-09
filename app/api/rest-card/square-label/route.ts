/**
 * POST /api/rest-card/square-label  { squareId, label }
 *
 * Sets the text on one of the four user-authored centre squares. Writing your
 * own counts as marking it — it's a moment you're claiming — so it also marks the
 * square done and grants its gem (idempotent per square). Only 'user' squares.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth-server'
import { grantGems, getWalletState, GEM_VALUES } from '@/lib/gems'
import { completedLines, LINES } from '@/lib/restcard'

export async function POST(req: NextRequest) {
  try {
    const { squareId, label } = await req.json() as { squareId?: string; label?: string }
    const requester = await requireUser(req)
    if (!requester) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const text = (label ?? '').trim()
    if (!squareId || !text) return NextResponse.json({ error: 'squareId and label required' }, { status: 400 })
    if (!supabaseAdmin) return NextResponse.json({ ok: true, persisted: false })

    const { data: square } = await supabaseAdmin
      .from('rest_card_squares')
      .select('id, card_id, user_id, source, status')
      .eq('id', squareId)
      .maybeSingle()

    if (!square || square.user_id !== requester.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (square.source !== 'user') {
      return NextResponse.json({ error: 'Not editable' }, { status: 400 })
    }

    await supabaseAdmin
      .from('rest_card_squares')
      .update({ label: text.slice(0, 120), status: 'done', completed_at: new Date().toISOString() })
      .eq('id', squareId)

    // Writing your own is the act — grant its gem (idempotent per square).
    await grantGems(requester.id, GEM_VALUES.rest_square, 'rest_square', 'rest_square', squareId)

    // Writing a centre square can finish a line — grant any newly-complete line bonus.
    const { data: squares } = await supabaseAdmin
      .from('rest_card_squares')
      .select('position, status')
      .eq('card_id', square.card_id)
    const done = new Set((squares ?? []).filter(s => s.status === 'done').map(s => s.position))
    const lines = completedLines(done)
    for (const line of lines) {
      const idx = LINES.findIndex(l => l.join(',') === line.join(','))
      await grantGems(requester.id, GEM_VALUES.rest_line, 'rest_line', 'rest_line', `${square.card_id}-${idx}`)
    }

    const wallet = await getWalletState(requester.id)
    return NextResponse.json({ ok: true, wallet, completedLineCount: lines.length })
  } catch (err) {
    console.error('[rest-card/square-label] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
