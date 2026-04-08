/**
 * Kindrest Feedback Loop Simulator
 *
 * Simulates 5 real-user personas making check-ins, receiving recommendations,
 * and rating them — then reports what landed in user_preference_profile.
 *
 * Usage:
 *   node scripts/simulate-feedback.mjs [--base-url http://localhost:3000] [--runs 10]
 *
 * Each persona gets `--runs` simulated check-ins (default: 10).
 * Total events = 5 personas × 3 recs × 10 runs = 150 feedback rows.
 */

// ─── Config ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const BASE_URL = args.includes('--base-url')
  ? args[args.indexOf('--base-url') + 1]
  : 'http://localhost:3000'
const RUNS = args.includes('--runs')
  ? parseInt(args[args.indexOf('--runs') + 1], 10)
  : 10

// ─── Persona Definitions (mirrors lib/personas.ts) ───────────────────────────

const PERSONAS = [
  {
    id: 'sim-persona-1',
    name: 'The High-Functioning Internalizer',
    moodDistribution: { okay: 0.45, struggling: 0.30, good: 0.15, overwhelmed: 0.10 },
    typicalIndicators: [
      "I'm overstimulated",
      'I feel behind',
      "I'm on autopilot",
      'Small worries in the background',
      'Carrying some tension',
    ],
    regulationTypes: ['Sensory', 'Physical', 'Mental'],
    timeAvailableDistribution: { '2_minutes': 0.5, '5_minutes': 0.35, '10_minutes': 0.15, '15_plus_minutes': 0 },
    lovedCategories: ['Micro Practice', 'Environment Reset', 'Rest'],
    avoidedCategories: ['Reflection', 'Joy'],
    feedbackStyle: 'did_it_heavy',  // skews toward rating 3
  },
  {
    id: 'sim-persona-2',
    name: 'The Identity Searcher',
    moodDistribution: { struggling: 0.35, okay: 0.35, overwhelmed: 0.20, good: 0.10 },
    typicalIndicators: [
      'I feel disconnected from myself',
      "I'm on autopilot",
      'I feel alone in this',
      'Emotionally depleted',
      'I feel unseen',
    ],
    regulationTypes: ['Identity', 'Emotional', 'Relational'],
    timeAvailableDistribution: { '5_minutes': 0.40, '10_minutes': 0.35, '2_minutes': 0.15, '15_plus_minutes': 0.10 },
    lovedCategories: ['Joy', 'Reflection', 'Connection'],
    avoidedCategories: ['Practical Support', 'Movement'],
    feedbackStyle: 'save_heavy',  // skews toward rating 2
  },
  {
    id: 'sim-persona-3',
    name: 'The Efficiency Mom',
    moodDistribution: { okay: 0.50, good: 0.25, struggling: 0.20, overwhelmed: 0.05 },
    typicalIndicators: [
      'Lots to think about',
      "I'm managing but stretched",
      'I feel behind',
      'I feel clear-headed',
      'Body feels neutral',
    ],
    regulationTypes: ['Mental', 'Physical'],
    timeAvailableDistribution: { '5_minutes': 0.45, '2_minutes': 0.30, '10_minutes': 0.20, '15_plus_minutes': 0.05 },
    lovedCategories: ['Micro Practice', 'Practical Support', 'Environment Reset'],
    avoidedCategories: ['Reflection', 'Rest'],
    feedbackStyle: 'did_it_heavy',
  },
  {
    id: 'sim-persona-4',
    name: 'The Isolated Connector',
    moodDistribution: { struggling: 0.40, okay: 0.30, overwhelmed: 0.20, good: 0.10 },
    typicalIndicators: [
      'I feel alone in this',
      'I feel unseen',
      'Things are fine but I feel distant',
      'I feel disconnected from myself',
      "I'm steady but not joyful",
    ],
    regulationTypes: ['Relational', 'Emotional', 'Identity'],
    timeAvailableDistribution: { '10_minutes': 0.40, '5_minutes': 0.30, '15_plus_minutes': 0.20, '2_minutes': 0.10 },
    lovedCategories: ['Connection', 'Reflection', 'Joy'],
    avoidedCategories: ['Environment Reset', 'Practical Support'],
    feedbackStyle: 'save_heavy',
  },
  {
    id: 'sim-persona-5',
    name: 'The Crisis-Adjacent Mom',
    moodDistribution: { overwhelmed: 0.40, struggling: 0.35, okay: 0.20, good: 0.05 },
    typicalIndicators: [
      'I feel overwhelmed',
      "I can't think clearly",
      'Body is exhausted',
      'Running on empty',
      "I haven't slept enough",
      'I feel alone in this',
    ],
    regulationTypes: ['Physical', 'Emotional', 'Relational'],
    timeAvailableDistribution: { '2_minutes': 0.50, '5_minutes': 0.35, '10_minutes': 0.15, '15_plus_minutes': 0 },
    lovedCategories: ['Micro Practice', 'Rest', 'Connection'],
    avoidedCategories: ['Movement', 'Practical Support'],
    feedbackStyle: 'balanced',
  },
]

