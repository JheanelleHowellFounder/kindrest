# Rest Card — Content Audit

**Read-only report. No code was changed.**
Generated 8 September 2026 against live Airtable (base `appxPVr6mBatB2jjj`, table `Recommendations`).

---

## 1. Where the dealing happens

| File | Role |
|---|---|
| `app/api/rest-card/route.ts` | `GET /api/rest-card`. Finds the active card or deals a new one. Loads her preferences, builds the Airtable pool, gathers recent labels, inserts the 9 square rows. |
| `lib/restcard.ts` | **All the logic.** Layout constants, `selectSuggested()` (the deal), `buildCardSquares()`, the 23-item hardcoded fallback pool, and `toRecordVoice()` (the rewrite). |
| `lib/airtable.ts` | `getRecommendations()` — the fetch and field mapping. |
| `app/api/rest-card/complete/route.ts` | Marks a square done. Not part of dealing. |
| `components/glimmer/RestCard.tsx` | Renders the 3x3 grid. Display only. |
| `app/api/admin/report/route.ts` | Reads card stats. Display only. |

Content flows: **Airtable → `getRecommendations()` → Low-effort filter → `toRecordVoice()` → `selectSuggested()` → `rest_card_squares` rows.**

The rewritten text is **written into the database at deal time**, not rendered on the fly. Changing `toRecordVoice()` or the Airtable titles will not alter cards that already exist.

---

## 2. How the eight squares are chosen

The card is 9 cells: position 4 is a free centre (`'You're here'`, pre-marked done), and the other 8 are dealt.

```ts
export const FREE_POSITION = 4
export const FREE_LABEL = 'You’re here'
export const SUGGESTED_POSITIONS = [0, 1, 2, 3, 5, 6, 7, 8]
export const CARD_CYCLE_DAYS = 14
```

### a. The Low-effort filter

`app/api/rest-card/route.ts` — the only content filter applied:

```ts
const recs = await getRecommendations()
return recs
  .filter(r => r.effort_level === 'Low' && r.title)
  .map(r => ({
    label: toRecordVoice(r.title),
    category: r.category,
    regulation: r.regulation_type,
  }))
```

`effort_level === 'Low'` and a non-empty title. That is the whole filter. **46 of 60 rows survive it.**

### b. Regulation-type balancing

Round-robin, at most one per type until every type has been used once:

```ts
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
```

Six regulation types exist. Round 0 takes one of each (6 squares), round 1 takes 2 more. **Every card is 6 distinct types plus 2 repeats** — and the 2 repeats always come from whichever types sort first, which is her strong types.

### c. Preference weighting

Two separate rankings, both `Number(...) - Number(...)` sorts, so they are binary flags rather than weights:

```ts
// Rank within each regulation type: her strong types and preferred categories first.
Array.from(byType.values()).forEach((list: SelfAction[]) => {
  list.sort((x, y) => Number(preferred.has(y.category)) - Number(preferred.has(x.category)))
})

// Order the types themselves — her strong ones lead, the rest follow shuffled.
const types = shuffle(Array.from(byType.keys()))
  .sort((x, y) => Number(strong.has(y)) - Number(strong.has(x)))
```

`preferred` / `avoided` / `strongRegulationTypes` come from `user_preference_profile`:

```ts
const { data } = await supabaseAdmin
  .from('user_preference_profile')
  .select('preferred_categories, avoided_categories, strong_regulation_types')
```

`avoided` is a hard exclusion, not a weight — it removes the category from the pool entirely (subject to the loosening ladder below).

### d. Stage filter

**There is none.** Nothing in the deal reads `motherhood_stage`. A mother expecting her first and a mother three years postpartum draw from the identical 46 rows.

`capacity_level` is also **never read** by the Rest Card, though every Airtable row has one.

### e. Repeat avoidance (last three cards)

```ts
async function recentCardLabels(uid: string, cards = 3): Promise<string[]> {
  const { data: recent } = await supabaseAdmin
    .from('rest_cards').select('id').eq('user_id', uid)
    .order('created_at', { ascending: false }).limit(cards)
  const { data: squares } = await supabaseAdmin
    .from('rest_card_squares').select('label')
    .in('card_id', recent.map(c => c.id)).eq('source', 'self')
  return (squares ?? []).map(s => s.label).filter(Boolean)
}
```

Up to 24 labels blocked (3 cards x 8). Applied as a filter with a **loosening ladder**:

```ts
let pool = all.filter(a => !avoided.has(a.category) && !recent.has(a.label))
if (pool.length < count) pool = all.filter(a => !recent.has(a.label))
if (pool.length < count) pool = all.filter(a => !avoided.has(a.category))   // <- drops `recent`
if (pool.length < count) pool = [...all]
```

