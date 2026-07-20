/**
 * POST /api/org-inquiry
 *
 * Public endpoint — no auth required. Called from the "Let's get started"
 * form on /organizations. Saves the inquiry so nothing is ever lost, even
 * if the visitor's browser has no mail client configured for the mailto
 * fallback the form also triggers client-side.
 *
 * Request body:
 *   { name: string, company: string, employeeRange: string, message?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { name, company, employeeRange, message } = await req.json() as {
      name: string
      company: string
      employeeRange: string
      message?: string
    }

    if (!name || !company || !employeeRange) {
      return NextResponse.json({ error: 'name, company, and employeeRange are required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      console.warn('[org-inquiry] Supabase not configured, skipping persistence')
      return NextResponse.json({ ok: true, persisted: false })
    }

    const { error } = await supabaseAdmin.from('org_inquiries').insert({
      name,
      company,
      employee_range: employeeRange,
      message: message ?? null,
    })

    if (error) {
      console.error('[org-inquiry] Insert failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[org-inquiry] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
