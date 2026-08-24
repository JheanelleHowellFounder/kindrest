/**
 * /api/village — her side of the village.
 *
 * GET    → her link, her kept notes, and anything waiting for approval
 * POST   → { action } — 'rotate' | 'close' | 'open' for the door,
 *          'allow' | 'block' + noteId for a sender
 * PATCH  → mark kept notes read, so home stops surfacing them
 * DELETE → { id } — hide a note, immediately
 *
 * The first note from a name she hasn't heard from waits as 'pending'. Allowing
 * a sender trusts them from then on; blocking hides everything of theirs and
 * quietly drops what they send next.
 *
 * The delete and the rotate matter more than anything else here. Anyone with
 * the link can write to her, so the two things she must always be able to do
 * are remove a note and change the locks.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth-server'
import { isMissingTable, isMissingColumn } from '@/lib/pg-errors'
import { newVillageCode } from '@/lib/village'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user || !supabaseAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const link = await supabaseAdmin
    .from('village_links')
    .select('code, active')
    .eq('user_id', user.id)
    .maybeSingle()

  if (isMissingTable(link.error)) return NextResponse.json({ needsMigration: true })

  let code = link.data?.code ?? null
  let active = link.data?.active ?? true

  if (!code) {
    const made = await createLink(user.id)
    if (!made) return NextResponse.json({ error: 'Could not create your link' }, { status: 500 })
    code = made
    active = true
  }

  let { data: notes, error: notesErr } = await supabaseAdmin
    .from('village_notes')
    .select('id, from_name, body, created_at, seen_at, status')
    .eq('user_id', user.id)
    .neq('status', 'hidden')
    .order('created_at', { ascending: false })
    .limit(100)

  // Before the approval migration there was no status column; everything that
  // wasn't hidden was simply visible.
  if (isMissingColumn(notesErr)) {
    const legacy = await supabaseAdmin
      .from('village_notes')
      .select('id, from_name, body, created_at, seen_at')
      .eq('user_id', user.id)
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .limit(100)
    notes = (legacy.data ?? []).map(n => ({ ...n, status: 'kept' }))
  }

  const all = notes ?? []
  const kept = all.filter(n => n.status !== 'pending')
  const pending = all.filter(n => n.status === 'pending')

  return NextResponse.json({
    code,
    active,
    notes: kept,
    pending,
    unseen: kept.filter(n => !n.seen_at).length,
  })
}

async function createLink(userId: string): Promise<string | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newVillageCode()
    const { error } = await supabaseAdmin!.from('village_links').insert({ code, user_id: userId })
    if (!error) return code
    if (error.code !== '23505') return null
    // Duplicate — either the code collided, or a concurrent request made hers.
    const existing = await supabaseAdmin!
      .from('village_links').select('code').eq('user_id', userId).maybeSingle()
    if (existing.data?.code) return existing.data.code
  }
  return null
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user || !supabaseAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await req.json() as { action?: string; noteId?: string }
  const { action } = payload

  if (action === 'close' || action === 'open') {
    await supabaseAdmin.from('village_links')
      .update({ active: action === 'open' })
      .eq('user_id', user.id)
    return NextResponse.json({ ok: true, active: action === 'open' })
  }

  if (action === 'rotate') {
    // Old link stops working the moment this lands. Her notes are kept — they
    // belong to her, not to the link they arrived through.
    await supabaseAdmin.from('village_links').delete().eq('user_id', user.id)
    const code = await createLink(user.id)
    if (!code) return NextResponse.json({ error: 'Could not make a new link' }, { status: 500 })
    return NextResponse.json({ ok: true, code, active: true })
  }

  // Allow or block a sender, and settle every note already waiting from them.
  if (action === 'allow' || action === 'block') {
    const { noteId } = payload
    if (!noteId) return NextResponse.json({ error: 'noteId required' }, { status: 400 })

    const { data: note } = await supabaseAdmin
      .from('village_notes')
      .select('from_name')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const nameKey = (note.from_name ?? '').toLowerCase().trim()
    const allowed = action === 'allow'

    await supabaseAdmin.from('village_senders').upsert(
      { user_id: user.id, name_key: nameKey, status: allowed ? 'allowed' : 'blocked' },
      { onConflict: 'user_id,name_key' }
    )

    // Everything waiting from this name resolves the same way, so she isn't
    // asked about the same person twice.
    await supabaseAdmin
      .from('village_notes')
      .update({ status: allowed ? 'kept' : 'hidden' })
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .ilike('from_name', nameKey)

    return NextResponse.json({ ok: true, allowed })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser(req)
  if (!user || !supabaseAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stamp = supabaseAdmin
    .from('village_notes')
    .update({ seen_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('seen_at', null)

  // Only notes she's actually allowed to see count as seen.
  const { error } = await stamp.neq('status', 'pending')
  if (isMissingColumn(error)) {
    await supabaseAdmin
      .from('village_notes')
      .update({ seen_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('seen_at', null)
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser(req)
  if (!user || !supabaseAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json() as { id?: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Scoped to her own id, so a guessed note id belonging to someone else is a no-op.
  let { error } = await supabaseAdmin
    .from('village_notes')
    .update({ hidden: true, status: 'hidden' })
    .eq('id', id)
    .eq('user_id', user.id)

  // Pre-migration there is no status column; hidden alone still removes it.
  if (isMissingColumn(error)) {
    ;({ error } = await supabaseAdmin
      .from('village_notes')
      .update({ hidden: true })
      .eq('id', id)
      .eq('user_id', user.id))
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
