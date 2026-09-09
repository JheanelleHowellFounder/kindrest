/**
 * The Rest Card — a 3×3 board that is a *record of what already happened*, not a
 * to-do list. Nothing here is an assignment, target, or countdown, and nothing is
 * earned: she never has to work for her rest.
 *
 * Layout (positions 0–8, row-major):
 *
 *     suggested  suggested  suggested
 *     suggested  FREE       suggested
 *     suggested  suggested  suggested
 *
 *   - 1 free centre (4): already true, pre-marked.
 *   - 8 suggested cells, dealt from the "Rest Card Squares" Airtable table:
 *     one per theme across the six themes, then two more at random.
 *
 * Nothing on the card asks her to write anything — it's all offered to her.
 *
 * ⚠️ Labels are written by hand in Airtable and rendered **exactly as stored**.
 * There is no rewriting layer any more. The old one derived squares from the
 * Recommendations table by conjugating the first verb ("Close your eyes" → "You
 * closed your eyes"), which produced real breakage in production, including
 * "You got one thing out of your head and ontoed paper". If a square reads
 * wrong, fix the row in Airtable — never add a transform here.
 */

/** The six themes a card is balanced across. Must match the Airtable choices. */
export const THEMES = ['body', 'mind', 'space', 'people', 'play', 'me'] as const
export type Theme = (typeof THEMES)[number]

export const CARD_SIZE = 9
export const CARD_CYCLE_DAYS = 14

export const FREE_POSITION = 4
export const FREE_LABEL = 'You’re here'
export const SUGGESTED_POSITIONS = [0, 1, 2, 3, 5, 6, 7, 8]

/** One dealable square, straight from Airtable. */
export interface SelfAction {
  label: string
  theme: string
  /** Airtable `stage`: 'all' or one specific stage. */
  stage: string
}

export interface SelectorPrefs {
  /** Labels from her recent cards — skipped so the board keeps feeling new. */
  recentLabels?: string[]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Pick the suggested squares: one at random per theme across the six themes,
 * then top up at random from whatever is left.
 *
 * No preference weighting. The card is a record of an ordinary day, and
 * steering it toward what she already likes narrows the day rather than
 * describing it.
 *
 * `pool` must already be filtered to her stage and to active rows.
 *
 * Returns fewer than `count` only when the pool itself cannot supply that many
 * unique labels — the caller decides what to do about it. This never invents or
 * substitutes a square.
 */
export function selectSuggested(
  prefs: SelectorPrefs = {},
  count = SUGGESTED_POSITIONS.length,
  pool: SelfAction[] = [],
): SelfAction[] {
  const recent = new Set(prefs.recentLabels ?? [])

  // Deduplicate by label first, so a duplicated Airtable row can never occupy
  // two squares on the same card.
  const seen = new Set<string>()
  const unique = pool.filter(a => {
    const key = a.label.trim().toLowerCase()
    if (!a.label.trim() || seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Skip what she has seen lately — but never filter so hard that a card can't
  // be filled. This is the ONLY fallback: back to the full stage-eligible pool.
  let candidates = unique.filter(a => !recent.has(a.label))
  if (candidates.length < count) candidates = unique

  // One per theme, in random theme order, then top up from the remainder.
  const byTheme = new Map<string, SelfAction[]>()
  for (const a of shuffle(candidates)) {
    const list = byTheme.get(a.theme) ?? []
    list.push(a)
    byTheme.set(a.theme, list)
  }

  const picked: SelfAction[] = []
  const taken = new Set<string>()
  const take = (a: SelfAction) => { picked.push(a); taken.add(a.label) }

  for (const theme of shuffle(Array.from(byTheme.keys()))) {
    if (picked.length >= count) break
    const first = byTheme.get(theme)!.find(a => !taken.has(a.label))
    if (first) take(first)
  }

  for (const a of shuffle(candidates)) {
    if (picked.length >= count) break
    if (!taken.has(a.label)) take(a)
  }

  return picked.slice(0, count)
}

// `source` on a square row: 'free' | 'self'.
export type SquareSource = 'free' | 'self'

export interface NewSquare {
  position: number
  label: string
  source: SquareSource
  status: 'open' | 'done'
}

export interface BuildOptions extends SelectorPrefs {
  /** Stage-eligible, active squares from Airtable. */
  pool?: SelfAction[]
}

/**
 * Build the 9 squares for a fresh card, or return null if the pool cannot fill
 * one with eight unique labels.
 *
 * Returning null is deliberate. The previous version padded short deals from a
 * hardcoded list *by index*, which could repeat a label already on the card and
 * silently mixed placeholder copy into a real card. A card that cannot be dealt
 * honestly should fail loudly instead.
 */
export function buildCardSquares(opts: BuildOptions = {}): NewSquare[] | null {
  const suggested = selectSuggested(opts, SUGGESTED_POSITIONS.length, opts.pool ?? [])
  if (suggested.length < SUGGESTED_POSITIONS.length) return null

  // Positions are shuffled so the themes don't land in the same places every time.
  const positions = shuffle(SUGGESTED_POSITIONS)

  const squares: NewSquare[] = [
    { position: FREE_POSITION, label: FREE_LABEL, source: 'free', status: 'done' },
  ]
  positions.forEach((p, i) => {
    squares.push({ position: p, label: suggested[i].label, source: 'self', status: 'open' })
  })

  return squares.sort((a, b) => a.position - b.position)
}

// All winning lines on a 3×3 grid.
export const LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],   // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8],   // columns
  [0, 4, 8], [2, 4, 6],              // diagonals
]

/** Which lines are fully complete, given the set of completed positions. */
export function completedLines(done: Set<number>): number[][] {
  return LINES.filter(line => line.every(pos => done.has(pos)))
}
