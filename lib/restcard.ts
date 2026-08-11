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
 *   - 8 suggested cells: drawn from the real recommendations database, chosen as
 *     a balanced spread across regulation types and weighted to her. Later,
 *     community suggestions land here too.
 *
 * Nothing on the card asks her to write anything — it's all offered to her.
 *
 * Every square is phrased as something that already happened ("You drank water"),
 * so tapping means "yes, that happened" — never "do this now."
 */

import type { RegulationType } from '@/lib/types'

export const CARD_SIZE = 9
export const CARD_CYCLE_DAYS = 14

export const FREE_POSITION = 4
export const FREE_LABEL = 'You’re here'
export const SUGGESTED_POSITIONS = [0, 1, 2, 3, 5, 6, 7, 8]

/**
 * Suggested pool — past tense, small, no money / childcare / leaving the house.
 * Tagged with the regulation type it tends, so a card can cross her whole self
 * rather than hitting the same dimension four times.
 */
export interface SelfAction {
  label: string
  category: string
  regulation: RegulationType
}

export const SELF_ACTIONS: SelfAction[] = [
  // Physical — the body
  { label: 'You drank water today',                          category: 'Micro Practice', regulation: 'Physical' },
  { label: 'You put your body horizontal',                   category: 'Rest',           regulation: 'Physical' },
  { label: 'You stepped outside, even for a minute',         category: 'Movement',       regulation: 'Physical' },
  { label: 'You stretched, even a little',                   category: 'Movement',       regulation: 'Physical' },
  { label: 'You went to the bathroom alone',                 category: 'Micro Practice', regulation: 'Physical' },

  // Sensory — the nervous system
  { label: 'You took a breath that went all the way down',   category: 'Micro Practice', regulation: 'Sensory' },
  { label: 'You closed your eyes for a moment',              category: 'Rest',           regulation: 'Sensory' },
  { label: 'You played a song you loved',                    category: 'Joy',            regulation: 'Sensory' },
  { label: 'You held something warm',                        category: 'Rest',           regulation: 'Sensory' },

  // Emotional — the heart
  { label: 'You laughed at something',                       category: 'Joy',            regulation: 'Emotional' },
  { label: 'You let yourself feel it, whatever it was',      category: 'Reflection',     regulation: 'Emotional' },
  { label: 'You ate something you didn’t have to share',     category: 'Joy',            regulation: 'Emotional' },

  // Mental — the load
  { label: 'You let a mess stay a mess',                     category: 'Rest',           regulation: 'Mental' },
  { label: 'You said no to something',                       category: 'Micro Practice', regulation: 'Mental' },
  { label: 'You did one thing slowly',                       category: 'Rest',           regulation: 'Mental' },

  // Identity — the woman
  { label: 'You chose something just because you wanted it', category: 'Joy',            regulation: 'Identity' },
  { label: 'You wore something that felt like you',          category: 'Joy',            regulation: 'Identity' },
  { label: 'You remembered something you used to be good at',category: 'Reflection',     regulation: 'Identity' },
  { label: 'You had a thought that wasn’t about the baby',   category: 'Reflection',     regulation: 'Identity' },

  // Relational — the people
  { label: 'You texted someone back',                        category: 'Connection',     regulation: 'Relational' },
  { label: 'You let someone help you',                       category: 'Connection',     regulation: 'Relational' },
  { label: 'You said what you actually felt',                category: 'Connection',     regulation: 'Relational' },
  { label: 'You laughed with someone',                       category: 'Connection',     regulation: 'Relational' },
]

