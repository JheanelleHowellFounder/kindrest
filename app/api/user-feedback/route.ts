/**
 * POST /api/user-feedback
 *
 * Saves in-app feedback from a logged-in user to the user_feedback table.
 *
 * Body: { userId: string, email: string, message: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { userId, email, message } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      console.warn('[user-feedback] Supabase not configured')
      return NextResponse.json({ ok: true, persisted: false })
    }

    const { error } = await supabaseAdmin
      .from('user_feedback')
      .insert({
        user_id:    userId ?? null,
        email:      email  ?? null,
        message:    message.trim(),
      })

    if (error) {
      console.error('[user-feedback] Insert error:', error)
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[user-feedback] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
