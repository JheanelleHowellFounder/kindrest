/**
 * POST /api/waitlist
 *
 * Public endpoint — no auth required.
 * Called from the landing page WaitlistForm.
 *
 * Request body:
 *   {
 *     email:            string    // required
 *     name?:            string
 *     birthday?:        string    // ISO date e.g. "1990-05-14"
 *     numKids?:         number
 *     kidsAges?:        string    // freeform e.g. "3, 7, 12"
 *     zipCode?:         string
 *     selfCareRoutine?: string    // single value from dropdown
 *   }
 *
 * What it does:
 *   1. Validates the email
 *   2. Saves to Supabase `waitlist` table (graceful if table doesn't exist yet)
 *   3. Adds to MailerLite "waitlist" group (graceful if key not configured)
 *   4. Returns { success: true }
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

async function addToMailerLite(email: string, name?: string): Promise<void> {
  if (!ML_TOKEN) return   // not configured — skip silently

  try {
    // Upsert subscriber
    const upsert = await mlFetch('/subscribers', {
      method: 'POST',
      body: JSON.stringify({
        email,
        fields: name ? { name } : undefined,
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

    // Add to waitlist group (409 = already in group, fine)
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
      birthday,
      numKids,
      kidsAges,
      zipCode,
      selfCareRoutine,
    } = body as {
      email: string
      name?: string
      birthday?: string
      numKids?: number | null
      kidsAges?: string
      zipCode?: string
      selfCareRoutine?: string
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // ── 1. Save to Supabase ──────────────────────────────────────────────────
    if (supabaseAdmin) {
      const { error: dbError } = await supabaseAdmin
        .from('waitlist')
        .upsert(
          {
            email: normalizedEmail,
            name:               name?.trim() || null,
            birthday:           birthday || null,
            num_kids:           numKids ?? null,
            kids_ages:          kidsAges?.trim() || null,
            zip_code:           zipCode?.trim() || null,
            self_care_routine:  selfCareRoutine || null,
            updated_at:         new Date().toISOString(),
          },
          { onConflict: 'email', ignoreDuplicates: false }
        )

      if (dbError) {
        // Log but don't fail — table might not exist yet during initial setup
        console.warn('[waitlist] Supabase insert error:', dbError.message)
      }
    } else {
      console.warn('[waitlist] Supabase not configured, skipping DB save')
    }

    // ── 2. Add to MailerLite waitlist group ──────────────────────────────────
    await addToMailerLite(normalizedEmail, name)

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[waitlist] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
