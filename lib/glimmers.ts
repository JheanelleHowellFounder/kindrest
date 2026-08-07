/**
 * The glimmer prompt bank.
 *
 * A "glimmer" is the opposite of a trigger — a small moment of ease, warmth, or
 * presence. The daily prompt is the same for everyone (decision: same daily
 * prompt), chosen deterministically from the date so the whole community is
 * reflecting on the same question on the same day.
 *
 * Every prompt is:
 *   - answerable in a sentence
 *   - gentle — never fishing for distress, never demanding
 *   - grounding — invites her into a moment of presence
 *
 * Categories are for our own balance while curating; the user never sees them.
 */

export type GlimmerCategory =
  | 'identity'      // "a moment I felt like myself" — the self-continuity thread (matrescence)
  | 'presence'
  | 'body'
  | 'connection'
  | 'joy'

export interface GlimmerPrompt {
  id: string
  text: string
  category: GlimmerCategory
}

// Grounded in: Deb Dana (glimmers / polyvagal — small, embodied micro-moments),
// Aurélie Athan (matrescence — the "felt like myself" self-continuity thread),
// and Rick Hanson / Barbara Fredrickson (savoring a specific remembered moment).
// Rules: anchor to one concrete moment · keep it small and embodied · thread
// self-recognition, never distress.
export const GLIMMER_PROMPTS: GlimmerPrompt[] = [
  { id: 'g-self-role',   text: 'When did you last feel most like yourself — not a role, just you?', category: 'identity' },
  { id: 'g-self-action', text: 'What’s something you did recently that felt unmistakably like you?', category: 'identity' },
  { id: 'g-shoulders',   text: 'When did you last notice your shoulders drop, even for a second?', category: 'body' },
  { id: 'g-smile',       text: 'What tiny thing made you smile today when you weren’t expecting to?', category: 'joy' },
  { id: 'g-yours',       text: 'What’s a small pleasure that’s just yours — tied to no one else’s needs?', category: 'joy' },
  { id: 'g-with',        text: 'When did you last feel genuinely with someone — a look, a laugh, a small understanding?', category: 'connection' },
  { id: 'g-alive',       text: 'What’s something recently that made you feel alive, not just functional?', category: 'identity' },
  { id: 'g-before',      text: 'When did you last catch a glimpse of the woman you were before all this — and feel glad she’s still here?', category: 'identity' },
  { id: 'g-keep',        text: 'What’s a moment from today you’d want to keep, even a plain one?', category: 'presence' },
  { id: 'g-body',        text: 'What did your body quietly enjoy today — warmth, rest, a good stretch, a first sip?', category: 'body' },
  { id: 'g-forward',     text: 'What are you quietly looking forward to, however small?', category: 'joy' },
]

/**
 * Days since the Unix epoch for a given date, in the local calendar sense.
 * Uses the date's Y/M/D so a day rolls at local midnight, not UTC.
 */
function dayIndex(date: Date): number {
  const utcMidnight = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.floor(utcMidnight / 86_400_000)
}

/**
 * Today's prompt — deterministic from the date, identical for every user.
 * Pass a date for testing; defaults to now.
 */
export function getTodaysPrompt(date: Date = new Date()): GlimmerPrompt {
  const idx = ((dayIndex(date) % GLIMMER_PROMPTS.length) + GLIMMER_PROMPTS.length) % GLIMMER_PROMPTS.length
  return GLIMMER_PROMPTS[idx]
}

/** Local YYYY-MM-DD for the given date (matches how entry_date is stored). */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
