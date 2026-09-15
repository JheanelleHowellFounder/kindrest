# Care Kit Header: Every Variation

> **Status, 15 September 2026: superseded. Not what shipped.** This records the testing that led the founder to drop the
> AI-written header entirely. What shipped is a hand-written line from the Airtable table **Care Kit Lines** (a response to
> one heart-screen tap, otherwise a rotating line per mood). Kept for the evidence: today's AI header used em dashes in
> 10 of 10 runs, listed the suggestions in 6 of 10, and named the support circle inconsistently.


**15 September 2026.** Draft for review. Nothing here is built.

The header is everything above the recommendation cards after a check-in. This shows every state it can be in, today and proposed, using **real outputs from the live AI model** with the exact prompt the app uses, run against real recommendations and real check-in selections. The support circle in these tests is fictional (Maya, sister; Jordan, husband; Tasha, best friend).

**Decided so far:** descriptions stay visible on the cards. Two cards on hard days (Overwhelmed, Struggling), three otherwise. The header is what gets calmer.

---

## The states a header can be in

| State | When it shows | Today | Proposed |
|---|---|---|---|
| **1. Loading** | While the kit is being built | Spinner + "Building your care kit…" | Unchanged |
| **2. AI header** | Normal case | "Take a moment" + mood pill + time pill + 2-sentence AI message (55–70 words requested) | AI header *is* the headline: 2 short sentences, 30 words max. No pills. |
| **3. Fallback** | AI call fails or times out | One fixed message per mood | Rewritten fixed message per mood (below) |
| **4. No message at all** | Rare: nothing came back and no fallback matched | "Give yourself permission to pause." | Unchanged |
| **5. Support circle line** | A card involves reaching out to someone, and she has a circle | Name *may* appear inside the header paragraph | Name moves onto the card it belongs to |

The small "Your Care Kit" label above the header stays in both versions.

---

## 2. AI header, mood by mood

Each mood shows two runs, because the AI writes something slightly different every time.

### Overwhelmed · 2 minutes
*She tapped:* I can't think clearly · Running on empty · I feel alone in this
*Cards:* Close your eyes for 90 seconds · Text someone: I am having a hard day

**Today**, with a support circle (46 words):
> Your mind is so full right now that thinking straight feels impossible—that exhaustion is real, and you're carrying a lot alone. Pick one small thing from what's below: either ninety seconds of just breathing, or three words to Maya, Jordan, or Tasha that say you're struggling.

**Today**, no support circle (47 words):
> You're running on fumes and your brain feels like static—that's real, and you're still here. One of these next two things might help settle you back down: either giving yourself 90 seconds of nothing, or sending a quick text to someone you trust to say you're struggling.

**Proposed** (26 and 30 words):
> Your mind feels foggy and your tank is empty, and you're carrying this alone right now. That's a heavy load for two minutes, and it's real.

> Your mind feels foggy and your tank is completely empty, and you're carrying this weight alone right now. That's a heavy place to be, and it makes sense you're overwhelmed.

**Proposed, she tapped nothing on the feelings screens** (17 and 15 words):
> You're feeling overwhelmed right now. That's a lot to carry, and it makes sense you're reaching out.

> You're feeling overwhelmed right now. That's a lot to carry, especially when time is tight.

### Struggling · 5 minutes
*She tapped:* Anxious thoughts keep coming · Carrying a lot of tension · Feeling unseen or unheard
*Cards:* Lower the noise · Ask for help with one task

**Today**, with a support circle (38 words):
> You're carrying a lot right now—the anxious thoughts, the tension, feeling like nobody sees how hard you're working. I've got two things that might help settle your nervous system in the next five minutes, and they're genuinely small.

**Today**, no support circle (46 words):
> You're carrying a lot right now—anxious thoughts, tension, and the heaviness of feeling like no one sees you. In the next five minutes, we have two gentle ways to help your nervous system settle down and remind you that you don't have to hold this alone.

**Proposed** (30 and 33 words):
> You're carrying a lot right now, anxious thoughts swirling, tension weighing on you, and feeling like nobody really sees what you're holding. That's a heavy load to move through alone.

> Your mind won't settle, your body's holding tight, and it feels like nobody's really seeing what you're carrying right now. That's a heavy load to sit with, especially when you're running on empty.

⚠ The second one says "running on empty." She didn't tap that. See the guardrails below.

### Okay · 10 minutes
*She tapped:* Managing but stretched · A bit tired but managing · I feel a bit invisible today
*Cards:* Make something warm to drink and actually sit down with it · Share one real thing with someone safe today · Take a 5-minute walk

**Today**, with a support circle (52 words):
> You're doing the real work right now—holding it together while feeling a bit unseen takes actual effort. Any one of these three things could land right now: warming your hands around something hot, a short walk that goes nowhere, or telling Jordan or Tasha one true thing about how stretched you're feeling.

**Today**, no support circle (45 words):
> You're stretched thin and feeling a bit unseen today—that's real, and it matters. Pick whichever of these feels easiest right now: a warm drink you actually sit with, a five-minute walk with nowhere to be, or one honest sentence shared with someone who gets it.

**Proposed** (25 and 31 words):
> You're stretched thin, tired, and feeling a bit like you're disappearing into the day. That's a real thing, and it matters that you noticed it.

> You're stretched thin and feeling a bit invisible today, even though you're holding it together. That's a lot to carry, and it matters that you showed up here to check in.

⚠ The first one turns "a bit invisible" into "disappearing." That makes her feeling sound bigger than she said. See the guardrails below.

### Good · 10 minutes
*She tapped:* My mind feels fairly clear · Energy is decent · Feeling hopeful
*Cards:* Put on music that's just for you · Plan something to look forward to · Do something creative for 10 minutes

