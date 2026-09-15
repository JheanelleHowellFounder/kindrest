/**
 * Check-ins — the record of her showing up.
 *
 * A check-in is one time she goes through the check-in process: she reaches
 * her care kit, or she takes "I'm not sure" and writes instead. "Something
 * else" changes what she's offered, not the fact that she came, so it is the
 * SAME check-in.
 *
 * The server creates the row and hands its id to the app. A "Something else"
 * request sends that id back; if it's hers and recent, no new row is made.
 * Rows are never written from the phone (the table has no insert policy), so
 * a check-in can't be faked or double-counted by replaying a request.
 *
 * If the id is missing, invalid, not hers, or older than the reuse window, the
 * request is treated as a new check-in. The count errs toward her having shown
 * up, and nothing ever breaks the page.
 *
 * Everything that counts check-ins reads this table: History, the admin report
 * (including pilot partner numbers), and the hard-day nudge. See
 * docs/checkin-count-plan.md for the full map.
 */

import { supabaseAdmin } from '@/lib/supabase'
import { isMissingTable } from '@/lib/pg-errors'

/** A retry after this long is a new visit, not "Something else" on the same one. */
const REUSE_WINDOW_MS = 3 * 60 * 60 * 1000

export type CheckinSource = 'care_kit' | 'journal'

export async function recordCheckin(
  userId: string,
  details: { mood?: string | null; timeAvailable?: string | null; source: CheckinSource },
  existingId?: string | null,
): Promise<{ id: string | null; isNew: boolean }> {
  if (!supabaseAdmin) return { id: null, isNew: false }

  if (existingId) {
    // An invalid id simply finds nothing and falls through to a new check-in.
    const { data: prior } = await supabaseAdmin
      .from('checkins')
      .select('id, user_id, created_at')
      .eq('id', existingId)
      .maybeSingle()

    if (
      prior &&
      prior.user_id === userId &&
      Date.now() - new Date(prior.created_at).getTime() < REUSE_WINDOW_MS
    ) {
      return { id: prior.id, isNew: false }
    }
  }

  const { data: made, error } = await supabaseAdmin
    .from('checkins')
    .insert({
      user_id: userId,
      mood: details.mood ?? null,
      time_available: details.timeAvailable ?? null,
      source: details.source,
    })
    .select('id')
    .single()

  // Before supabase/checkins.sql is run the table is missing: keep the old
  // counter behaviour below so nothing regresses, and say nothing.
  if (error && !isMissingTable(error)) console.error('[checkins] insert failed:', error.message)

  await bumpLegacyCounters(userId)
  return { id: made?.id ?? null, isNew: true }
}

/**
 * The counter on user_preference_profile and the first_checkin_at stamp.
 *
 * Both now move only on a NEW check-in, so anything still reading them stays
 * correct. Non-fatal: instrumentation must never break a check-in.
 */
async function bumpLegacyCounters(userId: string) {
  if (!supabaseAdmin) return
  try {
    const { data: existing } = await supabaseAdmin
      .from('user_preference_profile')
      .select('total_checkins')
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      await supabaseAdmin
        .from('user_preference_profile')
        .update({ total_checkins: (existing.total_checkins ?? 0) + 1, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
    } else {
      await supabaseAdmin
        .from('user_preference_profile')
        .insert({ user_id: userId, total_checkins: 1, updated_at: new Date().toISOString() })
    }

    // Activation is "first check-in within 48h of signup". Stamped once.
    await supabaseAdmin
      .from('user_profiles')
      .update({ first_checkin_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('first_checkin_at', null)
  } catch (err) {
    console.error('[checkins] counter update failed:', err instanceof Error ? err.message : err)
  }
}