export interface SelectorPrefs {
  /** From user_preference_profile.strong_regulation_types */
  strongRegulationTypes?: string[]
  /** From user_preference_profile.preferred_categories */
  preferred?: string[]
  /** From user_preference_profile.avoided_categories */
  avoided?: string[]
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
 * Pick the suggested squares: a balanced spread across regulation types (at most
 * one per type until every type is used), leaning toward the types and categories
 * she responds to and away from ones she skips.
 */
export function selectSuggested(prefs: SelectorPrefs = {}, count = SUGGESTED_POSITIONS.length, source?: SelfAction[]): SelfAction[] {
  const strong = new Set(prefs.strongRegulationTypes ?? [])
  const preferred = new Set(prefs.preferred ?? [])
  const avoided = new Set(prefs.avoided ?? [])
  const recent = new Set(prefs.recentLabels ?? [])
  const all = source && source.length >= count ? source : SELF_ACTIONS

  // Skip what she's seen lately, then what she skips — but never filter so hard
  // that we can't fill a card. Each fallback loosens one constraint.
  let pool = all.filter(a => !avoided.has(a.category) && !recent.has(a.label))
  if (pool.length < count) pool = all.filter(a => !recent.has(a.label))
  if (pool.length < count) pool = all.filter(a => !avoided.has(a.category))
  if (pool.length < count) pool = [...all]

  // Rank within each regulation type: her strong types and preferred categories first.
  const byType = new Map<string, SelfAction[]>()
  for (const a of shuffle(pool)) {
    const list = byType.get(a.regulation) ?? []
    list.push(a)
    byType.set(a.regulation, list)
  }
  Array.from(byType.values()).forEach((list: SelfAction[]) => {
    list.sort((x, y) => Number(preferred.has(y.category)) - Number(preferred.has(x.category)))
  })

  // Order the types themselves — her strong ones lead, the rest follow shuffled.
  const types = shuffle(Array.from(byType.keys()))
    .sort((x, y) => Number(strong.has(y)) - Number(strong.has(x)))

  // Round-robin across types so we never take two of the same before all are used.
  const picked: SelfAction[] = []
  let round = 0
  while (picked.length < count && round < 10) {
    for (const t of types) {
      const list = byType.get(t)!
      if (list[round]) picked.push(list[round])
      if (picked.length === count) break
    }
    round++
  }
  return picked
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
  /** Pool to draw from — the real recommendations, mapped to record voice. */
  pool?: SelfAction[]
}

/** Build the 9 squares for a fresh card. */
export function buildCardSquares(opts: BuildOptions = {}): NewSquare[] {
  const squares: NewSquare[] = [
    { position: FREE_POSITION, label: FREE_LABEL, source: 'free', status: 'done' },
  ]

  const suggested = selectSuggested(opts, SUGGESTED_POSITIONS.length, opts.pool)
  SUGGESTED_POSITIONS.forEach((p, i) => {
    squares.push({ position: p, label: suggested[i]?.label ?? SELF_ACTIONS[i].label, source: 'self', status: 'open' })
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

// ─── Recommendations → record voice ──────────────────────────────────────────
// The recs database speaks in instructions ("Close your eyes for 90 seconds").
// The Rest Card speaks in records ("You closed your eyes for 90 seconds"), so a
// tap means "yes, that happened" rather than "do this now."

const IRREGULAR: Record<string, string> = {
  put: 'put', close: 'closed', take: 'took', text: 'texted', let: 'let',
  make: 'made', do: 'did', write: 'wrote', spend: 'spent', move: 'moved',
  lower: 'lowered', send: 'sent', shake: 'shook', say: 'said',
  read: 'read', pause: 'paused', share: 'shared', record: 'recorded',
  feel: 'felt', create: 'created', check: 'checked', name: 'named',
  express: 'expressed', celebrate: 'celebrated', give: 'gave', go: 'went',
  set: 'set', sit: 'sat', stand: 'stood', eat: 'ate', drink: 'drank',
  hold: 'held', find: 'found', choose: 'chose', keep: 'kept', get: 'got',
  leave: 'left', tell: 'told', bring: 'brought', wear: 'wore', run: 'ran',
  breathe: 'breathed', notice: 'noticed', step: 'stepped', stretch: 'stretched',
  listen: 'listened', reach: 'reached', ask: 'asked', rest: 'rested',
  plan: 'planned', savor: 'savored', roll: 'rolled', colour: 'coloured',
  color: 'colored', change: 'changed', identify: 'identified', sip: 'sipped',
}

// A few titles aren't simple "verb + object" and don't survive a rule-based
// rewrite. Rather than build a cleverer parser for 60 rows, name the exceptions.
const RECORD_VOICE_OVERRIDES: Record<string, string> = {
  'Voice memo: name what feels heavy': 'You named what felt heavy, out loud',
  'Write: Right now I wish someone knew…': 'You wrote what you wish someone knew',
  'Write: Right now I wish someone knew...': 'You wrote what you wish someone knew',
}

function pastTenseVerb(w: string): string {
  const lower = w.toLowerCase().replace(/[^a-z]/g, '')
  if (!lower) return w
  if (IRREGULAR[lower]) return IRREGULAR[lower]
  if (lower.endsWith('e')) return lower + 'd'
  if (/[^aeiou]y$/.test(lower)) return lower.slice(0, -1) + 'ied'
  // single-syllable consonant-vowel-consonant doubles the final letter (plan → planned)
  if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(lower)) return lower + lower.slice(-1) + 'ed'
  return lower + 'ed'
}

/**
 * "Close your eyes for 90 seconds" → "You closed your eyes for 90 seconds"
 * Also conjugates a second verb after "and" so compound instructions read right.
 */
export function toRecordVoice(title: string): string {
  const clean = title.trim().replace(/\s+/g, ' ')
  if (RECORD_VOICE_OVERRIDES[clean]) return RECORD_VOICE_OVERRIDES[clean]

  const words = clean.split(' ')
  if (!words.length) return clean

  words[0] = pastTenseVerb(words[0])
  // "shook out your hands and roll your neck" → "...and rolled your neck"
  const andAt = words.findIndex((w, i) => i > 0 && w.toLowerCase() === 'and')
  if (andAt > 0 && words[andAt + 1]) {
    const next = words[andAt + 1]
    if (/^[a-z]+$/.test(next) && next !== 'actually') words[andAt + 1] = pastTenseVerb(next)
    else if (next === 'actually' && words[andAt + 2]) words[andAt + 2] = pastTenseVerb(words[andAt + 2])
  }
  return 'You ' + words.join(' ')
}
