/**
 * Her stored timezone, for server code that needs to date something.
 *
 * Returns null whenever we do not know it — a mother who has not opened the
 * app since the column shipped, a missing column before the migration runs, or
 * any error at all. Every caller falls back to UTC on null, which is exactly
 * what Kindrest did before, so nothing here can break a save.
 */

import { supabaseAdmin } from '@/lib/supabase'

export async function getUserZone(userId: string): Promise<string | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from('user_preference_profile')
    .select('timezone')
    .eq('user_id', userId)
    .maybeSingle()

  // Deliberately quiet: a missing column before the migration is expected, and
  // dating something in UTC is a far better outcome than failing to save it.
  if (error) return null

  return (data?.timezone as string | null) ?? null
}
