/**
 * The Rest Card (V2) — a 4×4 grid of small, restorative, self-directed actions.
 * Complete squares to earn gems (which fill the reserve); complete a line for a
 * bonus. The card refreshes on a gentle cycle for a fresh slate — progress,
 * gems, and reserve are never wiped as punishment.
 *
 * Actions are digital / self-directed only (same constraint as the recs DB):
 * nothing she can't do from where she is, nothing requiring a purchase or a
 * provider she may not have.
 */

export interface RestAction {
  id: string
  label: string
  category: string   // aligns with the categories personas love
}

// Pool the card draws from. Kept > 16 so cards vary cycle to cycle.
export const REST_ACTIONS: RestAction[] = [
  { id: 'r-breath',   label: 'Take three slow breaths',                 category: 'Micro Practice' },
  { id: 'r-water',    label: 'Drink a full glass of water',             category: 'Micro Practice' },
  { id: 'r-stretch',  label: 'Stretch for one minute, no agenda',       category: 'Movement' },
  { id: 'r-sun',      label: 'Stand in the sun for a moment',           category: 'Rest' },
  { id: 'r-sit',      label: 'Sit down for five quiet minutes',         category: 'Rest' },
  { id: 'r-phone',    label: 'Put your phone down for one feed',        category: 'Environment Reset' },
  { id: 'r-song',     label: 'Play one song you love',                  category: 'Joy' },
  { id: 'r-text',     label: 'Text someone back you’ve been meaning to',category: 'Connection' },
  { id: 'r-clear',    label: 'Clear one small surface',                 category: 'Environment Reset' },
  { id: 'r-warm',     label: 'Hold something warm — tea, a mug',        category: 'Rest' },
  { id: 'r-step',     label: 'Step outside for one minute',             category: 'Movement' },
  { id: 'r-no',       label: 'Say no to one thing today',               category: 'Micro Practice' },
  { id: 'r-shower',   label: 'Take a shower with no rush',              category: 'Rest' },
  { id: 'r-window',   label: 'Look out a window and just notice',       category: 'Micro Practice' },
  { id: 'r-snack',    label: 'Eat something you actually want',         category: 'Joy' },
  { id: 'r-voice',    label: 'Send a voice note to a friend',           category: 'Connection' },
  { id: 'r-lie',      label: 'Lie down for ten minutes',               category: 'Rest' },
  { id: 'r-tidy',     label: 'Put on something that feels good',        category: 'Joy' },
  { id: 'r-unclench', label: 'Unclench your jaw and shoulders',         category: 'Micro Practice' },
  { id: 'r-fresh',    label: 'Open a window for fresh air',             category: 'Environment Reset' },
  { id: 'r-laugh',    label: 'Watch one thing that makes you laugh',    category: 'Joy' },
  { id: 'r-ask',      label: 'Ask for help with one thing',             category: 'Connection' },
  { id: 'r-candle',   label: 'Light a candle or dim the lights',        category: 'Environment Reset' },
  { id: 'r-nothing',  label: 'Do nothing at all for two minutes',       category: 'Rest' },
]

export const CARD_SIZE = 16          // 4×4
export const CARD_CYCLE_DAYS = 14    // fresh slate every two weeks

// All winning lines on a 4×4 grid (positions 0–15, row-major).
export const LINES: number[][] = [
  [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15],   // rows
  [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15],   // columns
  [0, 5, 10, 15], [3, 6, 9, 12],                                   // diagonals
]

/** Pick CARD_SIZE distinct actions for a new card (shuffled). */
export function pickCardActions(): RestAction[] {
  const pool = [...REST_ACTIONS]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, CARD_SIZE)
}

/** Which lines are fully complete, given the set of completed positions. */
export function completedLines(done: Set<number>): number[][] {
  return LINES.filter(line => line.every(pos => done.has(pos)))
}
