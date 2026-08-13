/**
 * Recognising "the schema isn't there yet".
 *
 * There are two vocabularies in play and it's easy to check the wrong one.
 * Postgres raises 42P01 / 42703, but PostgREST usually answers first from its
 * own schema cache with PGRST205 / PGRST204 — so a handler that only checks the
 * Postgres codes looks like it degrades gracefully and doesn't.
 *
 * Verified against production: a missing table comes back as PGRST205.
 */

type PgError = { code?: string } | null | undefined

/** The table doesn't exist — usually a migration that hasn't been run. */
export function isMissingTable(error: PgError): boolean {
  return error?.code === '42P01' || error?.code === 'PGRST205'
}

/** The column doesn't exist — usually schema drift between envs. */
export function isMissingColumn(error: PgError): boolean {
  return error?.code === '42703' || error?.code === 'PGRST204'
}