Note the third rung **abandons repeat-avoidance entirely** rather than abandoning `avoided`. See finding F3.

---

## 3. How the "record voice" rewrite happens

**It is a rule-based string transform in `lib/restcard.ts`.** No Claude call, no Airtable field, no lookup of the full sentence except for three named exceptions.

Three parts:

**1. A verb lookup table** — 60 irregular and awkward verbs:

```ts
const IRREGULAR: Record<string, string> = {
  put: 'put', close: 'closed', take: 'took', text: 'texted', let: 'let',
  make: 'made', do: 'did', write: 'wrote', spend: 'spent', move: 'moved',
  ...
}
```

**2. Three whole-title overrides**, for titles that are not "verb + object":

```ts
const RECORD_VOICE_OVERRIDES: Record<string, string> = {
  'Voice memo: name what feels heavy': 'You named what felt heavy, out loud',
  'Write: Right now I wish someone knew…': 'You wrote what you wish someone knew',
  'Write: Right now I wish someone knew...': 'You wrote what you wish someone knew',
}
```

**3. Suffix rules for everything else**, then `'You ' + ...`:

```ts
function pastTenseVerb(w: string): string {
  const lower = w.toLowerCase().replace(/[^a-z]/g, '')
  if (IRREGULAR[lower]) return IRREGULAR[lower]
  if (lower.endsWith('e')) return lower + 'd'
  if (/[^aeiou]y$/.test(lower)) return lower.slice(0, -1) + 'ied'
  // single-syllable consonant-vowel-consonant doubles the final letter (plan → planned)
  if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(lower)) return lower + lower.slice(-1) + 'ed'
  return lower + 'ed'
}

export function toRecordVoice(title: string): string {
  const clean = title.trim().replace(/\s+/g, ' ')
  if (RECORD_VOICE_OVERRIDES[clean]) return RECORD_VOICE_OVERRIDES[clean]
  const words = clean.split(' ')
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
```

**Only the first word is ever conjugated** (plus one word after `and`). It assumes every title begins with an imperative verb. See finding F5 for where that assumption breaks.

---

## 4. Every square currently eligible, as she would see it

**Total eligible: 46** of 60 Airtable rows (Low = 46, Medium = 13, High = 1).
Rendered with the live `toRecordVoice()`. Sorted by `rec_id`.

