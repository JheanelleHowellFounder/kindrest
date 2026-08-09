/**
 * The Rest Card (V2) — a 4×4 board that is a *record of what already happened*,
 * not a to-do list. Nothing here is an assignment, target, or countdown.
 *
 * Layout of the 16 cells (positions 0–15, row-major):
 *   - 4 centre cells (5,6,9,10): user-authored — she writes her own, in her words.
 *   - 3 app-linked cells: mark themselves from what she already did elsewhere in
 *     the app (a glimmer, a journal entry, a practice) — so she never re-does work.
 *   - 9 self cells: small restorative things she marks herself, in past tense.
 *
 * Every square is phrased as something that already happened ("You drank water"),
 * so tapping means "yes, that happened" — never "do this now."
 */

export const CARD_SIZE = 16
export const CARD_CYCLE_DAYS = 14

// The four middle cells — hers to write. They start blank with a gentle prompt.
export const USER_POSITIONS = [5, 6, 9, 10]

export type AppLink = 'glimmer' | 'journal' | 'practice'

// App-linked cells: they reflect activity from elsewhere in the app.
export const APP_SQUARES: { position: number; link: AppLink; label: string }[] = [
  { position: 0,  link: 'glimmer',  label: 'You noticed a glimmer' },
  { position: 3,  link: 'journal',  label: 'You wrote something down' },
  { position: 12, link: 'practice', label: 'You did something for yourself' },
]

// The nine self cells fill the remaining positions.
export const SELF_POSITIONS = [1, 2, 4, 7, 8, 11, 13, 14, 15]

// Self-directed pool — past tense, small, no money / childcare / leaving the house.
// Each is tagged with a care category so the board can lean toward what she loves
// and away from what she skips.
export interface SelfAction { label: string; category: string }
export const SELF_ACTIONS: SelfAction[] = [
  // Rest
  { label: 'You put your body horizontal',                   category: 'Rest' },
  { label: 'You let a mess stay a mess',                     category: 'Rest' },
  { label: 'You closed your eyes for a moment',              category: 'Rest' },
  { label: 'You did one thing slowly',                       category: 'Rest' },
  // Micro Practice
  { label: 'You drank water today',                          category: 'Micro Practice' },
  { label: 'You took a breath that went all the way down',   category: 'Micro Practice' },
  { label: 'You went to the bathroom alone',                 category: 'Micro Practice' },
  { label: 'You said no to something',                       category: 'Micro Practice' },
  // Joy
  { label: 'You played a song you loved',                    category: 'Joy' },
  { label: 'You ate something you didn’t have to share',     category: 'Joy' },
  { label: 'You chose something just because you wanted it', category: 'Joy' },
  { label: 'You wore something that felt like you',          category: 'Joy' },
  // Movement
  { label: 'You stepped outside, even for a minute',         category: 'Movement' },
  { label: 'You stretched, even a little',                   category: 'Movement' },
  { label: 'You moved your body on purpose',                 category: 'Movement' },
  // Reflection
  { label: 'You noticed something beautiful',                category: 'Reflection' },
  { label: 'You remembered something you used to be good at',category: 'Reflection' },
  { label: 'You had a thought that wasn’t about the baby',   category: 'Reflection' },
  // Connection
  { label: 'You texted someone back',                        category: 'Connection' },
  { label: 'You let someone help you',                       category: 'Connection' },
  { label: 'You said what you actually felt',                category: 'Connection' },
  { label: 'You laughed with someone',                       category: 'Connection' },
]

/**
 * Pick 9 self actions, leaning toward her preferred categories and away from the
 * ones she skips — while keeping enough variety that the board never feels narrow.
 */
export function selectSelfActions(preferred: string[] = [], avoided: string[] = []): SelfAction[] {
  const avoid = new Set(avoided)
  const pref = new Set(preferred)
  let pool = SELF_ACTIONS.filter(a => !avoid.has(a.category))
  if (pool.length < SELF_POSITIONS.length) pool = [...SELF_ACTIONS] // fallback if we filtered too hard

  return pool
    .map(a => ({ a, rank: pref.has(a.category) ? 0 : 1, r: Math.random() }))
    .sort((x, y) => x.rank - y.rank || x.r - y.r)
    .slice(0, SELF_POSITIONS.length)
    .map(s => s.a)
}

// `source` on a square row encodes its kind: 'user' | 'app_<link>' | 'self'.
export type SquareSource = 'user' | `app_${AppLink}` | 'self'

export interface NewSquare {
  position: number
  label: string
  source: SquareSource
  status: 'open' | 'done'
}

export interface BuildOptions {
  preferred?: string[]
  avoided?: string[]
  /** Carry her written centre squares forward from the last card, by position. */
  userLabels?: Record<number, string>
}

/**
 * Build the 16 squares for a fresh card. Centre cells carry her previous words
 * forward (so what she wrote sticks across cycles); self cells are themed to her
 * care preferences.
 */
export function buildCardSquares(opts: BuildOptions = {}): NewSquare[] {
  const squares: NewSquare[] = []

  for (const p of USER_POSITIONS) {
    squares.push({ position: p, label: opts.userLabels?.[p] ?? '', source: 'user', status: 'open' })
  }
  for (const a of APP_SQUARES) {
    squares.push({ position: a.position, label: a.label, source: `app_${a.link}`, status: 'open' })
  }

  const chosen = selectSelfActions(opts.preferred, opts.avoided)
  SELF_POSITIONS.forEach((p, i) => {
    squares.push({ position: p, label: chosen[i].label, source: 'self', status: 'open' })
  })

  return squares.sort((a, b) => a.position - b.position)
}

// All winning lines on a 4×4 grid.
export const LINES: number[][] = [
  [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15],   // rows
  [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15],   // columns
  [0, 5, 10, 15], [3, 6, 9, 12],                                   // diagonals
]

/** Which lines are fully complete, given the set of completed positions. */
export function completedLines(done: Set<number>): number[][] {
  return LINES.filter(line => line.every(pos => done.has(pos)))
}
