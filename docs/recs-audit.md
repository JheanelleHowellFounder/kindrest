# Recommendations audit

*Read-only audit, 2026-11-24. No code and no Airtable data changed.*

**60 recommendations** pulled from the Airtable `Recommendations` table (offset pagination and field mapping mirroring `fetchTable` / `getRecommendations` in `lib/airtable.ts`; the helper itself cannot be imported outside Next because `getRecommendations` is wrapped in React's `cache()`).

**358 feedback rows** from `recommendation_feedback`, across 46 recs. Ratings: 1 = skip, 2 = save, 3 = did it.

## 1. Every recommendation

| id | title | phase | type | cap | effort | skip | save | did | verdict | reason | suggested rewrite |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Take 3 slow breaths | Contain | Physical | L1 | Low | 0 | 1 | 5 | **Keep** | Single action, fits Level 1, reads as invitation |  |
| 2 | Drink a full glass of water | Contain | Physical | L1 | Low | 2 | 0 | 1 | **Rewrite** | Hydration statistic lectures; cut to the act itself | Not a sip. A full glass, slowly. |
| 4 | Put one hand on your chest | Contain | Emotional | L1 | Low | 0 | 3 | 3 | **Keep** | One gesture, no instruction, lands as permission |  |
| 5 | Text someone safe | Contain | Relational | L2 | Low | 2 | 3 | 2 | **Retire** | Near-duplicate of #39, which is sharper |  |
| 7 | Stretch your shoulders | Stabilize | Physical | L2 | Low | 1 | 0 | 3 | **Keep** | One movement, fits capacity, overlaps #45 only loosely |  |
| 9 | Lower the noise | Stabilize | Sensory | L2 | Low | 0 | 1 | 7 | **Rewrite** | Clinical register ("nervous system absorbing sound") | One layer off — the TV, the music, the podcast. Not everything. Just one. |
| 10 | Delay one non-urgent task | Stabilize | Mental | L3 | Medium | 0 | 0 | 0 | **Rewrite** | Calendar review is planning, not one action | What on tomorrow could wait until next week? Move it. |
| 11 | Celebrate one small win | Maintain | Identity | L2 | Low | 3 | 5 | 4 | **Rewrite** | Three options, exclamation marks, "every win counts" | Name one thing you managed today. That is the whole task. |
| 12 | Prep one small thing for tomorrow | Maintain | Mental | L3 | Medium | 7 | 5 | 7 | **Keep** | Equal skips and did-its; fits Level 3 |  |
| 14 | Sit quietly before bed | Maintain | Emotional | L2 | Low | 6 | 4 | 4 | **Rewrite** | Clinical close; "nervous system come down on its own terms" | Sit for a few minutes before bed. Not scrolling, not planning. Just sitting. |
| 15 | Declutter one surface | Maintain | Mental | L3 | Medium | 4 | 4 | 9 | **Keep** | One surface, concrete, strongest did-it count after #28 |  |
| 19 | Plan one small future support | Expand | Mental | L4 | High | 0 | 0 | 1 | **Retire** | Three-word description, high effort, pure planning |  |
| 20 | Do something creative for 10 minutes | Expand | Identity | L3 | Medium | 0 | 0 | 0 | **Keep** | One action, fits Level 3, no qualifying |  |
| 21 | Record a voice memo to yourself | Anchor | Identity | L2 | Low | 0 | 0 | 0 | **Retire** | Near-duplicate of #74; shouty ALL CAPS, multi-prompt |  |
| 22 | Pause and savor this moment | Anchor | Emotional | L1 | Low | 0 | 0 | 2 | **Rewrite** | Three questions stacked into one 30-second window | Thirty seconds. What is good right now? |
| 23 | Identify what made today lighter | Anchor | Mental | L2 | Low | 0 | 0 | 0 | **Keep** | (unreviewed) |  |
| 24 | Plan one thing just for you | Anchor | Identity | L3 | Medium | 0 | 0 | 0 | **Rewrite** | Four questions then schedule, show up, remind yourself | One thing that is only yours. Put it in the calendar. |
| 25 | Express gratitude out loud | Anchor | Emotional | L2 | Low | 0 | 0 | 1 | **Rewrite** | Title says out loud, description says write it down | Three real ones. Say them out loud. |
| 26 | Ask for help with one task | Stabilize | Relational | L3 | Medium | 0 | 0 | 0 | **Keep** | The only rec that moves work off her |  |
| 27 | Put phone away for 10 minutes | Stabilize | Sensory | L2 | Low | 0 | 2 | 3 | **Rewrite** | Ten minutes tagged Level 2; re-tag Level 3 | (wording fine — change capacity_level to Level 3) |
| 28 | Stand in sunlight briefly | Maintain | Physical | L1 | Low | 3 | 8 | 21 | **Keep** | Best performer, 21 did-its; mild wording cost acceptable |  |
| 29 | Revisit a personal goal | Expand | Identity | L3 | Medium | 0 | 0 | 0 | **Rewrite** | Assumes she already wrote a goal down | The thing you want for you. Still there? |
| 30 | Write one compassionate sentence to yourself | Contain | Emotional | L2 | Low | 0 | 0 | 0 | **Keep** | One sentence, strong reframe, no assumption |  |
| 31 | Read a message from someone who loves you | Contain | Relational | L1 | Low | 2 | 5 | 2 | **Keep** | Low barrier, uses what she already has |  |
| 32 | Name one thing that is still yours | Contain | Identity | L1 | Low | 1 | 0 | 3 | **Keep** | One thing, 30 seconds, identity-anchored |  |
| 34 | Spend 3 minutes with something that made you you | Stabilize | Identity | L2 | Low | 1 | 11 | 4 | **Keep** | Most-saved rec in the set, eleven saves |  |
| 35 | Write: Right now I wish someone knew… | Stabilize | Emotional | L2 | Low | 1 | 7 | 5 | **Keep** | Sentence stem removes the blank-page barrier |  |
| 36 | Feel the ground hold you | Contain | Physical | L1 | Low | 0 | 0 | 1 | **Keep** | Physical, immediate, asks nothing of her |  |
| 37 | Close your eyes for 90 seconds | Contain | Physical | L1 | Low | 1 | 0 | 2 | **Keep** | Timer-bounded, explicitly permission not task |  |
| 38 | Let your body be horizontal | Stabilize | Physical | L2 | Low | 1 | 2 | 4 | **Rewrite** | Clinical ("signals to your nervous system that you are safe") | Lie flat for a few minutes. Not to sleep. Just flat. |
| 39 | Text someone: I am having a hard day | Contain | Relational | L1 | Low | 1 | 0 | 4 | **Keep** | One message, script supplied, no explanation owed |  |
| 41 | Write your three non-negotiables for tomorrow | Expand | Mental | L4 | Low | 0 | 6 | 7 | **Rewrite** | One-minute task tagged Level 4; re-tag Level 2 | (wording fine — change capacity_level to Level 2) |
| 43 | Get one thing out of your head and onto paper | Stabilize | Mental | L2 | Low | 0 | 6 | 6 | **Keep** | One action, medium-agnostic, six saves and six did-its |  |
| 44 | Close every tab you are not using right now | Stabilize | Mental | L2 | Low | 1 | 2 | 7 | **Keep** | Concrete, instant, nothing to plan |  |
| 45 | Shake out your hands and roll your neck | Stabilize | Physical | L2 | Low | 3 | 4 | 5 | **Keep** | Thirty seconds, five did-its, clear single action |  |
| 46 | Say out loud: "I only have to handle right now" | Contain | Mental | L1 | Low | 0 | 0 | 3 | **Keep** | A sentence to say; explicitly fine to not mean it |  |
| 48 | Send a quick 'thinking of you' to someone you've been meaning to reach | Maintain | Relational | L2 | Low | 0 | 0 | 0 | **Keep** | Thirty seconds, no catch-up required, low social cost |  |
| 49 | Share one real thing with someone safe today | Maintain | Relational | L2 | Low | 0 | 0 | 0 | **Keep** | Supplies the words, names the permission |  |
| 50 | Make something warm to drink and actually sit down with it | Maintain | Sensory | L2 | Low | 0 | 0 | 0 | **Rewrite** | Clinical close on an otherwise concrete action | Make it, then sit down with it. Only that. |
| 51 | Change one thing about your physical environment | Maintain | Sensory | L2 | Low | 0 | 0 | 0 | **Keep** | Options listed but one action, fits capacity |  |
| 52 | Check in: what emotion is actually here right now? | Maintain | Emotional | L2 | Low | 0 | 2 | 6 | **Keep** | Names the should-feel trap rather than lecturing |  |
| 53 | Take a 5-minute walk - no destination, no purpose | Maintain | Physical | L2 | Low | 0 | 4 | 1 | **Keep** | Explicitly purposeless; hallway counts |  |
| 54 | Do one thing slowly on purpose | Maintain | Physical | L2 | Low | 0 | 1 | 2 | **Rewrite** | Clinical ("signal to your nervous system you are not in danger") | Wash your hands slowly. Eat a few bites slowly. Slower than needed. |
| 56 | Let yourself feel good without qualifying it | Expand | Emotional | L3 | Low | 0 | 2 | 5 | **Keep** | Names the qualifying habit without instructing her |  |
| 57 | Put on music that's just for you - not the kids | Expand | Sensory | L3 | Low | 0 | 0 | 0 | **Keep** | Specific, identity-anchored, zero preparation |  |
| 58 | Do something that feels indulgent but is actually just normal | Expand | Sensory | L3 | Low | 0 | 0 | 0 | **Keep** | Reframes indulgence as maintenance; one action |  |
| 59 | Move your body in a way that feels celebratory | Anchor | Physical | L2 | Low | 0 | 0 | 1 | **Keep** | One movement, celebratory framing fits Anchor |  |
| 60 | Notice what your body feels like when things are okay | Anchor | Physical | L2 | Low | 0 | 0 | 1 | **Rewrite** | Four questions where one would do | Where do you usually hold tension? Is it there now? |
| 61 | Tell someone specifically what they've meant to you lately | Anchor | Relational | L3 | Medium | 0 | 0 | 0 | **Keep** | Specific, outward, fits Anchor capacity 3 |  |
| 62 | Make a plan with someone you love - not because anything is wrong | Anchor | Relational | L2 | Low | 0 | 0 | 0 | **Keep** | Reaching out while well — distinct from #24 |  |
| 63 | Create a small ritual that marks this as a good day | Anchor | Sensory | L2 | Low | 0 | 0 | 0 | **Keep** | Small sensory ritual, single action |  |
| 64 | Write a letter to yourself from six months ago | Maintain | Emotional | L4 | Medium | 0 | 3 | 0 | **Keep** | Three saves, no did-its yet; fits Level 4 |  |
| 65 | Do a full body stretch or a gentle 15-minute yoga flow | Maintain | Physical | L4 | Medium | 0 | 2 | 0 | **Rewrite** | Points at outside videos; drop the external reference | Move your body through its full range. Nothing rigorous. |
| 66 | Plan something to look forward to - and actually put it in the calendar | Expand | Identity | L4 | Low | 0 | 0 | 0 | **Keep** | Expand-phase planning, distinct from Anchor #24 |  |
| 67 | Spend 20 minutes on something you used to love but haven't done in a while | Expand | Identity | L4 | Medium | 0 | 0 | 0 | **Keep** | Twenty minutes fits Level 4; no finishing required |  |
| 68 | Have a real conversation - not a check-in, an actual one | Anchor | Relational | L4 | Medium | 0 | 0 | 0 | **Keep** | One conversation, names what makes it different |  |
| 69 | Write down your values and look at how your week reflected them | Anchor | Identity | L4 | Medium | 0 | 0 | 0 | **Rewrite** | Pick three words, review week, assess drift — three steps | Three words for who you want to be. Just write them. |
| 70 | Color something, no goal, no rules | Contain | Mental | L1 | Low | 0 | 0 | 0 | **Rewrite** | Long, and "overwhelmed mind" diagnoses her state | Colour something in. No goal, no rules. |
| 71 | Spend 5 minutes coloring | Stabilize | Mental | L2 | Low | 0 | 0 | 0 | **Keep** | Tight, single action, explicitly not art |  |
| 74 | Voice memo: name what feels heavy | Stabilize | Mental | L2 | Low | 0 | 0 | 4 | **Keep** | Voice stem supplied, privacy stated, one action |  |

## 2. Coverage after the audit

Keep + Rewrite rows only (57 active of 60).

### By regulation phase

| phase | active | floor 6 |
|---|---|---|
| Contain | 11 | ok |
| Stabilize | 13 | ok |
| Maintain | 14 | ok |
| Expand | 8 | ok |
| Anchor | 11 | ok |

### By capacity level

| capacity | active |
|---|---|
| Level 1 | 12 |
| Level 2 | 27 |
| Level 3 | 11 |
| Level 4 | 7 |

### Capacity 1 per phase

The mothers with the least time are the ones who most need something to exist.

| phase | active at Level 1 | floor 2 |
|---|---|---|
| Contain | 10 | ok |
| Stabilize | 0 | ⚠️ **below** |
| Maintain | 1 | ⚠️ **below** |
| Expand | 0 | ⚠️ **below** |
| Anchor | 1 | ⚠️ **below** |

### Full grid, active only

| phase | L1 | L2 | L3 | L4 | total |
|---|---|---|---|---|---|
| Contain | 10 | 1 | 0 | 0 | 11 |
| Stabilize | 0 | 11 | 2 | 0 | 13 |
| Maintain | 1 | 9 | 2 | 2 | 14 |
| Expand | 0 | 0 | 5 | 3 | 8 |
| Anchor | 1 | 6 | 2 | 2 | 11 |

## 3. Notes on how verdicts were applied

- **No true em dashes exist** in any of the 60. The set uses a spaced hyphen (` - `) throughout, so the em-dash rewrite trigger fired on nothing. Worth a separate pass if the hyphen style also bothers you.
- **No rec is a product, purchase, app or outside service**, so nothing was marked Move. The closest is #65, which points at "a hundred free videos" — handled as a Rewrite to drop the reference rather than a Move, since the action itself is a stretch.
- **Capacity mis-tags** (#27 at ten minutes on Level 2, #41 at one minute on Level 4) are marked Rewrite with a metadata fix rather than Retire. Retiring a working rec over a tagging error seemed wrong; say the word and they flip to Retire.
- **"Nervous system" language** was treated as clinical *tone* (Rewrite), not clinical *diagnosis* (Retire). Nothing in the set names a condition.
- **High effort in Contain or Stabilize**: none exist. The only High-effort rec is #19, in Expand, and it is retired for other reasons.
- **Suggested rewrites are drafts to be replaced, not copy.** They exist to show the shape of the fix.
