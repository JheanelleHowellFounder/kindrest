/**
 * /api/admin/orgs — manage Kindrest @ Work pilots.
 *
 * GET   — list every pilot with how many have joined
 * POST  — add a pilot { name, cohortSize }, slug generated from the name
 * PATCH — end or reactivate a pilot { slug, status }
 *
 * Admin-only. Same gate as the report: a valid session belonging to an admin.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ADMIN_EMAILS } from '@/lib/admin'
import { isMissingTable } from '@/lib/pg-errors'

export const dynamic = 'force-dynamic'

async function requireAdmin(req: NextRequest) {
  if (!supabaseAdmin) return null
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user || !ADMIN_EMAILS.includes(user.email ?? '')) return null
  return user
}

/** "PagerDuty" → "pagerduty", "Atlanta Public Schools" → "atlanta-public-schools" */
function toSlug(name: string): string {
  return name.trim().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: orgs, error } = await supabaseAdmin!
    .from('organizations')
    .select('id, slug, name, cohort_size, status, started_on')
    .order('created_at', { ascending: false })

  if (error) {
    // Tables not migrated yet — tell the UI so it can say so plainly.
    if (isMissingTable(error)) return NextResponse.json({ orgs: [], needsMigration: true })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: members } = await supabaseAdmin!.from('org_members').select('org_id')
  const counts = new Map<string, number>()
  for (const m of members ?? []) counts.set(m.org_id, (counts.get(m.org_id) ?? 0) + 1)

  return NextResponse.json({
    orgs: (orgs ?? []).map(o => ({ ...o, joined: counts.get(o.id) ?? 0 })),
    needsMigration: false,
  })
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, cohortSize } = await req.json() as { name?: string; cohortSize?: number | string }
  const clean = (name ?? '').trim()
  if (!clean) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const slug = toSlug(clean)
  if (!slug) return NextResponse.json({ error: 'That name can’t be turned into a link' }, { status: 400 })

  const size = Number(cohortSize)
  const { data, error } = await supabaseAdmin!
    .from('organizations')
    .insert({ slug, name: clean, cohort_size: Number.isFinite(size) && size > 0 ? size : null })
    .select('slug, name, cohort_size')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: `“${clean}” already exists.` }, { status: 409 })
    if (isMissingTable(error)) return NextResponse.json({ error: 'Run the organizations migration first.' }, { status: 400 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, org: data })
}

export async function PATCH(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug, status } = await req.json() as { slug?: string; status?: string }
  if (!slug || !['active', 'ended'].includes(status ?? '')) {
    return NextResponse.json({ error: 'slug and a valid status are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin!.from('organizations').update({ status }).eq('slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
