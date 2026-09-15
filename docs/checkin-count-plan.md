# Plan: Counting Check-ins Correctly

**15 September 2026.**

> **Status: approved and built, pending migration and testing.** The founder chose: count **times** (not days); "I'm not sure → write it out" **counts** as a check-in; backfill **option C** (one per rating day, plus each mother's first check-in), labelled estimated in the admin report; and a **separate test account** for verification.
>
> Built in `supabase/checkins.sql` and `lib/checkins.ts`, with the care kit, journal, stats, hard-day nudge, admin report, check-in screen and audit all switched over. Not yet deployed.

## The rule

> **A check-in is one time she goes through the check-in process and reaches her care kit.**
> "Something else" changes what she's offered. It doesn't change the fact that she showed up, so it is **the same check-in.**

## What's wrong today

Kindrest has **no record of a check-in**. It infers them two different ways, and both are wrong, in opposite directions.

| Signal | How it's made | What's wrong with it |
|---|---|---|
| **A counter** (`user_preference_profile.total_checkins`) | +1 every time a care kit is built | **Overcounts.** Every "Something else" tap adds another. |
| **Days with a rating** (`recommendation_feedback`) | Any day she tapped Done or Save | **Undercounts.** A check-in where she didn't rate anything doesn't exist. Two check-ins on one day count as one. |

**Real users today** (17 real users, your two accounts excluded):

- The counter says **27** check-ins. The rating-days signal says **15**.
- **6 mothers checked in but never rated anything.** To the admin report, their History calendar and the hard-day nudge, they never checked in at all.
- For 10 users the counter is higher than rating-days. That's some mix of unrated check-ins and "Something else" taps. The data can't separate the two, which is the core problem.

---

## Every place the check-in count matters

| # | Where | What the person sees | Uses today | Effect |
|---|---|---|---|---|
| 1 | **History: "N days you showed up"** | "…N check-ins" in the breakdown | Days with a rating | Misses unrated check-ins |
| 2 | **History: calendar** | Which days are marked | Days with a rating | Unrated check-in days look empty |
| 3 | **History: trend sentence** ("your recent check-ins are trending…") | How active she's been | Days with a rating | Same |
| 4 | **Admin report: per-user check-ins** | "N check-ins · last seen" | Days with a rating | Undercounts; 6 real users show 0 |
| 5 | **Admin report: Retained (3+ check-ins)** | Retention rate | Days with a rating | Retention understated |
| 6 | **Admin report: Avg check-ins, total, this week, active users** | Headline metrics | Days with a rating | Understated |
| 7 | **Admin report: pilot orgs** (checked in, active this week) | What partners are told | Days with a rating | **Understated in partner reporting** |
| 8 | **Admin report: at-risk list** | "Checked in before, gone 14+ days" | Days with a rating | Misses mothers who checked in without rating |
| 9 | **Admin report: weekly cohorts** (activated, returned) | Growth metrics | `first_checkin_at` or first rating | Activation is right. "Returned" misses unrated check-ins. |
| 10 | **Hard-day nudge** (in the app) | Gentle offer after 3+ hard days in 14 | Heavy glimmers **+ hard-mood ratings** | **Misses an Overwhelmed check-in with no rating.** The mothers least able to tap anything are the ones it's for. |
| 11 | **Care kit: support-circle name rotation** | Which two names show | The counter | Rotates on "Something else" too (harmless) |
| 12 | **Analytics event `checkin_completed`** | Vercel funnel numbers | Fires on every care kit load | **Overcounts.** Fires again on each "Something else" |
| 13 | **`first_checkin_at`** (activation) | Admin cohorts | Stamped once on first care kit | ✅ Already correct |
| 14 | **PostHog `first_checkin_completed`** | Growth funnel | Once per device | ✅ Already correct |
| 15 | **Old home screen** ("new user" state, streak) | Not live; the Glimmer home replaced it | The counter | Only if the old home is ever switched back on |
| 16 | **`scripts/audit.mjs`** | Production audit | Checks the counter column exists | Needs to check the new table |

---

## The fix

### 1. Record each check-in once

A new table, **`checkins`**, with one row per check-in:

| Column | Why |
|---|---|
| `id` | Identifies the check-in, so a retry can say "same one" |
| `user_id` | Whose |
| `mood` | Needed by the hard-day nudge (#10) and cohorts |
| `time_available` | Useful context; costs nothing |
| `created_at` | When she showed up |

Row-level security is on: a mother can only read her own rows, same as every other table.

**Mood stays behind auth.** This is the database, not analytics. The privacy rule in `lib/analytics.ts` (no mood ever sent to analytics) is untouched.

### 2. Make "Something else" provably the same check-in

- **First care kit:** the server creates the `checkins` row and returns its `id`.
- **"Something else":** the app sends that `id` back. The server confirms it belongs to her and **does not create a row.**

The server makes the row, not the phone, so a check-in can't be faked or double-counted by a replayed request. If the `id` is missing or isn't hers, the server treats the request as a new check-in, so the count errs toward her having shown up and never breaks the page.

### 3. Point every consumer at the new table

| # | Change |
|---|---|
| 1–3 | History counts check-in **rows** and marks calendar days from check-ins (plus glimmers and journal, as now) |
| 4–9 | The admin report counts check-in rows for per-user totals, retention, averages, this week, pilot orgs, at-risk and "returned" |
| 10 | The hard-day nudge reads hard moods from `checkins`, so an Overwhelmed check-in counts whether or not she rated anything |
| 11 | Name rotation uses the check-in count |
| 12 | `checkin_completed` fires once per check-in, not on "Something else" |
| 15 | Old home screen reads the same count, for consistency |
| 16 | The audit checks the `checkins` table accepts a write, then removes its test row |

The `total_checkins` counter is kept, but only +1 when a new check-in row is created, so anything still reading it stays correct.

### 4. The past can't be recovered exactly

Before today, nothing recorded a check-in, so **older check-ins can't be counted precisely.** Options are under decision 3. Whatever you choose, the report should say where "approximate" ends and "exact" begins.

---

## How it gets built and verified

1. **Migration SQL** creates `checkins` and its security rules. Pasted in chat for you to run.
2. **Code** for items 1–16.
3. **Preview link.** Verify on a **test account, not your profile**:
   - One check-in plus three "Something else" taps → **1** row
   - Two check-ins → **2** rows
   - A check-in with no rating → shows in History and the calendar
   - Three Overwhelmed check-ins with no ratings → the hard-day nudge appears
4. **Admin report** compared before and after, so you see exactly which numbers moved and why.
5. **Audit**, deploy, and push only on your go.

---

## Decisions for you

**1. History: count times, or days?**
Today it says "N check-ins" but counts **days**, so two check-ins in one day show as 1. You described it as how many times she's gone through the process. Recommendation: **"check-ins" counts times.** The headline "N days you showed up" stays in days, since it's about days across glimmers, journal and check-ins.

**2. Does "I'm not sure → write it out" count as a check-in?**
That path starts the check-in but goes to the journal instead of a care kit. Recommendation: **yes.** She showed up to check in and chose to write. No real user has used it yet, so nothing past is affected.

**3. What to do about the past**

| Option | Result | Honest? |
|---|---|---|
| **A. Start counting on ship date** | Past check-ins show 0 in the new count | Exact, but erases real history |
| **B. Backfill one check-in per day with a rating** | 15 real check-ins | Undercounts; the 6 who never rated stay at 0 |
| **C. Backfill B, plus each user's `first_checkin_at` if that day has no rating** | Recovers the first check-in for mothers who never rated | Closest honest estimate |

Recommendation: **C**, with the report labeling anything before ship date as estimated.

**4. A test account**
Verifying this needs several check-ins, which would put test data back on your profile. Recommendation: **you create a dedicated test account** (for example, a `+test` email) and share nothing else. Account creation has to be you, not me.
