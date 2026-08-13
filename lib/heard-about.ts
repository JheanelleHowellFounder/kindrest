/**
 * "How did you hear about Kindrest?"
 *
 * Shared between the signup step that asks it and the growth table that groups
 * by it, so the two can't drift apart. Values are stored as written here.
 *
 * This is the only attribution that survives a word-of-mouth introduction —
 * a friend telling another mother over coffee carries no UTM and no referrer.
 */

export const HEARD_OPTIONS = [
  'A friend or family member',
  'Facebook group',
  'Instagram',
  'LinkedIn',
  'Threads',
  'Saw a flyer or QR code',
  'Spelman network',
  'Other',
] as const

export type HeardOption = typeof HEARD_OPTIONS[number]

export const HEARD_OTHER: HeardOption = 'Other'
