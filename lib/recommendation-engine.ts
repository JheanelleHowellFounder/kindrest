/**
 * Recommendation Engine — Option B implementation
 *
 * Flow:
 *   1. Airtable data is pre-filtered by regulation_phase + regulation_type
 *      (done in lib/airtable.ts → getFilteredRecommendations)
 *   2. This engine scores the pre-filtered set and returns the top N
 *   3. The top N are passed to Claude with user context for warm framing
 *
 * Scoring factors:
 *   1. Effort alignment  — match user's current capacity
 *   2. Capacity level    — match time available
 *   3. User preferences  — boost categories they've liked, down-rank avoided ones
 *   4. Feedback weight   — boost recs this user has rated highly before
 *   5. Novelty penalty   — avoid repeating recent recs
 */

import type { Recommendation, MoodLabel, TimeAvailable, RegulationPhase } from './types'

// ─── Maps ────────────────────────────────────────────────────────────────────

export const PHASE_MAP: Record<string, RegulationPhase> = {
  // App internal labels  →  Airtable regulation_phase
  overwhelmed: 'Contain',
  struggling:  'Stabilize',
  okay:        'Maintain',
  good:        'Expand',
  thriving:    'Anchor',
}

const TIME_LEVEL_MAP: Record<TimeAvailable, number[]> = {
  '2_minutes':       [1],
  '5_minutes':       [1, 2],
  '10_minutes':      [1, 2],
  '15_plus_minutes': [1, 2, 3, 4],
}

type EffortFilter = 'low' | 'low_medium' | 'any'

const EFFORT_MAP: Record<string, EffortFilter> = {
  overwhelmed: 'low',
  struggling:  'low',
  okay:        'low_medium',
  good:        'any',
  thriving:    'any',
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FeedbackWeight {
  rec_id: number
  avg_rating: number   // 1–3 scale (skip / save / did_it)
  usage_count: number
}

export interface UserPreferences {
  preferred_categories?: string[]
  avoided_categories?: string[]
  preferred_effort?: string
  strong_regulation_types?: string[]
}

export interface JournalContext {
  whatHelps?: string[]          // phrases from journal_profile.what_helps
  recurringTriggers?: string[]  // phrases from journal_profile.recurring_triggers
}

export interface ScoredRecommendation extends Recommendation {
  score: number
}

// ─── Text matching helpers ───────────────────────────────────────────────────

const STEM_LEN = 6

// Splits a phrase into lowercase words and truncates each to a fixed-length
// stem, so word variants (connecting/connection, reflecting/reflection)
// still match without a full stemming library.
function stems(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(w => w.length >= 4)
    .map(w => w.slice(0, STEM_LEN))
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

/**
 * Score a pre-filtered set of recommendations.
 * Receives only recs already narrowed to the right phase (+ types) — so we
 * never send irrelevant content to Claude.
 */
export function scoreRecommendations(
  mood: string,
  timeAvailable: TimeAvailable,
  candidates: Recommendation[],
  feedbackWeights: FeedbackWeight[] = [],
  recentlyUsedIds: number[] = [],
  userPrefs: UserPreferences = {},
  journalContext: JournalContext = {}
): ScoredRecommendation[] {
  const allowedLevels = TIME_LEVEL_MAP[timeAvailable] ?? [1, 2]
  const effortFilter = EFFORT_MAP[mood] ?? 'any'
  const weightMap = new Map(feedbackWeights.map(w => [w.rec_id, w]))

  // Normalize journal phrases once for cheap substring matching below
  const whatHelpsLower = (journalContext.whatHelps ?? []).map(p => p.toLowerCase())

  return candidates
    .map((rec): ScoredRecommendation => {
      let score = 0

      // 1. Capacity level match
      const level = parseInt(rec.capacity_level.replace('Level ', '')) || 1
      if (allowedLevels.includes(level)) {
        score += 0.5
      } else {
        score -= 0.4
      }

      // 2. Effort alignment
      const effort = rec.effort_level
      if (effortFilter === 'low' && effort === 'Low') score += 0.4
      else if (effortFilter === 'low_medium' && (effort === 'Low' || effort === 'Medium')) score += 0.3
      else if (effortFilter === 'any') score += 0.1
      else score -= 0.3   // high effort when low capacity

      // 3. User preference boost / penalty
      if (userPrefs.preferred_categories?.includes(rec.category)) score += 0.4
      if (userPrefs.avoided_categories?.includes(rec.category)) score -= 0.5
      if (userPrefs.preferred_effort === rec.effort_level) score += 0.2

      // 3b. Regulation type affinity — boost recs matching types she engages with most
      if (userPrefs.strong_regulation_types?.includes(rec.regulation_type)) score += 0.3

      // 4. Historical feedback weight (1–3 scale: skip/save/did_it)
      const weight = weightMap.get(rec.rec_id)
      if (weight && weight.usage_count > 0) {
        // normalise 1–3 to -0.4 to +0.4
        const boost = ((weight.avg_rating - 2) / 2) * 0.4
        score += boost
      }

      // 5. Novelty — penalise recently used
      const recencyIdx = recentlyUsedIds.indexOf(rec.rec_id)
      if (recencyIdx !== -1) {
        score -= 0.3 * (1 - recencyIdx / Math.max(recentlyUsedIds.length, 1))
      }

      // 6. Journal-derived signal — boost recs that match what she's written
      // helps her. Uses word-stem matching (first 6 chars of each word) so
      // variants like "connecting" still match "connection".
      if (whatHelpsLower.length > 0) {
        const catStems  = stems(rec.category)
        const typeStems = stems(rec.regulation_type)
        const targetStems = [...catStems, ...typeStems]
        const matches = whatHelpsLower.some(phrase =>
          stems(phrase).some(phraseStem => targetStems.includes(phraseStem))
        )
        if (matches) score += 0.25
      }

      return { ...rec, score }
    })
    .sort((a, b) => b.score - a.score)
}

/**
 * Returns top N recommendations from a pre-filtered, scored set.
 * Use this in the API route after calling getFilteredRecommendations().
 */
export function pickTopN(
  mood: string,
  timeAvailable: TimeAvailable,
  candidates: Recommendation[],
  n = 3,
  feedbackWeights: FeedbackWeight[] = [],
  recentlyUsedIds: number[] = [],
  userPrefs: UserPreferences = {},
  journalContext: JournalContext = {}
): Recommendation[] {
  const scored = scoreRecommendations(
    mood, timeAvailable, candidates, feedbackWeights, recentlyUsedIds, userPrefs, journalContext
  )
  return scored.slice(0, n)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getMoodPhase(mood: string): RegulationPhase {
  return PHASE_MAP[mood.toLowerCase()] ?? 'Maintain'
}

// Keep legacy export for any existing references
export function generateCareKit(
  mood: MoodLabel,
  timeAvailable: TimeAvailable,
  candidates?: Recommendation[]
): Recommendation[] {
  if (!candidates || candidates.length === 0) return []
  return pickTopN(mood, timeAvailable, candidates)
}
