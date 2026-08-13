/**
 * /api/org/join
 *
 * GET  ?slug=…  — public. Returns the org's display name so the join page can
 *                 greet a cohort by name before anyone signs in.
 * POST { slug }  — links the signed-in user to that org. Called once, right
 *                 after she finishes onboarding.
 *
 * Membership lives in its own table rather than on user_profiles, so a missing
 * column can never take the profile query (and the admin report) down with it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'
const UNDEFINED_TABLE = '42P01'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.trim().toLowerCase()
  if (!slug || !supabaseAdmin) return NextResponse.json({ org: null })

  const { data, error } = await supabaseAdmin
    .from('organizations')
    .select('slug, name')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !data) return NextResponse.json({ org: null })
  return NextResponse.json({ org: data })
}

export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json() as { slug?: string }
    const requester = await requireUser(req)
    if (!requester) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const clean = slug?.trim().toLowerCase()
    if (!clean || !supabaseAdmin) return NextResponse.json({ ok: true, linked: false })

    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('slug', clean)
      .eq('status', 'active')
      .maybeSingle()

    if (!org) return NextResponse.json({ ok: true, linked: false })

    const { error } = await supabaseAdmin
      .from('org_members')
      .upsert({ org_id: org.id, user_id: requester.id }, { onConflict: 'org_id,user_id' })

    if (error && error.code !== UNDEFINED_TABLE) {
      console.error('[org/join] link failed:', error.message)
      return NextResponse.json({ ok: true, linked: false })
    }

    return NextResponse.json({ ok: true, linked: true })
  } catch (err) {
    console.error('[org/join] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ ok: true, linked: false })
  }
}
