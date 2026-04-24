/**
 * POST /api/waitlist
 *
 * Public endpoint — no auth required.
 * Called from the landing page WaitlistForm.
 *
 * Request body:
 *   {
 *     email:             string    // required
 *     name?:             string
 *     numKids?:          number    // 0 = not a mom, ≥1 = mom
 *     zipCode?:          string
 *     selfCareRoutine?:  string
 *     isMom?:            boolean   // derived from numKids on the client, stored here
 *   }
 *
 * What it does:
 *   1. Saves everyone to Supabase `waitlist` table with is_mom flag
 *   2. Adds everyone to MailerLite waitlist group — is_mom stored as custom field
 *      so you can segment moms vs supporters in automations
 *   3. Returns { success: true }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const ML_API   = 'https://connect.mailerlite.com/api'
const ML_TOKEN = process.env.MAILERLITE_API_KEY
const ML_GROUP = '184867172429857993'   // "Airtable Waitlist" group

// ── MailerLite helpers ────────────────────────────────────────────────────────

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

async function addToMailerLite(
  email: string,
  name?: string,
  isMom?: boolean
): Promise<void> {
  if (!ML_TOKEN) return   // not configured — skip silently

  try {
    // Upsert subscriber with name + is_mom custom field
    const upsert = await mlFetch('/subscribers', {
      method: 'POST',
      body: JSON.stringify({
        email,
        fields: {
          ...(name ? { name } : {}),
          // Custom field — create "is_mom" in MailerLite if it doesn't exist yet
          is_mom: isMom ? 'yes' : 'no',
        },
      }),
    })

    let subscriberId: string | null = null

    if (upsert.ok) {
      const data = await upsert.json()
      subscriberId = data.data?.id ?? null
    } else if (upsert.status === 409 || upsert.status === 422) {
      // Already exists — fetch by email
      const check = await mlFetch(`/subscribers/${encodeURIComponent(email)}`)
      if (check.ok) {
        const data = await check.json()
        subscriberId = data.data?.id ?? null
      }
    }

    if (!subscriberId) {
      console.warn('[waitlist] Could not get MailerLite subscriber ID for', email)
      return
    }

    // Add to waitlist group — everyone, mom or not (409 = already in group, fine)
    await mlFetch(`/subscribers/${subscriberId}/groups/${ML_GROUP}`, {
      method: 'POST',
    })
  } catch (err) {
    // Never let MailerLite failures block the user
    console.error('[waitlist] MailerLite error:', err)
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      email,
      name,
      numKids,
      zipCode,
      selfCareRoutine,
      isMom,
    } = body as {
      email: string
      name?: string
      numKids?: number | null
      zipCode?: string
      selfCareRoutine?: string
      isMom?: boolean
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const momStatus = isMom ?? (typeof numKids === 'number' ? numKids >= 1 : false)

    // ── 1. Save to Supabase ──────────────────────────────────────────────────
    if (supabaseAdmin) {
      const { error: dbError } = await supabaseAdmin
        .from('waitlist')
        .upsert(
          {
            email:              normalizedEmail,
            name:               name?.trim() || null,
            num_kids:           numKids ?? null,
            zip_code:           zipCode?.trim() || null,
            self_care_routine:  selfCareRoutine || null,
            is_mom:             momStatus,
            updated_at:         new Date().toISOString(),
          },
          { onConflict: 'email', ignoreDuplicates: false }
        )

      if (dbError) {
        console.warn('[waitlist] Supabase insert error:', dbError.message)
      }
    } else {
      console.warn('[waitlist] Supabase not configured, skipping DB save')
    }

    // ── 2. Add to MailerLite — everyone gets added ────────────────────────────
    await addToMailerLite(normalizedEmail, name, momStatus)

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[waitlist] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
