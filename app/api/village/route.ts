/**
 * /api/village — her side of the village.
 *
 * GET    → her link and every note she's been left
 * POST   → { action: 'rotate' | 'close' | 'open' } — control of the door
 * PATCH  → { seen: true } — mark notes read, so home stops surfacing them
 * DELETE → { id } — hide a note, immediately
 *
 * The delete and the rotate matter more than anything else here. Anyone with
 * the link can write to her, so the two things she must always be able to do
 * are remove a note and change the locks.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth-server'
import { isMissingTable } from '@/lib/pg-errors'
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

  const { data: notes } = await supabaseAdmin
    .from('village_notes')
    .select('id, from_name, body, created_at, seen_at')
    .eq('user_id', user.id)
    .eq('hidden', false)
    .order('created_at', { ascending: false })
    .limit(100)

  return NextResponse.json({
    code,
    active,
    notes: notes ?? [],
    unseen: (notes ?? []).filter(n => !n.seen_at).length,
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

  const { action } = await req.json() as { action?: string }

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

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser(req)
  if (!user || !supabaseAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabaseAdmin
    .from('village_notes')
    .update({ seen_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('seen_at', null)

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser(req)
  if (!user || !supabaseAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json() as { id?: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Scoped to her own id, so a guessed note id belonging to someone else is a no-op.
  const { error } = await supabaseAdmin
    .from('village_notes')
    .update({ hidden: true })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