| # | airtable_id | rec_id | original text | rendered square text | category | regulation type | capacity |
|---|---|---|---|---|---|---|---|
| 1 | `recsOolBLJqC0NxfU` | 1 | Take 3 slow breaths | **You took 3 slow breaths** | Micro Practice | Physical | Level 1 |
| 2 | `reckFGBDYeHUmf3Pp` | 2 | Drink a full glass of water | **You drank a full glass of water** | Micro Practice | Physical | Level 1 |
| 3 | `recKAgV6pnTwQslJz` | 4 | Put one hand on your chest | **You put one hand on your chest** | Micro Practice | Emotional | Level 1 |
| 4 | `recMZbqMvu1jkhPqs` | 5 | Text someone safe | **You texted someone safe** | Connection | Relational | Level 2 |
| 5 | `reckfnORqjhkYiUVf` | 7 | Stretch your shoulders | **You stretched your shoulders** | Movement | Physical | Level 2 |
| 6 | `rec2R4RGGbfY2Ait7` | 9 | Lower the noise | **You lowered the noise** | Environment Reset | Sensory | Level 2 |
| 7 | `rech9wHAxG0KJzehh` | 11 | Celebrate one small win | **You celebrated one small win** | Reflection | Identity | Level 2 |
| 8 | `recxbn0A7qianQoTz` | 14 | Sit quietly before bed | **You sat quietly before bed** | Rest | Emotional | Level 2 |
| 9 | `recO6Ezi7ygSAMaNJ` | 21 | Record a voice memo to yourself | **You recorded a voice memo to yourself** | Reflection | Identity | Level 2 |
| 10 | `recMmfZYyxyOvTNjV` | 22 | Pause and savor this moment | **You paused and savored this moment** | Micro Practice | Emotional | Level 1 |
| 11 | `recyGOTDyIIDpfCfG` | 23 | Identify what made today lighter | **You identified what made today lighter** | Reflection | Mental | Level 2 |
| 12 | `recYbo8Au2xdn87Kt` | 25 | Express gratitude out loud | **You expressed gratitude out loud** | Reflection | Emotional | Level 2 |
| 13 | `rec4rvtkWNOrVIdt9` | 27 | Put phone away for 10 minutes | **You put phone away for 10 minutes** | Environment Reset | Sensory | Level 2 |
| 14 | `recxmP4mqB9Xj2Wt6` | 28 | Stand in sunlight briefly | **You stood in sunlight briefly** | Micro Practice | Physical | Level 1 |
| 15 | `recbyssraawrkW6n2` | 30 | Write one compassionate sentence to yourself | **You wrote one compassionate sentence to yourself** | Reflection | Emotional | Level 2 |
| 16 | `recHefG1pyhoO79nJ` | 31 | Read a message from someone who loves you | **You read a message from someone who loves you** | Connection | Relational | Level 1 |
| 17 | `recUkW3w4XqnKKasV` | 32 | Name one thing that is still yours | **You named one thing that is still yours** | Joy | Identity | Level 1 |
| 18 | `recni5sc67ioMPvp4` | 34 | Spend 3 minutes with something that made you you | **You spent 3 minutes with something that made you you** | Joy | Identity | Level 2 |
| 19 | `rectVrNHcQN3mjHu4` | 35 | Write: Right now I wish someone knew… | **You wrote what you wish someone knew** | Reflection | Emotional | Level 2 |
| 20 | `recRUbWvqI4gaO8X0` | 36 | Feel the ground hold you | **You felt the ground hold you** | Rest | Physical | Level 1 |
| 21 | `rec2mRYNB3IAILqQL` | 37 | Close your eyes for 90 seconds | **You closed your eyes for 90 seconds** | Rest | Physical | Level 1 |
| 22 | `recRFanVsrJtVxkPn` | 38 | Let your body be horizontal | **You let your body be horizontal** | Rest | Physical | Level 2 |
| 23 | `recmnd8HwxoVDRm2P` | 39 | Text someone: I am having a hard day | **You texted someone: I am having a hard day** | Connection | Relational | Level 1 |
| 24 | `recsCLc3DmBwiEMxl` | 41 | Write your three non-negotiables for tomorrow | **You wrote your three non-negotiables for tomorrow** | Micro Practice | Mental | Level 4 |
| 25 | `reck5BHZHwP2n1hqh` | 43 | Get one thing out of your head and onto paper | **You got one thing out of your head and ontoed paper** | Micro Practice | Mental | Level 2 |
| 26 | `recYEk0UPVSE6sNfm` | 44 | Close every tab you are not using right now | **You closed every tab you are not using right now** | Environment Reset | Mental | Level 2 |
| 27 | `recDhzHKrPlANftX9` | 45 | Shake out your hands and roll your neck | **You shook out your hands and rolled your neck** | Micro Practice | Physical | Level 2 |
| 28 | `recFcIjAhYAWAid8B` | 46 | Say out loud: "I only have to handle right now" | **You said out loud: "I only have to handle right now"** | Micro Practice | Mental | Level 1 |
| 29 | `recCgA7Yu602YBZ9O` | 48 | Send a quick 'thinking of you' to someone you've been meaning to reach | **You sent a quick 'thinking of you' to someone you've been meaning to reach** | Connection | Relational | Level 2 |
| 30 | `recN6aUQTAKSdcW1a` | 49 | Share one real thing with someone safe today | **You shared one real thing with someone safe today** | Connection | Relational | Level 2 |
| 31 | `reckGZie8BHyjQeFJ` | 50 | Make something warm to drink and actually sit down with it | **You made something warm to drink and actually sat down with it** | Rest | Sensory | Level 2 |
| 32 | `recp0h6mXu1tmxAtU` | 51 | Change one thing about your physical environment | **You changed one thing about your physical environment** | Micro Practice | Sensory | Level 2 |
| 33 | `recT9pWsK0EW90vtW` | 52 | Check in: what emotion is actually here right now? | **You checked in: what emotion is actually here right now?** | Reflection | Emotional | Level 2 |
| 34 | `rec4cKl0BSCNATn44` | 53 | Take a 5-minute walk - no destination, no purpose | **You took a 5-minute walk - no destination, no purpose** | Movement | Physical | Level 2 |
| 35 | `recVEEDZfnZQKSJoM` | 54 | Do one thing slowly on purpose | **You did one thing slowly on purpose** | Micro Practice | Physical | Level 2 |
| 36 | `reczYfSMKhyrfFl6n` | 56 | Let yourself feel good without qualifying it | **You let yourself feel good without qualifying it** | Reflection | Emotional | Level 3 |
| 37 | `recKKSXGHBRA5LuIX` | 57 | Put on music that's just for you - not the kids | **You put on music that's just for you - not the kids** | Joy | Sensory | Level 3 |
| 38 | `rech7HXrdwS7gTNkJ` | 58 | Do something that feels indulgent but is actually just normal | **You did something that feels indulgent but is actually just normal** | Joy | Sensory | Level 3 |
| 39 | `rec0L7twodfuCGRqv` | 59 | Move your body in a way that feels celebratory | **You moved your body in a way that feels celebratory** | Movement | Physical | Level 2 |
| 40 | `reci3yTDdZuKPvGuU` | 60 | Notice what your body feels like when things are okay | **You noticed what your body feels like when things are okay** | Micro Practice | Physical | Level 2 |
| 41 | `recTd74CJUUPVXOtS` | 62 | Make a plan with someone you love - not because anything is wrong | **You made a plan with someone you love - not because anything is wrong** | Connection | Relational | Level 2 |
| 42 | `recSOqMDOnrrgPp2j` | 63 | Create a small ritual that marks this as a good day | **You created a small ritual that marks this as a good day** | Joy | Sensory | Level 2 |
| 43 | `recrY95xw5Da8fXMQ` | 66 | Plan something to look forward to - and actually put it in the calendar | **You planned something to look forward to - and actually put it in the calendar** | Joy | Identity | Level 4 |
| 44 | `reclAi1tIXYtseECL` | 70 | Color something — no goal, no rules | **You colored something — no goal, no rules** | Rest | Mental | Level 1 |
| 45 | `recnEtuQeLxbXH8je` | 71 | Spend 5 minutes coloring | **You spent 5 minutes coloring** | Joy | Mental | Level 2 |
| 46 | `recFmSBW3DPNDtVJM` | 74 | Voice memo: name what feels heavy | **You named what felt heavy, out loud** | Reflection | Mental | Level 2 |

