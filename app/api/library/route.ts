/**
 * GET /api/library?userId=…
 *
 * Returns every recommendation the user has saved or completed (rating >= 2),
 * deduplicated by title, keeping the highest rating per technique.
 * No item cap — returns the full history.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth-server'

export interface LibraryItem {
  rec_id:     number
  title:      string
  category:   string
  rating:     number   // 2 = saved, 3 = done
  count:      number   // total interactions with this rec
  lastUsed:   string   // ISO string
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  // A mom's saved library is hers alone — verify the caller is actually
  // signed in as the user they're asking about.
  const requester = await requireUser(req)
  if (!requester || requester.id !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: feedback, error } = await supabaseAdmin
    .from('recommendation_feedback')
    .select('rec_id, rec_title, rating, category, created_at')
    .eq('user_id', userId)
    .gte('rating', 2)
    .order('created_at', { ascending: false })

  if (error || !feedback) {
    return NextResponse.json({ items: [] })
  }

  // Deduplicate by rec_title; keep highest rating + most recent lastUsed
  const itemMap = new Map<string, LibraryItem>()
  for (const f of feedback) {
    if (!f.rec_title) continue
    const existing = itemMap.get(f.rec_title)
    if (!existing) {
      itemMap.set(f.rec_title, {
        rec_id:   f.rec_id,
        title:    f.rec_title,
        category: f.category ?? '',
        rating:   f.rating,
        count:    1,
        lastUsed: f.created_at,
      })
    } else {
      existing.count++
      if (f.rating > existing.rating) existing.rating = f.rating
      // first occurrence is already most recent (sorted desc)
    }
  }

  const items = Array.from(itemMap.values())
    .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())

  return NextResponse.json({ items })
}
