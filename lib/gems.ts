/**
 * Gems + Reserve (V1).
 *
 * Gems are earned by small acts of care — they only ever go up (until the store
 * exists in V2). The Reserve is a 0–100 vessel showing how full she is *right
 * now*, filled by what she's done over a recent window. It rises when she shows
 * up and gently eases when she's away — but NEVER by removing gems she earned.
 * Presence is rewarded; absence is never punished.
 *
 * The ledger (`gem_ledger`) is the single source of truth. Balance and reserve
 * are both computed from it, so nothing can drift.
 */

import { supabaseAdmin } from '@/lib/supabase'

export const GEM_VALUES = {
  glimmer_answered:  5,   // she noticed a glimmer
  glimmer_showed_up: 2,   // no glimmer, but she showed up (quiet/heavy) — still counts
  journal_entry:     3,
  practice_done:     3,   // marked a care-kit practice "did it"
  rest_square:       2,   // completed a Rest Card square
  rest_line:        10,   // completed a full line (row/column/diagonal)
} as const

export const RESERVE_WINDOW_DAYS = 7
// Gems earned within the window that fill the reserve to 100%. Tuned so a few
// days of small actions fills it, and one glimmer makes a visible move.
export const RESERVE_TARGET = 25

const UNDEFINED_TABLE = '42P01'   // relation does not exist (table not migrated)
const UNIQUE_VIOLATION = '23505'  // already granted for this ref → idempotent no-op

/**
 * Grant gems. Idempotent per (refType, refId): the same source event grants once,
 * so editing today's glimmer or a retried request never double-counts.
 * Best-effort — never throws into the caller's request path.
 */
export async function grantGems(
  userId: string,
  amount: number,
  reason: string,
  refType: string,
  refId: string | null,
): Promise<void> {
  if (!supabaseAdmin || amount <= 0) return
  const { error } = await supabaseAdmin.from('gem_ledger').insert({
    user_id: userId, delta: amount, reason, ref_type: refType, ref_id: refId,
  })
  if (error && error.code !== UNIQUE_VIOLATION && error.code !== UNDEFINED_TABLE) {
    console.error('[gems] grant failed:', error.message)
  }
}

export interface WalletState {
  balance: number     // lifetime earned (becomes spendable in V2)
  reservePct: number  // 0–100, filled by recent care
}

export async function getWalletState(userId: string): Promise<WalletState> {
  if (!supabaseAdmin) return { balance: 0, reservePct: 0 }

  const { data, error } = await supabaseAdmin
    .from('gem_ledger')
    .select('delta, created_at')
    .eq('user_id', userId)

  if (error || !data) return { balance: 0, reservePct: 0 }

  const balance = data.reduce((sum, r) => sum + r.delta, 0)

  const cutoff = Date.now() - RESERVE_WINDOW_DAYS * 86_400_000
  const recent = data
    .filter(r => new Date(r.created_at).getTime() >= cutoff)
    .reduce((sum, r) => sum + r.delta, 0)

  const reservePct = Math.max(0, Math.min(100, Math.round((recent / RESERVE_TARGET) * 100)))

  return { balance, reservePct }
}
