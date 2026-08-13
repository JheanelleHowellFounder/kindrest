/**
 * GET /api/rest-card
 *
 * Returns the user's active Rest Card, generating a fresh one if she has none or
 * the cycle has ended. The eight suggested squares are drawn from the real
 * recommendations database — filtered to low-effort (doable on a hard day),
 * spread across regulation types, weighted to her — and rewritten into the
 * card's record voice. Degrades gracefully if Airtable or the tables are absent.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth-server'
import { buildCardSquares, CARD_CYCLE_DAYS, toRecordVoice, type SelfAction } from '@/lib/restcard'
import { getRecommendations } from '@/lib/airtable'
import { isMissingTable } from '@/lib/pg-errors'


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

  if (isMissingTable(findErr)) return NextResponse.json({ card: null })

  let card = existing
  if (!card) {
    // Theme the suggested squares to her care preferences.
    const { preferred, avoided, strongRegulationTypes } = await carePreferences(uid)
    const pool = await recommendationPool()
    const recentLabels = await recentCardLabels(uid)

    await supabaseAdmin.from('rest_cards').update({ status: 'archived' }).eq('user_id', uid).eq('status', 'active')

    const cycleEnd = new Date()
    cycleEnd.setDate(cycleEnd.getDate() + CARD_CYCLE_DAYS)

    const { data: made, error: makeErr } = await supabaseAdmin
      .from('rest_cards')
      .insert({ user_id: uid, cycle_start: today, cycle_end: localDateKey(cycleEnd), status: 'active' })
      .select('id, cycle_start, cycle_end, status')
      .single()

    if (makeErr || !made) {
      if (isMissingTable(makeErr)) return NextResponse.json({ card: null })
      console.error('[rest-card] create failed:', makeErr?.message)
      return NextResponse.json({ card: null })
    }
    card = made

    const squares = buildCardSquares({ preferred, avoided, strongRegulationTypes, pool, recentLabels })
      .map(s => ({ ...s, card_id: card!.id, user_id: uid }))
    await supabaseAdmin.from('rest_card_squares').insert(squares)
  }

  const { data: squares } = await supabaseAdmin
    .from('rest_card_squares')
    .select('id, position, label, source, status')
    .eq('card_id', card.id)
    .order('position', { ascending: true })

  return NextResponse.json({ card: { ...card, squares: squares ?? [] } })
}

/**
 * Her care profile, so the suggested squares spread across regulation types and
 * lean toward the ones she actually responds to.
 */
async function carePreferences(uid: string): Promise<{
  preferred: string[]; avoided: string[]; strongRegulationTypes: string[]
}> {
  const empty = { preferred: [], avoided: [], strongRegulationTypes: [] }
  if (!supabaseAdmin) return empty
  const { data } = await supabaseAdmin
    .from('user_preference_profile')
    .select('preferred_categories, avoided_categories, strong_regulation_types')
    .eq('user_id', uid)
    .maybeSingle()
  return {
    preferred: data?.preferred_categories ?? [],
    avoided: data?.avoided_categories ?? [],
    strongRegulationTypes: data?.strong_regulation_types ?? [],
  }
}

/**
 * The card's content source: real recommendations, low-effort only (nothing that
 * needs money, childcare, or leaving the house), rewritten from instruction voice
 * into record voice. Returns [] on any failure so the curated fallback is used.
 */
async function recommendationPool(): Promise<SelfAction[]> {
  try {
    const recs = await getRecommendations()
    return recs
      .filter(r => r.effort_level === 'Low' && r.title)
      .map(r => ({
        label: toRecordVoice(r.title),
        category: r.category,
        regulation: r.regulation_type,
      }))
  } catch (err) {
    console.error('[rest-card] rec pool failed, using fallback:', err instanceof Error ? err.message : err)
    return []
  }
}

/**
 * Labels from her last few cards, so a new card doesn't repeat what she just saw.
 * The selector loosens this automatically if the pool gets too small to fill a card.
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
