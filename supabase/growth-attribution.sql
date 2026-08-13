-- Growth attribution — where each mother came from.
--
-- RUN THESE AS TWO SEPARATE QUERIES. The Supabase SQL editor runs a block as a
-- single transaction, so if the backfill fails the columns roll back with it.
--
-- All nullable: every one of these is unknown for the people who signed up
-- before this existed, and for anyone arriving with no campaign tags.


-- ── QUERY 1 — the columns ────────────────────────────────────────────────────
-- Safe to re-run.

alter table user_profiles
  add column if not exists utm_source      text,
  add column if not exists utm_medium      text,
  add column if not exists utm_campaign    text,
  add column if not exists referrer        text,
  add column if not exists device_type     text,
  add column if not exists heard_about_us  text,
  add column if not exists first_seen_at   timestamptz,
  -- Not in the original spec, added deliberately. Activation is measured as
  -- "first check-in within 48h", and the only dated check-in evidence was
  -- recommendation_feedback — which is written when she *rates* a suggestion.
  -- Of 15 real users who have checked in, only 11 ever rated: a ratings-based
  -- definition misses a third of them. This records the check-in itself.
  add column if not exists first_checkin_at timestamptz;

create index if not exists user_profiles_utm_source_idx on user_profiles (utm_source);


-- ── QUERY 2 — backfill the first check-in ────────────────────────────────────
-- So the growth table has real history instead of an empty activation column.
--
-- NOTE THE ::text CAST. recommendation_feedback.user_id is a *text* column and
-- holds non-UUID values ('demo-user-001', 'sim-persona-1') left over from the
-- persona simulations. Comparing it to a uuid raises
--   42883: operator does not exist: uuid = text
-- Casting the uuid to text compares safely and lets the demo rows fall away on
-- their own, which is what we want — they aren't real mothers.
--
-- The five users who checked in but never rated can't be recovered; they'll be
-- recorded correctly from now on. Safe to re-run.

update user_profiles p
set first_checkin_at = f.first_at
from (
  select user_id, min(created_at) as first_at
  from recommendation_feedback
  group by user_id
) f
where p.user_id::text = f.user_id
  and p.first_checkin_at is null;
