/**
 * The warm line she lands on under the greeting.
 *
 * This slot has two states: normally one of these quotes, but when someone in
 * her circle has left her a note, the note takes its place — they do the same
 * job, and the personal one does it better.
 *
 * One per day, same for everyone, so it changes but never feels random.
 */

export const HOME_QUOTES = [
  'Take your time. There’s no wrong way to arrive.',
  'You are allowed to want things for yourself.',
  'Let today be what it is.',
  'Being soft with yourself is a kind of strength.',
  'You deserve the same care you give.',
  'Some days you bloom. Some days you rest. Both are growing.',
  'There’s a version of you being made right now. Be patient with her.',
  'You can hold a lot and still set some of it down.',
  'Tending to yourself is tending to your home.',
  'You don’t have to pour from empty. You’re allowed to refill first.',
  'Becoming her takes time, and you’re allowed to take it.',
  'Peace can be small and still count.',
  'Every new season of you deserves a warm welcome.',
  'Soft is not weak. Soft is how new things grow.',
  'You’re allowed to be new at this, again and again.',
  'Nothing about you has to be finished today.',
  'Keep what nourishes you. Let the rest go quietly.',
  'You can love them fully and still belong to yourself.',
  'Your softest moments are not wasted ones.',
  'What you’re carrying matters. So does putting it down.',
  'The woman you’re becoming is worth the wait.',
]

function dayIndex(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
}

export function getTodaysQuote(date: Date = new Date()): string {
  const i = ((dayIndex(date) % HOME_QUOTES.length) + HOME_QUOTES.length) % HOME_QUOTES.length
  return HOME_QUOTES[i]
}
