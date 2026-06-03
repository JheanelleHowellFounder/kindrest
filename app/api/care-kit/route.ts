/**
 * POST /api/care-kit
 *
 * Accepts a user's check-in state, fetches pre-filtered recommendations from
 * Airtable, scores them, then asks Claude to frame them with a warm message.
 *
 * Request body:
 *   {
 *     mood: string                     // 'overwhelmed' | 'struggling' | 'okay' | 'good' | 'thriving'
 *     timeAvailable: string            // '2_minutes' | '5_minutes' | '10_minutes' | '15_plus_minutes'
 *     selectedIndicators: string[]     // labels the user tapped (e.g. ["I feel overwhelmed", "I can't think clearly"])
 *     regulationTypes: string[]        // derived types (e.g. ["Emotional", "Mental"])
 *     userId?: string                  // optional — enables personalisation
 *   }
 *
 * Response:
 *   {
 *     recommendations: Recommendation[]
 *     message: string                  // Claude's warm 2-sentence acknowledgment
 *   }
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getFilteredRecommendations } from '@/lib/airtable'
import { pickTopN, getMoodPhase } from '@/lib/recommendation-engine'
import { supabaseAdmin } from '@/lib/supabase'
import type { RegulationType } from '@/lib/types'

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      mood,
      timeAvailable,
      selectedIndicators = [],
      regulationTypes = [],
      userId,
      excludedIds = [],
    } = body as {
      mood: string
      timeAvailable: string
      selectedIndicators: string[]
      regulationTypes: RegulationType[]
      userId?: string
      excludedIds?: number[]  // IDs currently shown — skip these on "try again"
    }

    if (!mood || !timeAvailable) {
      return NextResponse.json({ error: 'mood and timeAvailable are required' }, { status: 400 })
    }

    const regulationPhase = getMoodPhase(mood)

    // ── Step 1: Pre-filter recommendations (Option B) ────────────────────────
    const candidates = await getFilteredRecommendations({
      regulationPhase,
      regulationTypes: regulationTypes.length > 0 ? regulationTypes : undefined,
    })

    // ── Step 2: Load user feedback history for personalisation ───────────────
    let feedbackWeights: { rec_id: number; avg_rating: number; usage_count: number }[] = []
    let userPrefs: { preferred_categories?: string[]; avoided_categories?: string[]; preferred_effort?: string } = {}
    let recentlyUsedIds: number[] = []
    let supportPeople: { name: string; relationship: string }[] = []

    if (userId && supabaseAdmin) {
      // Aggregate past feedback for this user
      const { data: feedback } = await supabaseAdmin
        .from('recommendation_feedback')
        .select('rec_id, rating')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (feedback && feedback.length > 0) {
        // Build weight map
        const weightMap = new Map<number, { sum: number; count: number }>()
        feedback.forEach(f => {
          const existing = weightMap.get(f.rec_id) ?? { sum: 0, count: 0 }
          weightMap.set(f.rec_id, { sum: existing.sum + f.rating, count: existing.count + 1 })
        })
        feedbackWeights = Array.from(weightMap.entries()).map(([rec_id, { sum, count }]) => ({
          rec_id,
          avg_rating: sum / count,
          usage_count: count,
        }))

        // Recently used (last 15 unique rec ids)
        const seen = new Set<number>()
        for (const f of feedback) {
          if (seen.size >= 15) break
          seen.add(f.rec_id)
        }
        recentlyUsedIds = Array.from(seen)
      }

      // Load user preference profile and support circle in parallel
      const [{ data: profile }, { data: userProfile }] = await Promise.all([
        supabaseAdmin
          .from('user_preference_profile')
          .select('preferred_categories, avoided_categories, preferred_effort, strong_regulation_types, recent_indicators')
          .eq('user_id', userId)
          .single(),
        supabaseAdmin
          .from('user_profiles')
          .select('support_people')
          .eq('user_id', userId)
          .single(),
      ])

      if (profile) userPrefs = profile
      if (userProfile?.support_people?.length) {
        supportPeople = userProfile.support_people.filter(
          (p: { name: string; relationship: string }) => p.name?.trim()
        )
      }
    }

    // ── Step 3: Score and pick top 3 ────────────────────────────────────────
    // On "try again" requests, filter out currently-shown recs so the user
    // always gets fresh suggestions. If the pool shrinks below 3, fall back
    // to the full candidate set (the scoring novelty penalty still applies).
    const excludedSet    = new Set(excludedIds)
    const freshCandidates = candidates.filter(c => !excludedSet.has(c.rec_id))
    const scoringPool    = freshCandidates.length >= 3 ? freshCandidates : candidates

    // Merge excludedIds into recentlyUsedIds so the scoring engine penalises
    // them even in the fallback path (they'll end up at the bottom of the sort)
    const mergedRecentIds = [
      ...excludedIds,
      ...recentlyUsedIds.filter(id => !excludedSet.has(id)),
    ]

    const recommendations = pickTopN(
      mood,
      timeAvailable as any,
      scoringPool,
      3,
      feedbackWeights,
      mergedRecentIds,
      userPrefs
    )

    // ── Step 4: Ask Claude for a warm acknowledgment ─────────────────────────
    let message = defaultMessage(mood)

    if (anthropic && recommendations.length > 0) {
      const recList = recommendations
        .map(r => `- ${r.title}: ${r.description} (${r.category}, ${r.effort_level} effort)`)
        .join('\n')

      const indicatorText = selectedIndicators.length > 0
        ? `Right now she selected: ${selectedIndicators.join(', ')}.`
        : ''

      // Surface recurring patterns from past sessions if available
      const recentIndicators = (userPrefs as any)?.recent_indicators as string[] | undefined
      const patternText = recentIndicators?.length
        ? `She commonly experiences: ${recentIndicators.slice(0, 5).join(', ')}.`
        : ''

      const prefText = userPrefs.preferred_categories?.length
        ? `This user tends to respond well to: ${userPrefs.preferred_categories.join(', ')}.`
        : ''

      const supportText = supportPeople.length > 0
        ? `Her support circle: ${supportPeople.map(p => `${p.name} (${p.relationship})`).join(', ')}.`
        : ''

      try {
        const response = await anthropic.messages.create({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 120,
          system: `You are Kindrest — a warm, grounded wellness companion for mothers.
Your tone is like a trusted friend: honest, non-clinical, never preachy.
You speak in short, human sentences. No bullet points, no headers.
Mothers using this app are often exhausted and time-short — every word must count.`,
          messages: [{
            role: 'user',
            content: `A mother just completed a check-in. She feels: ${mood}.
${indicatorText}
${patternText}
Her regulation phase is: ${regulationPhase}.
She has ${timeAvailable.replace('_', ' ')} available.
${prefText}
${supportText}

These are the care suggestions prepared for her:
${recList}

Write exactly 2 warm sentences (55–70 words total):
1. Acknowledge where she is right now — name it gently without minimising.
2. Invite her into the care kit — one sentence that makes it feel approachable, not prescriptive.
If any recommendation involves actively reaching out to or connecting with a specific person (texting, calling, making plans, expressing appreciation to someone), you may naturally reference a person from her support circle by name. For reflective or internal recs (like "remember someone who survived this"), keep the message general.
Do not list the recommendations. Do not use quotes.`,
          }],
        })

        const text = response.content[0]
        if (text.type === 'text') message = text.text.trim()
      } catch (err) {
        console.error('[care-kit] Claude error:', err)
        // Fall back to default message silently
      }
    }

    // ── Step 5: Increment check-in count ────────────────────────────────────
    // A check-in = a care kit being generated, regardless of whether the user
    // rates any recommendations. This gives an accurate session count.
    if (userId && supabaseAdmin && recommendations.length > 0) {
      const { data: existing } = await supabaseAdmin
        .from('user_preference_profile')
        .select('total_checkins')
        .eq('user_id', userId)
        .single()

      if (existing) {
        await supabaseAdmin
          .from('user_preference_profile')
          .update({
            total_checkins: (existing.total_checkins ?? 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
      } else {
        await supabaseAdmin
          .from('user_preference_profile')
          .insert({ user_id: userId, total_checkins: 1, updated_at: new Date().toISOString() })
      }
    }

    // ── Step 6: Store selected indicators for pattern tracking ──────────────
    // Persists the indicators this mom selected so future sessions and the
    // patterns card can reference what she commonly experiences.
    // Requires: ALTER TABLE user_preference_profile ADD COLUMN IF NOT EXISTS
    //           recent_indicators TEXT[] DEFAULT '{}';
    if (userId && supabaseAdmin && selectedIndicators.length > 0) {
      try {
        await supabaseAdmin
          .from('user_preference_profile')
          .upsert(
            { user_id: userId, recent_indicators: selectedIndicators, updated_at: new Date().toISOString() },
            { onConflict: 'user_id', ignoreDuplicates: false }
          )
      } catch {
        // Non-fatal — column may not exist yet until migration is run
      }
    }

    return NextResponse.json({ recommendations, message })
  } catch (err) {
    console.error('[care-kit] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function defaultMessage(mood: string): string {
  const messages: Record<string, string> = {
    overwhelmed: "You're carrying a lot right now, and that deserves acknowledgment. Here's something small you can do just for you.",
    struggling: "It makes sense that things feel heavy right now. These suggestions are gentle — start with just one.",
    okay: "You're holding it together, even when it's a stretch. Take a moment to give something back to yourself.",
    good: "You're in a good place today — a great time to build on that. Here's what might feel nourishing right now.",
    thriving: "You're showing up fully and it shows. Take a moment to anchor this feeling so you can return to it.",
  }
  return messages[mood] ?? "Here's your personalised care kit for this moment."
}
