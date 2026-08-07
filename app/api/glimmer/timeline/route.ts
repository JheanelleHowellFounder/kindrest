/**
 * GET /api/glimmer/timeline
 *
 * Her own saved glimmers, newest first. Private to the signed-in owner.
 * Degrades to an empty list if the table isn't migrated yet.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth-server'

const UNDEFINED_TABLE = '42P01'

export async function GET(req: NextRequest) {
  const requester = await requireUser(req)
  if (!requester) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ glimmers: [] })
  }

  const { data, error } = await supabaseAdmin
    .from('glimmers')
    .select('id, prompt_text, body, entry_date, created_at')
    .eq('user_id', requester.id)
    .not('body', 'is', null)
    .order('entry_date', { ascending: false })
    .limit(120)

  if (error) {
    if (error.code === UNDEFINED_TABLE) {
      return NextResponse.json({ glimmers: [] })
    }
    console.error('[glimmer] timeline failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ glimmers: data ?? [] })
}