### Distribution of the 46

| Regulation type | n | | Category | n | | Capacity | n |
|---|---|---|---|---|---|---|---|
| Physical | 12 | | Micro Practice | 12 | | Level 1 | 12 |
| Mental | 8 | | Reflection | 9 | | Level 2 | 29 |
| Emotional | 8 | | Joy | 7 | | Level 3 | 3 |
| Sensory | 7 | | Rest | 6 | | Level 4 | 2 |
| Relational | 6 | | Connection | 6 | | | |
| Identity | 5 | | Movement | 3 | | | |
| | | | Environment Reset | 3 | | | |

No two rendered labels are identical, so the pool has no internal duplicates today.

---

## 5. Airtable fields, and which the Rest Card uses

`Recommendations` has **10 fields**. All 60 rows populate all of them except `saveable` (54 of 60).

| Field | On all 60? | Read by `getRecommendations()` | Used by the Rest Card |
|---|---|---|---|
| `rec_id` | yes | yes | no (only as the filter for null rows) |
| `title` | yes | yes | **yes** — the entire square text |
| `category` | yes | yes | **yes** — preferred / avoided matching |
| `regulation_type` | yes | yes | **yes** — the balancing axis |
| `effort_level` | yes | yes | **yes** — the only content filter |
| `capacity_level` | yes | yes | **no** |
| `description` | yes | yes | **no** |
| `regulation_phase` | yes | yes | **no** |
| `time_suggestion` | yes | yes | **no** |
| `saveable` | 54 of 60 | yes | **no** |

**The Rest Card uses 4 of 10 fields.** `description` is the richer copy and is never shown on a card. `capacity_level` is the field that most closely means "how much does she have in her today", and it is ignored — which is why two Level 4 items are dealt onto a card whose stated purpose is "doable on a hard day":

- rec 41 — *You wrote your three non-negotiables for tomorrow*
- rec 66 — *You planned something to look forward to - and actually put it in the calendar*

---

## 6. Findings

### F1. `buildCardSquares` can produce a card with duplicate squares — **highest severity**

```ts
const suggested = selectSuggested(opts, SUGGESTED_POSITIONS.length, opts.pool)
SUGGESTED_POSITIONS.forEach((p, i) => {
  squares.push({ position: p, label: suggested[i]?.label ?? SELF_ACTIONS[i].label, source: 'self', status: 'open' })
})
```

If `selectSuggested` returns fewer than 8, the gaps are filled from `SELF_ACTIONS` **by index**, with no check against what was already picked. `SELF_ACTIONS[i]` is not a fallback for "the item at slot i" — it is an unrelated list. Two failure modes:

- The filler can duplicate a label the selector already chose.
- The filler mixes hardcoded copy into a card otherwise built from Airtable.

Nothing enforces uniqueness at insert time either — there is no unique constraint on `(card_id, label)`.

**Reachable when:** the `round < 10` loop exits early, or the pool is smaller than 8 after filtering.