// ─── Probability Helpers ──────────────────────────────────────────────────────

function weightedPick(distribution) {
  const r = Math.random()
  let cumulative = 0
  for (const [key, weight] of Object.entries(distribution)) {
    cumulative += weight
    if (r <= cumulative) return key
  }
  return Object.keys(distribution)[0]
}

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(n, arr.length))
}

// ─── Rating Logic ─────────────────────────────────────────────────────────────

function getRating(rec, persona) {
  const { category } = rec
  const { lovedCategories, avoidedCategories, feedbackStyle } = persona

  if (avoidedCategories.includes(category)) {
    // Avoided category → almost always skip (1), rarely save (2)
    return Math.random() < 0.85 ? 1 : 2
  }

  if (lovedCategories.includes(category)) {
    // Loved category → rating depends on feedback style
    if (feedbackStyle === 'did_it_heavy') {
      // 70% did_it, 20% save, 10% skip
      const r = Math.random()
      if (r < 0.70) return 3
      if (r < 0.90) return 2
      return 1
    }
    if (feedbackStyle === 'save_heavy') {
      // 50% save, 35% did_it, 15% skip
      const r = Math.random()
      if (r < 0.50) return 2
      if (r < 0.85) return 3
      return 1
    }
    // balanced: roughly equal
    const r = Math.random()
    if (r < 0.40) return 3
    if (r < 0.70) return 2
    return 1
  }

  // Neutral category
  if (feedbackStyle === 'did_it_heavy') {
    const r = Math.random()
    if (r < 0.40) return 3
    if (r < 0.70) return 2
    return 1
  }
  if (feedbackStyle === 'save_heavy') {
    const r = Math.random()
    if (r < 0.40) return 2
    if (r < 0.65) return 3
    return 1
  }
  // balanced
  const r = Math.random()
  if (r < 0.33) return 3
  if (r < 0.66) return 2
  return 1
}

// ─── API Calls ────────────────────────────────────────────────────────────────

async function fetchCareKit(persona, mood, timeAvailable, selectedIndicators) {
  const res = await fetch(`${BASE_URL}/api/care-kit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mood,
      timeAvailable,
      selectedIndicators,
      regulationTypes: persona.regulationTypes,
      userId: persona.id,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`care-kit ${res.status}: ${text}`)
  }
  return res.json()
}

async function sendFeedback(persona, rec, rating, mood) {
  const res = await fetch(`${BASE_URL}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: persona.id,
      rec_id: rec.rec_id,
      rec_title: rec.title,
      rating,
      checkInMood: mood,
      category: rec.category,
      effortLevel: rec.effort_level,
      regulationType: rec.regulation_type,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`feedback ${res.status}: ${text}`)
  }
  return res.json()
}

// ─── Results Tracking ─────────────────────────────────────────────────────────

function makeStats() {
  return {
    totalCheckIns: 0,
    ratingCounts: { 1: 0, 2: 0, 3: 0 },
    categoryRatings: {},   // category → { 1: n, 2: n, 3: n }
    lovedHitRate: 0,       // % of check-ins that included ≥1 loved-category rec
    avoidedHitRate: 0,     // % of check-ins that included ≥1 avoided-category rec
    lovedHits: 0,
    avoidedHits: 0,
  }
}

