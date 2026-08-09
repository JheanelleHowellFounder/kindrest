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
export const SELF_ACTIONS: { label: string; type: 'body' | 'self' }[] = [
  { label: 'You drank water today',                         type: 'body' },
  { label: 'You put your body horizontal',                  type: 'body' },
  { label: 'You stepped outside, even for a minute',        type: 'body' },
  { label: 'You ate something you didn’t have to share',    type: 'body' },
  { label: 'You went to the bathroom alone',                type: 'body' },
  { label: 'You took a breath that went all the way down',  type: 'body' },
  { label: 'You let a mess stay a mess',                    type: 'body' },
  { label: 'You said no to something',                      type: 'body' },
  { label: 'You played a song you loved',                   type: 'self' },
  { label: 'You noticed something beautiful',               type: 'self' },
  { label: 'You chose something just because you wanted it',type: 'self' },
  { label: 'You remembered something you used to be good at',type: 'self' },
  { label: 'You laughed at something',                      type: 'self' },
  { label: 'You wore something that felt like you',         type: 'self' },
  { label: 'You had a thought that wasn’t about the baby',  type: 'self' },
  { label: 'You did one thing slowly',                      type: 'self' },
]

// `source` on a square row encodes its kind: 'user' | 'app_<link>' | 'self'.
export type SquareSource = 'user' | `app_${AppLink}` | 'self'

export interface NewSquare {
  position: number
  label: string
  source: SquareSource
  status: 'open' | 'done'
}

/** Build the 16 squares for a fresh card. Centre cells start blank for her to write. */
export function buildCardSquares(): NewSquare[] {
  const squares: NewSquare[] = []

  for (const p of USER_POSITIONS) {
    squares.push({ position: p, label: '', source: 'user', status: 'open' })
  }
  for (const a of APP_SQUARES) {
    squares.push({ position: a.position, label: a.label, source: `app_${a.link}`, status: 'open' })
  }

  const pool = [...SELF_ACTIONS]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  SELF_POSITIONS.forEach((p, i) => {
    squares.push({ position: p, label: pool[i].label, source: 'self', status: 'open' })
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
