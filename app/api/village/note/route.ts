/**
 * /api/village/note — the public door.
 *
 * GET  ?code=…  → whose village this is (first name only), and whether it's open
 * POST { code, from, body } → leave her a note
 *
 * No account, by design: asking her mother or her best friend to sign up would
 * kill the feature. That means this endpoint is open to anyone holding the
 * link, so it validates hard and gives nothing away.
 *
 * What it deliberately never returns: her surname, her email, her user id, or
 * anything she has written. A person leaving a note learns a first name and
 * nothing else, even if they start guessing codes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { checkNote, NOTE_RATE_LIMIT, NOTE_RATE_WINDOW_MS } from '@/lib/village'

export const dynamic = 'force-dynamic'

/** Resolve a code to its owner. Returns null for unknown or closed links. */
async function ownerOf(code: string): Promise<{ userId: string; firstName: string } | null> {
  if (!supabaseAdmin) return null

  const { data: link } = await supabaseAdmin
    .from('village_links')
    .select('user_id, active')
    .eq('code', code)
    .maybeSingle()

  if (!link || !link.active) return null

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('name')
    .eq('user_id', link.user_id)
    .maybeSingle()

  const firstName = (profile?.name ?? '').trim().split(/\s+/)[0] || 'her'
  return { userId: link.user_id, firstName }
}

export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get('code') ?? '').trim().toUpperCase()
  if (!code) return NextResponse.json({ open: false, name: null })

  const owner = await ownerOf(code)
  if (!owner) return NextResponse.json({ open: false, name: null })

  return NextResponse.json({ open: true, name: owner.firstName })
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Unavailable' }, { status: 503 })

  const { code, from, body } = await req.json() as
    { code?: string; from?: unknown; body?: unknown }

  const clean = (code ?? '').trim().toUpperCase()
  if (!clean) return NextResponse.json({ error: 'That link doesn’t look right.' }, { status: 400 })

  const check = checkNote(from, body)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

  const owner = await ownerOf(clean)
  // Same answer for "no such link" and "she closed it" — nothing to probe.
  if (!owner) {
    return NextResponse.json({ error: 'This link isn’t active anymore.' }, { status: 404 })
  }

  // Has she heard from this name before? First note from someone new waits for
  // her; after that they're trusted and it goes straight to her home screen.
  const nameKey = check.name!.toLowerCase().trim()
  const { data: sender } = await supabaseAdmin
    .from('village_senders')
    .select('status')
    .eq('user_id', owner.userId)
    .eq('name_key', nameKey)
    .maybeSingle()

  // Blocked senders get the same success response as everyone else. Telling
  // them they've been blocked only invites them to come back under a new name.
  if (sender?.status === 'blocked') {
    return NextResponse.json({ ok: true, name: owner.firstName })
  }

  const trusted = sender?.status === 'allowed'

  // Rate limit, scoped to the sender's standing.
  //
  // A single limit across everything let a stranger with her link post eight
  // notes she hadn't even seen and lock out her mother for the hour. So a
  // trusted sender is measured only against other trusted notes, and unknown
  // senders only against the pending pile — strangers can crowd out strangers,
  // never the people she has already welcomed.
  const since = new Date(Date.now() - NOTE_RATE_WINDOW_MS).toISOString()
  const { count } = await supabaseAdmin
    .from('village_notes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', owner.userId)
    .eq('status', trusted ? 'kept' : 'pending')
    .gte('created_at', since)

  if ((count ?? 0) >= NOTE_RATE_LIMIT) {
    return NextResponse.json(
      { error: 'She’s had a lot of notes in the last hour. Try again a bit later.' },
      { status: 429 }
    )
  }

  const { error } = await supabaseAdmin.from('village_notes').insert({
    user_id: owner.userId,
    from_name: check.name,
    body: check.body,
    status: trusted ? 'kept' : 'pending',
  })

  if (error) {
    console.error('[village/note] insert failed:', error.message)
    return NextResponse.json({ error: 'That didn’t send. Try once more?' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, name: owner.firstName })
}
