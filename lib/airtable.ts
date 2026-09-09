/**
 * Airtable data layer — fetches Kindrest content (Moods, Indicators, Recommendations)
 * and keeps it in Next.js's server cache so we don't hammer the API on every request.
 *
 * Cache revalidates every 10 minutes. Force-refresh by calling revalidateTag('airtable').
 */

import { cache } from 'react'
import type { Recommendation, RegulationPhase, RegulationType, RestCardSquare } from './types'

const BASE_URL = 'https://api.airtable.com/v0'
const TOKEN = process.env.AIRTABLE_TOKEN
const BASE_ID = process.env.AIRTABLE_BASE_ID ?? 'appxPVr6mBatB2jjj'

/** Exact Airtable table name. Renaming the table in Airtable breaks the card. */
const REST_CARD_TABLE = 'Rest Card Squares'

// ─── Raw Airtable shapes ──────────────────────────────────────────────────────

interface AirtableRecord<T> {
  id: string
  createdTime: string
  fields: T
}

interface AirtableMoodFields {
  mood_id: number
  mood_label: string
  regulation_phase: string
  description: string
}

interface AirtableIndicatorFields {
  indicator_id: number
  mood_label: string
  label: string
  regulation_type: string
  description: string
}

interface AirtableRestSquareFields {
  '#': number
  label: string
  theme: string
  stage: string
  /** Added in Airtable after launch — absent on older rows, which means active. */
  active?: boolean
}

interface AirtableRecFields {
  rec_id: number
  title: string
  description: string
  regulation_type: string
  category: string
  capacity_level: string
  regulation_phase: string
  time_suggestion: string
  effort_level: string
  saveable: boolean
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

/**
 * Fetch every row of a table, following Airtable's pagination.
 *
 * Airtable returns at most 100 records per page and signals more with an
 * `offset`. This used to read only the first page, which is silent truncation:
 * no error, no warning, just content that stops existing at row 101.
 */
async function fetchTable<T>(tableName: string): Promise<AirtableRecord<T>[]> {
  if (!TOKEN) {
    console.warn('[airtable] AIRTABLE_TOKEN not set — using empty data')
    return []
  }

  const records: AirtableRecord<T>[] = []
  let offset: string | undefined
  // Hard stop so a malformed offset can never spin forever. 20 pages = 2000 rows.
  for (let page = 0; page < 20; page++) {
    const url = new URL(`${BASE_URL}/${BASE_ID}/${encodeURIComponent(tableName)}`)
    if (offset) url.searchParams.set('offset', offset)

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${TOKEN}` },
      next: { revalidate: 600 }, // cache 10 minutes
    })

    if (!res.ok) {
      console.error(`[airtable] Failed to fetch ${tableName}: ${res.status}`)
      return records          // whatever we already have, rather than nothing
    }

    const data = await res.json()
    records.push(...(data.records ?? []))
    offset = data.offset
    if (!offset) return records
  }

  console.warn(`[airtable] ${tableName}: stopped after 20 pages — table may be truncated`)
  return records
}

// ─── Public API — cached with React cache() so one call per request ───────────

export const getRecommendations = cache(async (): Promise<Recommendation[]> => {
  const records = await fetchTable<AirtableRecFields>('Recommendations')
  return records
    .filter(r => r.fields.rec_id != null)
    .map(r => ({
      id: r.id,
      rec_id: r.fields.rec_id,
      title: r.fields.title ?? '',
      description: r.fields.description ?? '',
      regulation_type: r.fields.regulation_type as RegulationType,
      category: r.fields.category ?? '',
      capacity_level: r.fields.capacity_level ?? 'Level 1',
      regulation_phase: r.fields.regulation_phase as RegulationPhase,
      time_suggestion: r.fields.time_suggestion ?? 'Anytime',
      effort_level: (r.fields.effort_level ?? 'Low') as 'Low' | 'Medium' | 'High',
      saveable: r.fields.saveable ?? false,
    }))
})

/**
 * The Rest Card's content source — the "Rest Card Squares" table.
 *
 * Labels are written by hand, in her own voice ("Drank water before coffee"),
 * and are rendered exactly as stored. Nothing here rewrites them.
 *
 * `active` gates whether a square can be dealt.
 *
 * ⚠️ Airtable omits an unticked checkbox from the response entirely, so a
 * retired square and a table with no `active` column look identical on the
 * wire: the field is simply absent. Reading `active ?? true` would therefore
 * make unticking do nothing, and reading `active === true` would empty the
 * board the moment the column was added but before anything was ticked.
 *
 * So decide per fetch: if no row anywhere carries the field, the column does
 * not exist and every square is active. If any row does, the column is in use
 * and absent means retired. That is correct before the column exists, correct
 * after it is fully ticked, and during the minutes in between it deals only
 * from what has been ticked so far.
 */
export const getRestCardSquares = cache(async (): Promise<RestCardSquare[]> => {
  const records = await fetchTable<AirtableRestSquareFields>(REST_CARD_TABLE)
  const columnExists = records.some(r => r.fields.active !== undefined)

  return records
    .map(r => ({
      id: r.id,
      number: r.fields['#'] ?? null,
      label: (r.fields.label ?? '').trim(),
      theme: (r.fields.theme ?? '').trim(),
      stage: (r.fields.stage ?? 'all').trim(),
      active: columnExists ? r.fields.active === true : true,
    }))
    .filter(s => s.label && s.theme)
})

export const getMoods = cache(async () => {
  const records = await fetchTable<AirtableMoodFields>('Mood')
  return records
    .filter(r => r.fields.mood_id != null)
    .map(r => ({
      id: r.id,
      mood_id: r.fields.mood_id,
      mood_label: r.fields.mood_label,
      regulation_phase: r.fields.regulation_phase as RegulationPhase,
      description: r.fields.description,
    }))
    .sort((a, b) => a.mood_id - b.mood_id)
})

export const getIndicators = cache(async () => {
  const records = await fetchTable<AirtableIndicatorFields>('Indicators')
  return records
    .filter(r => r.fields.indicator_id != null)
    .map(r => ({
      id: r.id,
      indicator_id: r.fields.indicator_id,
      mood_label: r.fields.mood_label,
      label: r.fields.label,
      regulation_type: r.fields.regulation_type as RegulationType,
      description: r.fields.description,
    }))
})

// ─── Pre-filtering logic (Option B) ──────────────────────────────────────────
// Called server-side before we score or pass to Claude.
// Dramatically reduces the token footprint of each prompt.

export async function getFilteredRecommendations({
  regulationPhase,
  regulationTypes,
}: {
  regulationPhase: RegulationPhase
  regulationTypes?: RegulationType[]
}): Promise<Recommendation[]> {
  const all = await getRecommendations()

  // 1. Primary filter: only recs for the user's current phase
  let filtered = all.filter(r => r.regulation_phase === regulationPhase)

  // 2. Secondary filter: if we know specific need types, prefer matching recs
  //    but keep the full phase set as fallback so we always have enough options
  if (regulationTypes && regulationTypes.length > 0) {
    const typeMatched = filtered.filter(r =>
      regulationTypes.includes(r.regulation_type as RegulationType)
    )
    // Use type-matched if we have at least 3; otherwise fall back to full phase set
    if (typeMatched.length >= 3) filtered = typeMatched
  }

  return filtered
}
