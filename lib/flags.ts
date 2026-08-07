/**
 * Feature flags.
 *
 * Each flag reads a NEXT_PUBLIC_ env var so it's available on both server and
 * client. Flags default to OFF — a feature only turns on when its var is
 * explicitly set to "true" (in .env.local for local preview, or in the Vercel
 * project settings when you decide to ship it).
 *
 * Glimmer (V0): the daily-glimmer home screen. Off in production until you
 * flip it on on purpose.
 */
export const FLAGS = {
  glimmer: process.env.NEXT_PUBLIC_FF_GLIMMER === 'true',
} as const
