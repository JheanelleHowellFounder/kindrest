/**
 * Rules for the notes her village leaves.
 *
 * Anyone holding the link can write, without an account. That is the whole
 * point — asking a grandmother to sign up would kill it — but it means the
 * limits below are the only thing standing between her and whatever arrives.
 * They're deliberately blunt.
 */

export const NOTE_MAX = 280
export const NAME_MAX = 40

/** Notes per recipient per hour. Generous for a real village, useless for a flood. */
export const NOTE_RATE_LIMIT = 8
export const NOTE_RATE_WINDOW_MS = 60 * 60 * 1000

/** Codes get read aloud and typed by hand — no 0/O/1/I/L. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function newVillageCode(len = 8): string {
  let out = ''
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length]
  return out
}

const URL_PATTERN = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|co|ly|me|app|link)\b)/i

export interface NoteCheck {
  ok: boolean
  /** Shown to the person writing. Plain, never scolding. */
  error?: string
  name?: string
  body?: string
}

/**
 * Validate a note before it reaches her.
 *
 * Links are refused outright. A note is a kind word, not a delivery mechanism —
 * and blocking URLs removes phishing and spam in one line, which is worth far
 * more here than the rare person who wanted to share a recipe.
 */
export function checkNote(rawName: unknown, rawBody: unknown): NoteCheck {
  const name = typeof rawName === 'string' ? rawName.trim() : ''
  const body = typeof rawBody === 'string' ? rawBody.trim() : ''

  if (!name) return { ok: false, error: 'Please add your name so she knows who it’s from.' }
  if (name.length > NAME_MAX) return { ok: false, error: 'That name is a little long.' }

  if (!body) return { ok: false, error: 'Write her a line first.' }
  if (body.length > NOTE_MAX) return { ok: false, error: `Keep it under ${NOTE_MAX} characters.` }

  if (URL_PATTERN.test(body) || URL_PATTERN.test(name)) {
    return { ok: false, error: 'Notes can’t include links — just your words.' }
  }

  return { ok: true, name, body }
}
