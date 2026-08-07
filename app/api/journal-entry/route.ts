import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { requireUser } from '@/lib/auth-server'
import { grantGems, GEM_VALUES } from '@/lib/gems'

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

interface JournalProfile {
  patterns_summary: string | null
  recurring_triggers: string[]
  what_helps: string[]
  current_thread: string | null
  tone_notes: string | null
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  try {
    const { content, userId, source = 'journal' } = await req.json() as {
      content: string
      userId: string
      source?: string
    }

    if (!content || !userId) {
      return NextResponse.json({ error: 'content and userId required' }, { status: 400 })
    }

    // Journal entries are among the most sensitive data in the app — only the
    // real, signed-in owner of this userId may write to it.
    const requester = await requireUser(req)
    if (!requester || requester.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const trimmed = content.trim()

    const { error } = await supabaseAdmin.from('journal_entries').insert({
      user_id:      userId,
      content:      trimmed,
      input_method: 'text',
      source,
      entry_date:   new Date().toISOString().split('T')[0],
    })

    if (error) {
      console.error('[journal-entry] Insert failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Reward the act of writing. ref_id is null (each entry is its own event),
    // so multiple entries in a day each count.
    await grantGems(userId, GEM_VALUES.journal_entry, 'journal_entry', 'journal', null)

    // Update the living journal profile in the background — never blocks the response
    updateJournalProfile(userId, trimmed).catch(err =>
      console.error('[journal-entry] Profile update failed:', err instanceof Error ? err.message : err)
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[journal-entry] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

async function updateJournalProfile(userId: string, content: string) {
  if (!anthropic || !supabaseAdmin) return

  const { data: existing } = await supabaseAdmin
    .from('journal_profile')
    .select('patterns_summary, recurring_triggers, what_helps, current_thread, tone_notes')
    .eq('user_id', userId)
    .single()

  const existingContext = existing
    ? `Current profile:
- Patterns: ${existing.patterns_summary ?? 'none'}
- Triggers: ${existing.recurring_triggers?.join(', ') || 'none'}
- What helps: ${existing.what_helps?.join(', ') || 'none'}
- Current thread: ${existing.current_thread ?? 'none'}
- Tone: ${existing.tone_notes ?? 'none'}`
    : 'No profile yet — this is her first entry.'

  const profileCall = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: `You maintain a private profile of a mother based on her journal entries. Update it based on the new entry. Be concise. No quotes inside JSON string values — rephrase instead.

"what_helps" should list short category-like phrases describing what actually helps her (e.g. "quiet time alone", "movement", "talking to a friend", "reflection") — these are used to match her against a recommendation library, so keep them general and reusable, not overly specific to one entry.

Return only valid JSON, no markdown:
{
  "patterns_summary": "1-2 sentences on her emotional cycles and patterns",
  "recurring_triggers": ["short phrase", "short phrase"],
  "what_helps": ["short phrase", "short phrase"],
  "current_thread": "what is alive for her right now, 1 sentence",
  "tone_notes": "how she communicates, 1 sentence, so future responses match her energy"
}`,
    messages: [{
      role: 'user',
      content: `New entry: "${content}"\n\n${existingContext}`,
    }],
  })

  const block = profileCall.content.find(b => b.type === 'text')
  if (!block || block.type !== 'text') return

  let profile: JournalProfile
  try {
    const cleaned = block.text.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
    profile = JSON.parse(cleaned)
  } catch {
    console.error('[journal-entry] Profile parse error:', block.text)
    return
  }

  await supabaseAdmin.from('journal_profile').upsert({
    user_id: userId,
    patterns_summary: profile.patterns_summary,
    recurring_triggers: profile.recurring_triggers ?? [],
    what_helps: profile.what_helps ?? [],
    current_thread: profile.current_thread,
    tone_notes: profile.tone_notes,
    last_updated: new Date().toISOString(),
  }, { onConflict: 'user_id' })
}