### F2. The 8th and 7th squares are always the same two regulation types

Round 0 takes one of each of the 6 types. Round 1 takes 2 more, and `types` is sorted with her strong types first, so **the two doubled types are always her strong ones**, every card, for as long as her profile is stable. Structurally this is the opposite of the "cross her whole self" intent for those two slots.

### F3. The loosening ladder drops repeat-avoidance before it drops `avoided`

```ts
if (pool.length < count) pool = all.filter(a => !avoided.has(a.category))   // recent no longer filtered
```

The third rung keeps her avoided-category exclusions and throws away repeat-avoidance. That is the wrong precedence: repeating a square she saw last card is a mild disappointment, but the ladder should exhaust the softer constraint first. As written, a mother with several avoided categories gets **repeats across consecutive cards** while the system still protects a preference she expressed once.

Not currently reachable with 46 eligible rows and at most 24 blocked, but it is one Airtable edit away.

### F4. Falling back to the hardcoded pool is silent

```ts
const all = source && source.length >= count ? source : SELF_ACTIONS
```

If Airtable returns fewer than 8 Low-effort rows — an outage, a token expiry, a bulk edit — the card silently switches to the 23 hardcoded `SELF_ACTIONS`. `recommendationPool()` catches its own errors and returns `[]`, so an Airtable failure logs one line and otherwise looks like a normal card. Nothing in the response says which pool was used.

### F5. The rewrite produces at least one broken sentence today, and several tense mismatches

**Outright broken** — the `and` rule conjugates the next word without checking it is a verb:

| rec | title | rendered |
|---|---|---|
| 43 | Get one thing out of your head and onto paper | **"You got one thing out of your head and ontoed paper"** |

**Tense mismatch** — only the first verb is converted, so the rest of the sentence stays present tense:

| rec | rendered |
|---|---|
| 59 | You moved your body in a way that **feels** celebratory |
| 58 | You did something that **feels** indulgent but **is** actually just normal |
| 60 | You noticed what your body **feels** like when things **are** okay |
| 63 | You created a small ritual that **marks** this as a good day |
| 62 | You made a plan with someone you love - not because anything **is** wrong |
| 56 | You let yourself feel good without qualifying it |

**A question rendered as a record** — reads as an instruction, which is the exact thing the card is supposed to avoid:

| rec | rendered |
|---|---|
| 52 | You checked in: what emotion is actually here right now? |
| 46 | You said out loud: "I only have to handle right now" |

**Grammar inherited from the title:**

| rec | rendered |
|---|---|
| 27 | You put **phone** away for 10 minutes *(missing "your")* |

**Punctuation that violates the no-em-dash rule:**

| rec | rendered |
|---|---|
| 70 | You colored something **—** no goal, no rules |

Six further rows use ` - ` mid-sentence (recs 53, 57, 62, 66), which reads as a dash rather than a hyphen.

### F6. `lib/airtable.ts` does not paginate — a silent cliff at 100 rows

```ts
const res = await fetch(`${BASE_URL}/${BASE_ID}/${encodeURIComponent(tableName)}`, ...)
const data = await res.json()
return data.records ?? []
```

Airtable returns at most 100 records per page and signals more with an `offset` field, which is never read. **60 rows today, so nothing is being lost.** At 101 rows the app will silently use the first 100 forever, with no error. Verified directly: the live call returns 60 records and no `offset`.

### F7. Concurrent requests can deal two cards

`GET /api/rest-card` reads for an active card, then archives and inserts, with no lock or unique constraint. Two near-simultaneous requests (a double tap, a retry, two tabs) can both find nothing and both insert. The second insert archives the first, so she would see a card that changes under her.

### F8. Rewritten text is frozen at deal time

Squares are stored as rendered strings. Fixing `toRecordVoice()` or an Airtable title will not repair any card already dealt — including the "ontoed paper" square, which will sit on existing cards for up to 14 days after a fix.

---

## Summary for the rewrite

- **46 eligible squares**, from 60 Airtable rows, filtered on `effort_level === 'Low'` alone.
- **4 of 10 Airtable fields** reach the card. `capacity_level` and `description` are the two worth pulling in.
- **No stage filter and no capacity filter**, so Level 4 planning tasks land on hard-day cards.
- **The rewrite is rules, not judgment.** It handles "verb + object" and nothing else. If the titles are being rewritten anyway, writing a **`rest_card_text` field in Airtable** would remove `toRecordVoice()`, `IRREGULAR`, and every finding in F5 in one move — and it would let each square be written for the card rather than derived from an instruction.
- **F1 is a real bug** and is worth fixing whatever happens to the content.
