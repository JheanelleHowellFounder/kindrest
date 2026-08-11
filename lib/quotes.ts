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
  'You don’t have to have it all together today.',
  'Rest is not a reward. It’s a requirement.',
  'You are still in there, underneath all of it.',
  'Doing less today is not falling behind.',
  'You haven’t lost yourself. You’re just carrying a lot.',
  'The bar is lower than you think, and you’re already over it.',
  'Nothing about today has to be earned.',
  'You’re allowed to need what you need.',
  'Being tired is not a personal failing.',
  'Whatever you managed today counts.',
]

function dayIndex(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
}

export function getTodaysQuote(date: Date = new Date()): string {
  const i = ((dayIndex(date) % HOME_QUOTES.length) + HOME_QUOTES.length) % HOME_QUOTES.length
  return HOME_QUOTES[i]
}
