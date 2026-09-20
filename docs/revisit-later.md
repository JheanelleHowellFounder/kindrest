# Revisit Later

Decisions deliberately parked, and what each one would take. Each entry says what it is, why it was parked, and where the work already done lives, so picking it back up doesn't start from zero.

**Current focus (19 September 2026): audience and user growth.** All marketing assets point at the Kindrest landing page. Partner slugs, signup-source granularity and SEO are explicitly *not* priorities.

---

## Custom care plans from her own data

**Parked:** 15 September 2026. Scoped 19 September.

**The goal, in her words:** reduce the mental load of figuring out **how** to take care of yourself. A page that says *"for where you are today, this is what feels like support to you."*

**Most of it already exists**, scattered across screens:

| Piece | Built? | Where |
|---|---|---|
| Her pattern in one sentence | **Yes** | History already writes *"The last few check-ins have been harder ones, and when things get heavy, you tend to reach for [category]"* |
| What's worked for her | **Yes** | History "Top techniques" with counts; Library filtered by Done and Saved |
| Choosing for her, by mood and time | **Mostly** | The care kit already does this. It's transient — she can't return to it |
| A day-one version, before any check-in | **No** | Nothing uses stage, time window or support circle this way |
| A week shaped around her | **No** | Needs 5+ check-ins |
| A written summary of her | **No** | And AI-written copy was rejected — see [[feedback-founder-writes-copy]] |

**So the remaining work is assembly, not new intelligence:**

| Build | Effort |
|---|---|
| A care plan page she can return to, pulling together what History and the care kit already produce | ~2 days |
| A day-one version built from onboarding answers, for brand-new users | ~1 day |

**Why the day-one version matters most right now:** an acquisition push brings mothers who all sit at one check-in. The pattern sentence needs at least two check-ins with mood, so it shows nothing until they return.

**Constraints:** not clinical, not prescriptive (`components/shared/WhatKindrestIs.tsx` is the boundary); no scores, streaks or progress bars; fixed copy comes from her Airtable tables, not from a model.

---

## Free vs paid

**Parked:** 15 September 2026. Revisit once there are four weeks of exact check-in data — exact counting began 15 September 2026.

**Features**

| Feature | At launch | Later |
|---|---|---|
| Daily glimmer, check-in, care kit | Free | Free |
| Safety net | Free | Free, always |
| Rest Card, Love Notes | Free | Free — Love Notes is the growth loop |
| History and counts | Free | Free |
| Care plan: the returnable page and day-one version | Free | Free |
| Care plan: a week shaped around her | — | Paid |
| Full journal history and search | Free | Paid |
| Export her data | — | Paid |
| Partner cohort features | B2B | B2B |

**Pay structure**

| Option | Price | Who pays | When |
|---|---|---|---|
| B2B pilot | $5,000 / 3 months, 50 mothers | Employer | Live now |
| B2B ongoing | $350/mo up to 25 · $650/mo up to 50 | Employer | Live now |
| Founding member price lock | Promise now, charge later | Mother | During the growth push |
| Consumer monthly | $6–9 | Mother | After 100 users |
| Consumer annual | $49–69 | Mother | With monthly |

**Pay what you can was considered and rejected** (19 September 2026): it produces no pricing signal, most people choose the lowest tier, and it makes revenue unforecastable at exactly the moment willingness to pay needs testing.

**Nothing is built.** Consumer billing is roughly 5 days: Stripe, entitlements, and the states around lapsing.

---

## Care kit "how" lines

**Parked:** 15 September 2026, by the founder. Not the right moment to review 60 lines of copy.

**What it is:** a short, plain instruction (8–13 words) for each of the 60 recommendations, meant to sit on the care kit card, with the full description moving behind a "Why this helps" tap.

**Why it may not happen as designed:** the founder is concerned that shortening cards loses the substance of each recommendation, and would rather keep the fuller descriptions visible. The care kit redesign shipped on that basis, **with descriptions intact**. The how lines are an optional layer, not a dependency.

**Work already done:** all 60 lines drafted in [`docs/care-kit-how-lines.md`](care-kit-how-lines.md). Not in Airtable, not read by the app.

**To pick back up:** she reviews and edits the lines, adds a `how` long-text column to the Recommendations table (the API token can't create columns — see [[project-airtable-content-tables]]), then the app reads it.

### Content problems in the live recommendations

Found while drafting, unchanged in Airtable, and **visible to mothers today**:

- **#21** "Record a voice memo to yourself": two typos, "and and" and "gelt" (should be "felt").
- **#64** "Write a letter to yourself from six months ago": the title says a letter *from* your past self; the description is a letter *to* her.
- **#19** "Plan one small future support": the description is three words ("Book something helpful."), too thin to guide anyone.
- **#25** "Express gratitude out loud": title says out loud, description says write it down.
- **Em dashes** in #35, #37, #41, #43, #44, #52, #70, #71, #74.
- **Emoji** at the end of #11 and #12.

---

## Deprioritised, deliberately

Recorded so nobody rebuilds them by accident.

| Item | Decision, 19 September 2026 |
|---|---|
| **Partner slugs** (`/join/<slug>`) | No valuable use case right now. The Season Marietta link stays live because it costs nothing and cards may still go out, but it isn't a workstream |
| **`signup_source` column** | Never migrated, and not needed. "How did you hear about Kindrest?" already captures word of mouth and flyers, which is what creative outreach produces |
| **More "how did you hear" options** | Current list is enough |
| **SEO / sitemap submission** | Not a meaningful value add at this stage |
