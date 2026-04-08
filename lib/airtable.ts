/**
 * Airtable data layer — fetches Kindrest content (Moods, Indicators, Recommendations)
 * and keeps it in Next.js's server cache so we don't hammer the API on every request.
 *
 * Cache revalidates every 10 minutes. Force-refresh by calling revalidateTag('airtable').
 */

import { cache } from 'react'
import type { Recommendation, RegulationPhase, RegulationType } from './types'

const BASE_URL = 'https://api.airtable.com/v0'
const TOKEN = process.env.AIRTABLE_TOKEN
const BASE_ID = process.env.AIRTABLE_BASE_ID ?? 'appxPVr6mBatB2jjj'

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

async function fetchTable<T>(tableName: string): Promise<AirtableRecord<T>[]> {
  if (!TOKEN) {
    console.warn('[airtable] AIRTABLE_TOKEN not set — using empty data')
    return []
  }

  const res = await fetch(`${BASE_URL}/${BASE_ID}/${encodeURIComponent(tableName)}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    next: { revalidate: 600 }, // cache 10 minutes
  })

  if (!res.ok) {
    console.error(`[airtable] Failed to fetch ${tableName}: ${res.status}`)
    return []
  }

  const data = await res.json()
  return data.records ?? []
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
