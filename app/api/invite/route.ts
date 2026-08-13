/**
 * /api/invite — one mother handing Kindrest to another.
 *
 * GET  → her own link, creating her code the first time she asks
 * POST → claim a code after signup, attributing her to whoever invited her
 *
 * Degrades the same way the rest of the app does: if the referrals migration
 * hasn't been run, GET reports that plainly and POST quietly does nothing.
 * A missing table must never block a mother from finishing onboarding.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth-server'
import { isMissingTable } from '@/lib/pg-errors'

export const dynamic = 'force-dynamic'

/**
 * Short, unambiguous codes. No 0/O/1/I/L — these get read aloud and typed by
 * hand, and a code she can't dictate to a friend isn't much of an invite.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function newCode(len = 7): string {
  let out = ''
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length]
  return out
}

export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user || !supabaseAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const existing = await supabaseAdmin
    .from('referral_codes')
    .select('code')
    .eq('user_id', user.id)
    .maybeSingle()

  if (isMissingTable(existing.error)) {
    return NextResponse.json({ needsMigration: true })
  }

  if (existing.data?.code) {
    return NextResponse.json({ code: existing.data.code, joined: await countJoined(user.id) })
  }

  // First time she's asked for her link. Retry on the vanishingly unlikely
  // collision rather than handing her an error.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode()
    const { error } = await supabaseAdmin.from('referral_codes').insert({ code, user_id: user.id })
    if (!error) return NextResponse.json({ code, joined: 0 })
    if (error.code !== '23505') break          // not a duplicate — real failure
    // A concurrent request may have created hers already; take that one.
    const raced = await supabaseAdmin
      .from('referral_codes').select('code').eq('user_id', user.id).maybeSingle()
    if (raced.data?.code) return NextResponse.json({ code: raced.data.code, joined: 0 })
  }

  return NextResponse.json({ error: 'Could not create an invite link' }, { status: 500 })
}

async function countJoined(userId: string): Promise<number> {
  const { count } = await supabaseAdmin!
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', userId)
  return count ?? 0
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user || !supabaseAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { code } = await req.json() as { code?: string }
  const clean = (code ?? '').trim().toUpperCase()
  if (!clean) return NextResponse.json({ ok: true, attributed: false })

  const { data: owner, error } = await supabaseAdmin
    .from('referral_codes')
    .select('user_id')
    .eq('code', clean)
    .maybeSingle()

  // Unknown code, or the migration isn't run — she still gets in, silently.
  if (error || !owner) return NextResponse.json({ ok: true, attributed: false })

  // Nobody refers themselves.
  if (owner.user_id === user.id) return NextResponse.json({ ok: true, attributed: false })

  const { error: insertError } = await supabaseAdmin.from('referrals').insert({
    code: clean,
    referrer_id: owner.user_id,
    invitee_id: user.id,
  })

  // 23505 = already attributed. Not an error — just means she's counted once.
  const attributed = !insertError || insertError.code === '23505'
  return NextResponse.json({ ok: true, attributed })
}
