import { supabaseAdmin } from '@/lib/supabase'
import type { NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'

/**
 * Verifies the request carries a valid Supabase session and returns the
 * authenticated user, or null if the token is missing/invalid. Server-side
 * routes must use this to confirm who is actually calling — never trust a
 * userId passed in a query param or request body on its own.
 */
export async function requireUser(req: NextRequest): Promise<User | null> {
  if (!supabaseAdmin) return null

  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return null

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  return user
}
