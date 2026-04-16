/**
 * POST /api/mailerlite/subscribe
 *
 * Adds a Kindrest user to a MailerLite group.
 * Called server-side so the API key is never exposed to the client.
 *
 * Body: { userId: string, group: 'waitlist' | 'active_users' }
 *
 * Groups:
 *   waitlist      → Airtable Waitlist   (184867172429857993)
 *   active_users  → Active Users        (184916616032552716)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const ML_API   = 'https://connect.mailerlite.com/api'
const ML_TOKEN = process.env.MAILERLITE_API_KEY

const GROUP_IDS: Record<string, string> = {
  waitlist:     '184867172429857993',
  active_users: '184916616032552716',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function mlFetch(path: string, options: RequestInit = {}) {
  return fetch(`${ML_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${ML_TOKEN}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
}

async function getOrCreateSubscriber(email: string, name: string): Promise<string | null> {
  // Check if subscriber already exists
  const check = await mlFetch(`/subscribers/${encodeURIComponent(email)}`)

  if (check.ok) {
    const data = await check.json()
    return data.data?.id ?? null
  }

  // Create new subscriber
  const create = await mlFetch('/subscribers', {
    method: 'POST',
    body: JSON.stringify({
      email,
      fields: { name },
    }),
  })

  if (!create.ok) {
    console.error('[MailerLite] Failed to create subscriber:', await create.text())
    return null
  }

  const created = await create.json()
  return created.data?.id ?? null
}

async function addToGroup(subscriberId: string, groupId: string): Promise<boolean> {
  const res = await mlFetch(`/subscribers/${subscriberId}/groups/${groupId}`, {
    method: 'POST',
  })
  return res.ok || res.status === 409 // 409 = already in group, that's fine
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!ML_TOKEN) {
    return NextResponse.json({ error: 'MailerLite not configured' }, { status: 503 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const { userId, group } = await req.json()

  if (!userId || !group) {
    return NextResponse.json({ error: 'userId and group are required' }, { status: 400 })
  }

  const groupId = GROUP_IDS[group]
  if (!groupId) {
    return NextResponse.json({ error: `Unknown group: ${group}` }, { status: 400 })
  }

  // ── Look up email + name from Supabase ────────────────────────────────────
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
  const email = authUser?.user?.email

  if (!email) {
    return NextResponse.json({ error: 'User email not found' }, { status: 404 })
  }

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('name')
    .eq('user_id', userId)
    .single()

  const name = profile?.name ?? email.split('@')[0]

  // ── Add to MailerLite group ───────────────────────────────────────────────
  const subscriberId = await getOrCreateSubscriber(email, name)
  if (!subscriberId) {
    return NextResponse.json({ error: 'Could not create MailerLite subscriber' }, { status: 500 })
  }

  const added = await addToGroup(subscriberId, groupId)
  if (!added) {
    return NextResponse.json({ error: 'Could not add subscriber to group' }, { status: 500 })
  }

  return NextResponse.json({ success: true, email, group })
}
