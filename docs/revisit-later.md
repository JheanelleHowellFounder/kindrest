# Revisit Later

Decisions deliberately parked. Each entry says what it is, why it was parked, and where the work already done lives, so picking it back up doesn't start from zero.

---

## Care kit "how" lines

**Parked:** 15 September 2026, by the founder. Not the right moment to review 60 lines of copy.

**What it is:** a short, plain instruction (8–13 words) for each of the 60 recommendations, meant to sit on the care kit card. The idea was to show the "how" up front and move the full description behind a "Why this helps" tap.

**Why it may not happen as designed:** the founder is concerned that shortening cards loses the substance ("the meat") of each recommendation, and would rather keep the fuller descriptions visible if the header above them is calmer. The care kit redesign is going ahead on that basis, **with descriptions intact**. The how lines become an optional layer to reconsider later, not a dependency.

**Work already done:** all 60 lines drafted in [`docs/care-kit-how-lines.md`](care-kit-how-lines.md). Not in Airtable, not read by the app.

**To pick back up:**
1. Founder reviews and edits the lines in that file.
2. Add a `how` long-text column to the Recommendations table in Airtable (the API token can't create columns).
3. Load the approved lines and decide whether cards show the how line, the description, or both.

### Content problems found in the existing recommendations

Found while drafting. Unchanged in Airtable. These are visible to mothers today, so they're worth fixing whether or not the how lines ever ship:

- **#21** "Record a voice memo to yourself": description has two typos, "and and" and "gelt" (should be "felt").
- **#64** "Write a letter to yourself from six months ago": title says a letter *from* your past self; the description is a letter *to* your past self.
- **#19** "Plan one small future support": description is three words ("Book something helpful."), too thin to guide anyone.
- **#25** "Express gratitude out loud": title says out loud, description says write it down.
- **Em dashes** in the descriptions of #35, #37, #41, #43, #44, #52, #70, #71, #74.
- **Emoji** at the end of #11 and #12.
