import { supabase } from '@/lib/supabase'

/**
 * fetch() that attaches the current user's Supabase session token as a
 * Bearer header, so server-side routes can verify who's actually calling
 * instead of trusting a userId passed in the URL or body.
 */
export async function authedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null

  const headers = new Headers(options.headers)
  if (session) headers.set('Authorization', `Bearer ${session.access_token}`)

  return fetch(url, { ...options, headers })
}
