/**
 * GET /api/rest-card
 *
 * Returns the user's active Rest Card, generating a fresh one if she has none or
 * the cycle has ended. On every load it reconciles the app-linked squares from
 * what she already did this cycle (a glimmer, a journal entry, a practice), so
 * she never re-does work — these mark themselves and never award extra gems.
 * Degrades to { card: null } if unauthenticated or the tables aren't migrated.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth-server'
import { buildCardSquares, CARD_CYCLE_DAYS, USER_POSITIONS, type AppLink } from '@/lib/restcard'

const UNDEFINED_TABLE = '42P01'

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
    .select('id, cycle_start, cycle_end, status')
    .eq('user_id', uid)
    .eq('status', 'active')
    .gte('cycle_end', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (findErr?.code === UNDEFINED_TABLE) return NextResponse.json({ card: null })

  let card = existing
  if (!card) {
    // Carry her written centre squares forward from the most recent card, so what
    // she wrote sticks across cycles.
    const userLabels = await carriedUserLabels(uid)
    // Theme the self squares to her care preferences.
    const { preferred, avoided } = await carePreferences(uid)

    await supabaseAdmin.from('rest_cards').update({ status: 'archived' }).eq('user_id', uid).eq('status', 'active')

    const cycleEnd = new Date()
    cycleEnd.setDate(cycleEnd.getDate() + CARD_CYCLE_DAYS)

    const { data: made, error: makeErr } = await supabaseAdmin
      .from('rest_cards')
      .insert({ user_id: uid, cycle_start: today, cycle_end: localDateKey(cycleEnd), status: 'active' })
      .select('id, cycle_start, cycle_end, status')
      .single()

    if (makeErr || !made) {
      if (makeErr?.code === UNDEFINED_TABLE) return NextResponse.json({ card: null })
      console.error('[rest-card] create failed:', makeErr?.message)
      return NextResponse.json({ card: null })
    }
    card = made

    const squares = buildCardSquares({ preferred, avoided, userLabels }).map(s => ({ ...s, card_id: card!.id, user_id: uid }))
    await supabaseAdmin.from('rest_card_squares').insert(squares)
  }

  // Reconcile app-linked squares from this cycle's activity (no gems — the
  // activity already earned them; we just reflect it on the board).
  await reconcileAppSquares(uid, card.id, card.cycle_start)

  const { data: squares } = await supabaseAdmin
    .from('rest_card_squares')
    .select('id, position, label, source, status')
    .eq('card_id', card.id)
    .order('position', { ascending: true })

  return NextResponse.json({ card: { ...card, squares: squares ?? [] } })
}

/** Her written centre squares from the most recent card, by position. */
async function carriedUserLabels(uid: string): Promise<Record<number, string>> {
  if (!supabaseAdmin) return {}
  const { data: last } = await supabaseAdmin
    .from('rest_cards')
    .select('id')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!last) return {}

  const { data: sqs } = await supabaseAdmin
    .from('rest_card_squares')
    .select('position, label')
    .eq('card_id', last.id)
    .eq('source', 'user')

  const labels: Record<number, string> = {}
  for (const s of sqs ?? []) {
    if (USER_POSITIONS.includes(s.position) && s.label?.trim()) labels[s.position] = s.label
  }
  return labels
}

/** Her care preferences, so the self squares lean toward what she loves. */
async function carePreferences(uid: string): Promise<{ preferred: string[]; avoided: string[] }> {
  if (!supabaseAdmin) return { preferred: [], avoided: [] }
  const { data } = await supabaseAdmin
    .from('user_preference_profile')
    .select('preferred_categories, avoided_categories')
    .eq('user_id', uid)
    .maybeSingle()
  return {
    preferred: data?.preferred_categories ?? [],
    avoided: data?.avoided_categories ?? [],
  }
}

async function reconcileAppSquares(uid: string, cardId: string, cycleStart: string) {
  if (!supabaseAdmin) return

  const { data: appSquares } = await supabaseAdmin
    .from('rest_card_squares')
    .select('id, source, status')
    .eq('card_id', cardId)
    .like('source', 'app_%')

  const open = (appSquares ?? []).filter(s => s.status !== 'done')
  if (open.length === 0) return

  const has = async (link: AppLink): Promise<boolean> => {
    if (link === 'glimmer') {
      const { data } = await supabaseAdmin!.from('glimmers')
        .select('id').eq('user_id', uid).gte('entry_date', cycleStart).not('body', 'is', null).limit(1)
      return (data?.length ?? 0) > 0
    }
    if (link === 'journal') {
      const { data } = await supabaseAdmin!.from('journal_entries')
        .select('id').eq('user_id', uid).gte('entry_date', cycleStart).limit(1)
      return (data?.length ?? 0) > 0
    }
    // practice: a "did it" feedback (rating 3) this cycle
    const { data } = await supabaseAdmin!.from('recommendation_feedback')
      .select('id').eq('user_id', uid).eq('rating', 3).gte('created_at', cycleStart).limit(1)
    return (data?.length ?? 0) > 0
  }

  for (const sq of open) {
    const link = sq.source.slice(4) as AppLink // 'app_glimmer' -> 'glimmer'
    if (await has(link)) {
      await supabaseAdmin.from('rest_card_squares')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', sq.id)
    }
  }
}
