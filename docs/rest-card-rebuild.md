# Rest Card — Rebuild

**8 September 2026.** Companion to `docs/rest-card-audit.md`, which describes what this replaced.

The Rest Card no longer derives its squares from the Recommendations table. It deals from **`Rest Card Squares`**, a new Airtable table of hand-written labels, and renders them exactly as stored.

---

## Why

The old card took recommendation titles written as instructions and conjugated the first verb into past tense. It shipped this to a real card:

> You got one thing out of your head and **ontoed** paper

plus six tense mismatches ("You moved your body in a way that **feels** celebratory"), two questions rendered as records, and one em dash. The full list is section F5 of the audit.

The deeper problem was that the content was **derived rather than written**. Every square was a side effect of copy authored for a different screen. The new table is written for the card, in her own voice.

---

## The new content source

**Table: `Rest Card Squares`** (`tbln0gMWra0DciYAK`) — 84 rows.

| Field | Type | Used for |
|---|---|---|
| `#` | number | Display order in Airtable. Not read by the app. |
| `label` | multilineText | The square text, rendered verbatim. |
| `theme` | singleSelect: `body, mind, space, people, play, me` | The balancing axis. |
| `stage` | singleSelect | `all`, or one specific stage. |
| `active` | checkbox **(to add)** | Whether the square can be dealt. |

Distribution: body 15, people 15, play 15, me 15, mind 12, space 12. Every theme is comfortably above the 8 a card needs.

The voice changed deliberately. Labels are first person with the subject dropped - *"Drank water before coffee"*, *"Ate sitting down"* - so the card reads as her own account of the day rather than the app narrating it back to her.

---

## What changed in the code

### `lib/airtable.ts`

**`getRestCardSquares()`** - new. Reads the table, trims, drops rows with no label or no theme.

**Pagination, everywhere.** `fetchTable()` followed only the first page. Airtable returns at most 100 records and signals more with an `offset` that was never read, so at row 101 content would have silently stopped existing - no error, no warning. It now follows the offset, with a 20-page stop so a malformed response cannot loop. This fixes `getRecommendations()` too, which the check-in flow still uses.

If a page fails mid-fetch, the rows already gathered are returned rather than nothing.

### `lib/restcard.ts`

**Deleted:** `toRecordVoice()`, `IRREGULAR` (60 verbs), `RECORD_VOICE_OVERRIDES`, and `SELF_ACTIONS` (the 23 hardcoded squares). There is no rewriting layer left. A square that reads wrong is now fixed in Airtable, by you, without a deploy.

**`selectSuggested()`** rewritten:

1. Deduplicate the pool by label, so a duplicated Airtable row can never take two cells.
2. Drop labels from her last three cards.
3. If that leaves fewer than 8, fall back to the full stage-eligible pool. **This is the only fallback.**
4. Take one square at random from each of the six themes, in random theme order.
5. Top up to 8 at random from what is left.

**`buildCardSquares()`** now returns `null` when the pool cannot supply 8 unique labels, instead of padding from a hardcoded list. **Positions are shuffled**, so the themes don't land in the same cells every time.

### `lib/types.ts`

`RestCardSquare`, `AirtableStage`, and the stage mapping.

### `app/api/rest-card/route.ts`

Draws from `getRestCardSquares()` only. The Recommendations path, the Low-effort filter, and the regulation-type mapping are gone. `user_preference_profile` is no longer read here at all - no preferred, no avoided, no strong regulation types.

**Errors are loud.** An empty or unreachable table returns **503** with a message and a logged error. There is no silent substitute card, because a card built from placeholder copy is worse than no card and tells you nothing is wrong.

If the squares insert fails after the card row is created, the card is deleted rather than left active - a half-dealt card would otherwise block every future deal.

---

## Stage mapping

Onboarding collects six stages; the table needs one value each. Nothing is collapsed: preschool is its own transition, and so is the 3-to-12-month stretch.

| Onboarding | Airtable `stage` |
|---|---|
| `expecting` | `pregnant` |
| `newborn` (0-3mo) | `newborn` |
| `infant` (3-12mo) | `infant` |
| `toddler` (1-3yr) | `toddler` |
| `preschool` (3-5yr) | `preschool` |
| `school_age` (5+) | `school` |

A mother draws squares tagged `all` **or** her own stage. No stage set means `all` only.

**All 84 rows are `all` today**, so the filter is a no-op until you add stage-specific rows. It works the moment you do.

---

## Database

`supabase/rest-card-integrity.sql`:

1. Deletes 4 squares with empty labels, all on one archived prototype card. They render as blank cells and carry nothing.
2. **F1** - `unique (card_id, label)` on `rest_card_squares`. The dealer already guarantees this; the constraint means a future change cannot quietly break it.
3. **F7** - partial unique index on `rest_cards (user_id) where status = 'active'`. Two simultaneous requests can no longer both deal. The loser catches `23505` and returns the winner's card, so a double tap is invisible.

---

## Verification

2000 simulated deals against the live 84 rows:

| Check | Result |
|---|---|
| Cards with a duplicate square | **0** |
| Repeats against the previous card | **0** |
| Malformed cards (wrong size, missing free centre) | **0** |
| Cards containing all six themes | **500 of 500** |
| Distinct labels seen per position | 84 at every position |

Edge cases: a pool of 7 returns `null`; a pool of exactly 8 deals a full card; an empty pool returns `null`; a pool that is entirely duplicates still yields 8 unique squares; a pool where every label is recent falls back and deals rather than blocking her card.

`npm run audit` passes. `npm run build` passes. `tsc --noEmit` clean.

---

## Not changed

Free centre, tap to mark and unmark, the 14-day cycle, line completion retiring the card, the bloom, the "nothing lost if you don't" offer, and the admin report stats are all untouched.

**Existing cards are left alone.** Nobody's active card is redealt. All seven Rest Cards in the database belong to one account, and the only active one expires 10 September, so the old content rolls off on its own within days.

---

## Two things to do in Airtable

Both need `schema.bases:write`, which the current API token does not have, so they are UI steps.

1. **Add an `active` checkbox** to `Rest Card Squares`, then tick it for all 84 rows. Until it exists, the code treats every row as active, so nothing breaks either way - and the moment the column appears it starts filtering. Untick a square to retire it without losing the copy.
2. **Add the stage choices.** The `stage` field currently offers only `all`. Add `pregnant`, `newborn`, `infant`, `toddler`, `preschool`, `school` when you are ready to write stage-specific squares.

One label is over 40 characters: **#5, "Stretched my neck and shook out my shoulders"** (44). It will still render; it is just the longest cell on the board.