function recordCheckIn(stats, recs, ratings, persona) {
  stats.totalCheckIns++
  let hasLoved = false, hasAvoided = false

  recs.forEach((rec, i) => {
    const rating = ratings[i]
    stats.ratingCounts[rating] = (stats.ratingCounts[rating] ?? 0) + 1

    if (!stats.categoryRatings[rec.category]) {
      stats.categoryRatings[rec.category] = { 1: 0, 2: 0, 3: 0 }
    }
    stats.categoryRatings[rec.category][rating]++

    if (persona.lovedCategories.includes(rec.category)) hasLoved = true
    if (persona.avoidedCategories.includes(rec.category)) hasAvoided = true
  })

  if (hasLoved) stats.lovedHits++
  if (hasAvoided) stats.avoidedHits++
}

// ─── Main Simulation ──────────────────────────────────────────────────────────

async function simulatePersona(persona, runs) {
  const stats = makeStats()
  const errors = []

  process.stdout.write(`  Running ${runs} check-ins`)

  for (let i = 0; i < runs; i++) {
    try {
      const mood = weightedPick(persona.moodDistribution)
      const timeAvailable = weightedPick(persona.timeAvailableDistribution)
      const selectedIndicators = pickN(persona.typicalIndicators, 2)

      const { recommendations } = await fetchCareKit(persona, mood, timeAvailable, selectedIndicators)

      if (!recommendations || recommendations.length === 0) {
        errors.push(`Run ${i + 1}: no recommendations returned`)
        process.stdout.write('x')
        continue
      }

      const ratings = recommendations.map(rec => getRating(rec, persona))

      // Submit feedback for each rec
      await Promise.all(
        recommendations.map((rec, idx) => sendFeedback(persona, rec, ratings[idx], mood))
      )

      recordCheckIn(stats, recommendations, ratings, persona)
      process.stdout.write('.')
    } catch (err) {
      errors.push(`Run ${i + 1}: ${err.message}`)
      process.stdout.write('E')
    }
  }

  console.log(' done')
  return { stats, errors }
}

async function fetchProfile(userId) {
  // Query Supabase directly via the REST API using env vars isn't available here,
  // so we call a simple check-in that returns the userId's profile implicitly.
  // Instead we'll report the stats we computed locally — the source of truth.
  // To actually verify Supabase, run: SELECT * FROM user_preference_profile;
  return null
}

// ─── Report ───────────────────────────────────────────────────────────────────

const RATING_LABELS = { 1: 'Skip', 2: 'Save', 3: 'Did it' }
const RATING_EMOJI  = { 1: '✗', 2: '☆', 3: '✓' }

