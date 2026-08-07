/**
 * /api/glimmer
 *
 * GET  — today's prompt + whether she's already responded today.
 * POST — save today's glimmer (one per day; upserts so re-answering replaces).
 *
 * A glimmer is light, but it's still her words, so writes require the real
 * signed-in owner — same rule as the journal. If the `glimmers` table doesn't
 * exist yet, the route degrades gracefully (persisted:false) so the screen
 * still works in local preview before the migration is run.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth-server'
import { detectCrisisLanguage } from '@/lib/safety'
import { getTodaysPrompt, localDateKey } from '@/lib/glimmers'
import { grantGems, getWalletState, GEM_VALUES } from '@/lib/gems'

// Postgres error for "relation does not exist" — table not created yet.
const UNDEFINED_TABLE = '42P01'
// "column does not exist" — the mood_signal ALTER hasn't been run yet.
const UNDEFINED_COLUMN = '42703'

export async function GET(req: NextRequest) {
  const prompt = getTodaysPrompt()

  const requester = await requireUser(req)
  if (!requester || !supabaseAdmin) {
    return NextResponse.json({ prompt, respondedToday: false, today: null })
  }

  const { data, error } = await supabaseAdmin
    .from('glimmers')
    .select('id, prompt_text, body, mood_signal, entry_date, created_at')
    .eq('user_id', requester.id)
    .eq('entry_date', localDateKey())
    .maybeSingle()

  if (error && error.code !== UNDEFINED_TABLE) {
    console.error('[glimmer] today lookup failed:', error.message)
  }

  return NextResponse.json({
    prompt,
    respondedToday: Boolean(data),
    today: data ?? null,
  })
}

export async function POST(req: NextRequest) {
  try {
    const { body, signal } = await req.json() as {
      body?: string | null
      signal?: 'answered' | 'quiet' | 'heavy'
    }

    const requester = await requireUser(req)
    if (!requester) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const trimmed = typeof body === 'string' ? body.trim() : null
    const answered = Boolean(trimmed && trimmed.length > 0)
    // Trust the client's fork choice for the empty case; otherwise it's answered.
    // 'heavy' is the safety-relevant signal — a hard day we want to remember.
    const moodSignal: 'answered' | 'quiet' | 'heavy' =
      answered ? 'answered' : signal === 'heavy' ? 'heavy' : 'quiet'
    const crisis = trimmed ? detectCrisisLanguage(trimmed) : false
    const prompt = getTodaysPrompt()
    const today = localDateKey()

    if (!supabaseAdmin) {
      return NextResponse.json({ ok: true, persisted: false, crisis })
    }

    const record = {
      user_id:     requester.id,
      prompt_id:   prompt.id,
      prompt_text: prompt.text,
      body:        answered ? trimmed : null,
      mood_signal: moodSignal,
      responded:   answered,
      entry_date:  today,
    }

    let { error } = await supabaseAdmin
      .from('glimmers')
      .upsert(record, { onConflict: 'user_id,entry_date' })

    // If the mood_signal column isn't there yet, save without it so nothing breaks.
    if (error?.code === UNDEFINED_COLUMN) {
      const { mood_signal, ...withoutSignal } = record
      void mood_signal
      ;({ error } = await supabaseAdmin
        .from('glimmers')
        .upsert(withoutSignal, { onConflict: 'user_id,entry_date' }))
    }

    if (error) {
      if (error.code === UNDEFINED_TABLE) {
        // Table not migrated yet — don't block the experience in preview.
        return NextResponse.json({ ok: true, persisted: false, crisis })
      }
      console.error('[glimmer] insert failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Reward showing up. Idempotent per day, so editing today's glimmer never
    // double-grants. A hard day (no glimmer) still fills a little — never nothing.
    const gemsEarned = answered ? GEM_VALUES.glimmer_answered : GEM_VALUES.glimmer_showed_up
    await grantGems(
      requester.id,
      gemsEarned,
      answered ? 'glimmer_answered' : 'glimmer_showed_up',
      'glimmer',
      today,
    )
    const wallet = await getWalletState(requester.id)

    return NextResponse.json({ ok: true, persisted: true, crisis, wallet, gemsEarned })
  } catch (err) {
    console.error('[glimmer] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
