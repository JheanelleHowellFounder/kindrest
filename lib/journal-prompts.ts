/**
 * Journal starters — a way in for a mother who opens the journal and finds a
 * blank box.
 *
 * Of the first 16 journal entries, 14 came from being prompted somewhere else
 * in the app and only 2 were free writes from this page. The blank box is not
 * the problem; having nothing to answer is.
 *
 * These are deliberately NOT the daily glimmers and NOT the check-in. The
 * check-in already asks her state three ways a day — how are you, your mind,
 * your body, your heart. Anything answerable with a mood belongs there, not
 * here. These ask about her story instead: what happened, who she is, what has
 * changed. Three of them (14, 15, 16 below) exist to show her she has moved,
 * which is the one thing a mother in month four cannot see from the inside.
 *
 * Nothing here produces guilt, a task, or a grievance. Earlier drafts asked
 * what she regretted saying yes to and what would make tomorrow easier; both
 * were cut for turning the journal into a complaint or a to-do list.
 */

export interface JournalPrompt {
  id: string
  text: string
  /** Relative likelihood of being shown. Everything is 1 except the thesis. */
  weight?: number
}

export const JOURNAL_PROMPTS: JournalPrompt[] = [
  { id: 'jp-say-out-loud',  text: 'What have you been wanting to say out loud but haven’t yet?' },
  { id: 'jp-changed-mind',  text: 'What’s something you’ve changed your mind about recently?' },
  { id: 'jp-on-your-mind',  text: 'Who’s been on your mind lately, and why?' },

  // The one question that is Kindrest's whole thesis asked out loud, so it
  // comes up about twice as often as the rest.
  { id: 'jp-rest-looks',    text: 'What does rest actually look like for you right now?', weight: 2 },

  { id: 'jp-more-room',     text: 'What’s a part of yourself you’d like to make more room for?' },
  { id: 'jp-curious',       text: 'What’s something you’re curious about these days?' },
  { id: 'jp-free-day',      text: 'What would you do with a whole free day that belonged only to you?' },
  { id: 'jp-decision',      text: 'What’s a decision you’re sitting with right now?' },
  { id: 'jp-understood',    text: 'What do you wish more people understood about you?' },
  { id: 'jp-used-to-love',  text: 'What’s something you used to love that you’d like to get back to?' },
  { id: 'jp-proud',         text: 'What’s something you’re proud of that you haven’t said out loud?' },

  // Low-effort ways in. Ten seconds to answer, and once she is typing she
  // keeps typing — that is their whole job.
  { id: 'jp-remember',      text: 'What happened today that you want to remember?' },
  { id: 'jp-laugh',         text: 'What’s the last thing that made you laugh out loud?' },

  // Evidence that she has moved.
  { id: 'jp-month-ago',     text: 'What were you worried about a month ago that isn’t true anymore?' },
  { id: 'jp-better-now',    text: 'What are you better at now than you were a year ago?' },
  { id: 'jp-stopped-sorry', text: 'What’s one thing you’ve stopped apologizing for?' },
]

/**
 * Every prompt, weighted-shuffled — she is shown the first and taps "Another"
 * to walk the rest. Shuffling the whole set rather than drawing one at a time
 * is what guarantees she never sees the same question twice in a row.
 *
 * Random rather than deterministic by date: unlike the daily glimmer, there is
 * no reason every mother should see the same starter, and reshuffling means a
 * blank box looks different the second time she opens it.
 */
export function shuffledPrompts(pool: JournalPrompt[] = JOURNAL_PROMPTS): JournalPrompt[] {
  const remaining = [...pool]
  const picked: JournalPrompt[] = []

  while (remaining.length > 0) {
    const total = remaining.reduce((sum, p) => sum + (p.weight ?? 1), 0)
    let target = Math.random() * total

    // Walk the weights until we cross the target. The last item is the
    // fallback, so floating-point drift can never leave us empty-handed.
    let index = remaining.length - 1
    for (let i = 0; i < remaining.length; i++) {
      target -= remaining[i].weight ?? 1
      if (target <= 0) { index = i; break }
    }

    picked.push(remaining[index])
    remaining.splice(index, 1)
  }

  return picked
}