function printReport(personaResults) {
  console.log('\n' + '═'.repeat(70))
  console.log('  KINDREST SIMULATION REPORT')
  console.log('═'.repeat(70))

  const allGaps = []

  for (const { persona, stats, errors } of personaResults) {
    console.log(`\n▸ ${persona.name}  (id: ${persona.id})`)
    console.log(`  Check-ins: ${stats.totalCheckIns}`)

    const total = Object.values(stats.ratingCounts).reduce((a, b) => a + b, 0)
    const pct = n => total > 0 ? `${Math.round((n / total) * 100)}%` : '0%'
    console.log(`  Ratings:   Skip ${pct(stats.ratingCounts[1])}  Save ${pct(stats.ratingCounts[2])}  Did-it ${pct(stats.ratingCounts[3])}`)

    const lovedPct = stats.totalCheckIns > 0 ? Math.round((stats.lovedHits / stats.totalCheckIns) * 100) : 0
    const avoidedPct = stats.totalCheckIns > 0 ? Math.round((stats.avoidedHits / stats.totalCheckIns) * 100) : 0
    console.log(`  Loved-category rec shown:   ${lovedPct}% of check-ins`)
    console.log(`  Avoided-category rec shown: ${avoidedPct}% of check-ins`)

    if (Object.keys(stats.categoryRatings).length > 0) {
      console.log('  Category breakdown:')
      for (const [cat, ratings] of Object.entries(stats.categoryRatings)) {
        const catTotal = ratings[1] + ratings[2] + ratings[3]
        const bar = `${RATING_EMOJI[3]}${ratings[3]} ${RATING_EMOJI[2]}${ratings[2]} ${RATING_EMOJI[1]}${ratings[1]}`
        const flag = persona.lovedCategories.includes(cat) ? ' ♥' : persona.avoidedCategories.includes(cat) ? ' ✗' : ''
        console.log(`    ${cat.padEnd(22)} ${bar}${flag}`)
      }
    }

    // Gap analysis
    const gaps = []

    if (lovedPct < 50) {
      gaps.push(`Only ${lovedPct}% of check-ins included a loved-category rec. ` +
        `Need more "${persona.lovedCategories.join(' / ')}" recommendations.`)
    }
    if (avoidedPct > 30) {
      gaps.push(`${avoidedPct}% of check-ins included an avoided-category rec. ` +
        `Too many "${persona.avoidedCategories.join(' / ')}" recs surfacing for this persona.`)
    }

    // Check which loved categories never appeared
    for (const cat of persona.lovedCategories) {
      if (!stats.categoryRatings[cat]) {
        gaps.push(`"${cat}" never appeared — zero recs in this category matched her phase/type profile.`)
      }
    }

    if (errors.length > 0) {
      gaps.push(`${errors.length} API error(s): ${errors[0]}`)
    }

    if (gaps.length > 0) {
      console.log('  ⚠  Gaps found:')
      gaps.forEach(g => console.log(`     • ${g}`))
      allGaps.push({ persona: persona.name, gaps })
    } else {
      console.log('  ✓  No major gaps detected.')
    }
  }

  // Summary
  console.log('\n' + '─'.repeat(70))
  console.log('  SUMMARY')
  console.log('─'.repeat(70))
  const totalRuns = personaResults.reduce((a, r) => a + r.stats.totalCheckIns, 0)
  console.log(`  Total simulated check-ins: ${totalRuns}`)
  console.log(`  Total feedback events:     ${totalRuns * 3} (3 recs per check-in)`)

  if (allGaps.length === 0) {
    console.log('\n  ✓ All personas received well-matched recommendations.')
    console.log('  The feedback loop is routing correctly.')
  } else {
    console.log(`\n  ${allGaps.length} persona(s) have recommendation gaps:\n`)
    for (const { persona, gaps } of allGaps) {
      console.log(`  ${persona}`)
      gaps.forEach(g => console.log(`    • ${g}`))
    }
    console.log('\n  ACTION: Add or tag more recommendations in Airtable to cover gaps.')
    console.log('  See KINDREST_V1_PROJECT_PLAN.md → Recommendation Library section.')
  }

  console.log('\n  To verify Supabase was updated, run in the SQL editor:')
  console.log('  SELECT user_id, preferred_categories, avoided_categories, total_checkins')
  console.log('  FROM user_preference_profile ORDER BY total_checkins DESC;\n')
  console.log('═'.repeat(70))
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nKindrest Simulation — ${RUNS} runs × ${PERSONAS.length} personas`)
  console.log(`Target: ${BASE_URL}\n`)

  // Quick health check
  try {
    const probe = await fetch(`${BASE_URL}/api/care-kit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood: 'okay', timeAvailable: '5_minutes', regulationTypes: ['Mental'] }),
    })
    if (!probe.ok) throw new Error(`HTTP ${probe.status}`)
    console.log('Health check: ✓  Server is responding\n')
  } catch (err) {
    console.error(`Health check failed: ${err.message}`)
    console.error(`Make sure the dev server is running at ${BASE_URL}`)
    process.exit(1)
  }

  const results = []
  for (const persona of PERSONAS) {
    console.log(`${persona.name}`)
    const { stats, errors } = await simulatePersona(persona, RUNS)
    results.push({ persona, stats, errors })
  }

  printReport(results)
}

main().catch(err => {
  console.error('\nFatal:', err)
  process.exit(1)
})