**Today**, with a support circle (52 words):
> You're in a really good space right now — clear-headed and hopeful feels like the right moment to tend to something for yourself. Any of these three could feel good: put on music that's just yours, plan something small to look forward to, or spend ten minutes making something creative, just because.

**Today**, no support circle (33 words):
> You've got clarity and hope right now—that's real, and it's worth holding onto. Any of these feel like they'd fit into your next 10 minutes, so pick whichever one calls to you most.

**Proposed** (23 and 20 words):
> Your mind's clear, you've got decent energy, and there's some hope in there too. That's a real good place to be right now.

> Your mind's clear, you've got decent energy, and there's hope in there. That's a solid place to be right now.

### Thriving · 15+ minutes
*She tapped:* I'm fully present · My body feels energized · Grateful and fully present
*Cards:* Make a plan with someone you love · Create a small ritual that marks this as a good day · Notice what your body feels like when things are okay

**Today**, with a support circle (36 words):
> You're in such a good place right now—energized, present, grateful. This is exactly the kind of moment worth anchoring into, so let me share a few gentle ways to mark it and let it sink deeper.

**Today**, no support circle (32 words):
> You're in a really good place right now — energized, present, grateful. This feeling is worth tending to, so here are a few gentle ways to anchor it before it slips away.

**Proposed** (23 and 19 words):
> You're feeling fully present with energy moving through your body, and that gratitude is lighting you up. That's real, and it's worth noticing.

> You're fully present, your body feels energized, and gratitude is flowing through you. That's the real deal right there.

---

## What today's header gets wrong

Across the 10 live runs of the current prompt:

| Problem | How often |
|---|---|
| **Em dash** (against the house copy rule) | 10 of 10 |
| **Lists the suggestions** even though the prompt says not to | 6 of 10 |
| **Speaks in first person** ("I've got two things", "let me share", "we have") | 3 of 10 |
| **Support circle named** when a card involves another person | **Inconsistent.** Named on Overwhelmed and Okay. Named nobody on Thriving, whose first card is "Make a plan with someone you love." |

---

## 3. Fallback messages, if the AI fails

**Today:**

| Mood | Message |
|---|---|
| Overwhelmed | You're carrying a lot right now, and that deserves acknowledgment. Here's something small you can do just for you. |
| Struggling | It makes sense that things feel heavy right now. These suggestions are gentle, start with just one. |
| Okay | You're holding it together, even when it's a stretch. Take a moment to give something back to yourself. |
| Good | You're in a good place today. A great time to build on that. Here's what might feel nourishing right now. |
| Thriving | You're showing up fully and it shows. Take a moment to anchor this feeling so you can return to it. |

**Proposed**, matching the new shape of reflection plus acknowledgment, without pointing at the kit:

| Mood | Message |
|---|---|
| Overwhelmed | You're carrying a lot right now. That deserves to be acknowledged. |
| Struggling | Things feel heavy right now. It makes sense that they do. |
| Okay | You're holding it together, even when it's a stretch. That counts. |
| Good | You're in a good place today. That's worth noticing. |
| Thriving | You're showing up fully today. Let yourself feel that. |

---

## 5. The support circle, proposed

**Today** the name can only appear inside the header paragraph, where it's easy to miss and it isn't attached to the card it's about. Whether it appears at all is up to the model.

**Proposed:** the app itself decides when a name is relevant (she has a circle **and** a card is a Connection card), and the model picks who. The line sits **on that card**, under the description.

Real outputs, 3 runs each:

| Mood | Connection card | Line on the card |
|---|---|---|
| Overwhelmed | Text someone: I am having a hard day | Jordan might be a good person for this. (3 of 3) |
| Struggling | Ask for help with one task | Jordan might be a good person for this. (3 of 3) |
| Okay | Share one real thing with someone safe today | Tasha might be a good person for this. (3 of 3) |
| Good | *(no Connection card)* | *(no line, correct)* |
| Thriving | Make a plan with someone you love | Jordan might be a good person for this. (3 of 3) |

With no support circle, no line appears and nothing is asked of the model. Across 15 no-circle runs, none broke.

**This is more personal than today, not less.** The name lands on the exact thing it's for, every time the card involves another person.

⚠ **The husband gets picked almost every time** (4 of 5). The model chooses by relationship label only, because the "best for" field on support people is empty for every real user. For a mother whose partner is part of what's heavy, that line could land wrong. See open question 2.

---

## Guardrails the build needs

Found in testing. None of these can be left to the prompt alone:

1. **Strip em dashes in code.** The model ignored "no em dashes" in about 1 of 5 headers (8 of 42 across all tests). Replace them after the response comes back.
2. **Cap the length in code.** 3 of 12 two-sentence headers came in at 31–33 words against a 30-word limit. Ask for 25, cut anything past 30.
3. **Don't let it add or amplify feelings.** It said "running on empty" when she didn't tap it, and turned "a bit invisible" into "disappearing into the day." For a mental health product that matters: reflect only what she said, at the intensity she said it.
4. **Keep safety untouched.** The crisis and gentle cards on reflections are independent of the header and don't change.

---

## Open questions for the founder

1. **Two short sentences, or one?** Two tested warmer; one reads like a readout of her taps ("Anxious thoughts, tension, and feeling unseen right now."). Recommendation: two, capped around 25 words.
2. **The support circle line: pick one person, or offer two?** One person is more specific, but defaults to the husband. Offering two ("Maya or Tasha might be good people for this") hedges that, but is **untested**. A longer-term fix is asking "who's best for what" in the profile, since that field already exists and nobody has filled it in.
3. **Okay with the pills going away?** The header already says her mood and time back to her in words.
